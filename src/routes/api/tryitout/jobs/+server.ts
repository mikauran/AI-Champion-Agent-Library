// src/routes/api/tryitout/jobs/+server.ts
// SvelteKit server route — POST /api/tryitout/jobs (SC-01/SC-02).
//
// Validates the multipart submission, writes an uploaded file's bytes (if
// any) to the job's fixed input path, then fires the real staged runner
// WITHOUT awaiting it — the HTTP response returns `queued` immediately, long
// before the model call completes (SC-01/SC-04 anti-pattern guard).

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { mkdir, writeFile } from 'node:fs/promises'
import { createJob, inputDir, inputFilePath } from '$lib/server/tryItOutJobs'
import { runJob } from '$lib/server/tryItOutRunner'
import { AgentIdSchema } from '$lib/server/tryItOutPrompts'

// Threat T4-3: hard cap enforced BEFORE createJob/mkdir/runJob — an
// unauthenticated public demo endpoint must not allow disk exhaustion or a
// runaway model bill via an oversized request.
const MAX_UPLOAD_BYTES = 200 * 1024

export const POST: RequestHandler = async ({ request }) => {
  const form = await request.formData()
  const agentId = form.get('agentId')
  const task = form.get('task')
  const rawFile = form.get('file')

  if (typeof agentId !== 'string' || agentId.length === 0) {
    error(400, 'agentId is required')
  }
  if (typeof task !== 'string' || task.length === 0) {
    error(400, 'task is required')
  }
  if (!AgentIdSchema.safeParse(agentId).success) {
    error(400, 'agentId is invalid')
  }

  // RESEARCH.md Pitfall 3: a browser's empty file-input submission arrives
  // as a zero-byte, empty-named File, not as a missing field — treat that
  // exactly like "no file uploaded" (fall back to task text in the runner).
  const file = rawFile instanceof File && rawFile.size > 0 && rawFile.name !== '' ? rawFile : null

  if ((file !== null && file.size > MAX_UPLOAD_BYTES) || task.length > MAX_UPLOAD_BYTES) {
    error(413, 'upload too large')
  }

  const job = createJob(agentId, task, file)
  // Captured immediately after creation — createJob always sets 'queued'.
  // `runJob`, invoked below, flips the store's status to 'running'
  // synchronously (before its first `await`), so `job.status` read AFTER
  // firing `runJob` would already read back 'running'. Reading it now
  // guarantees SC-01's literal `{ status: 'queued' }` contract.
  const initialStatus = job.status

  if (file) {
    // Write to the job's fixed server-chosen path ONLY — never a path
    // derived from `file.name` (threat T4-2). `file.name` is read only in
    // the empty-file check above; it is never joined into a filesystem path.
    await mkdir(inputDir(job.jobId), { recursive: true })
    await writeFile(inputFilePath(job.jobId), Buffer.from(await file.arrayBuffer()))
  }

  // Fire-and-forget: do NOT await — `runJob` records its own `failed`
  // status + error message into the job store on any failure. Awaiting it
  // here would collapse the `queued`/`running` staging SC-04 requires.
  runJob(job.jobId).catch(() => {})

  return json({ jobId: job.jobId, status: initialStatus })
}
