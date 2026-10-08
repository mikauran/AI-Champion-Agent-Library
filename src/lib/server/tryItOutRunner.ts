// src/lib/server/tryItOutRunner.ts
// Server-only module — SvelteKit enforces that src/lib/server/ cannot be imported client-side.
//
// The fire-and-forget staged runner (D-11/D-12): read input -> call OpenAI
// -> write output. This is the entire "cheat" execution engine for the demo
// backend — no container, no `pi`, no worker process (SC-01). One real
// OpenAI call per job, staged events emitted as each real phase begins.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import OpenAI from 'openai'
import { env } from '$env/dynamic/private'
import {
  getJob,
  pushEvent,
  setStatus,
  inputFilePath,
  outputDir,
  outputFilePath,
} from './tryItOutJobs'
import { loadPromptFor, composePrompt } from './tryItOutPrompts'
import { MODEL, modelParams } from './tryItOutModel'
import { zipOutputDir } from './tryitout/artifact'
import { runJobInContainer } from './tryitout/piRunner'
import { getTryItOutService } from './tryitout/service'
import { TryItOutRuntimeError } from './tryitout/runtime'

// Constructed lazily and memoized — NOT at module top level, so importing
// this file without OPENAI_API_KEY set never throws (needed for tests and
// for SC-09: nothing reads the key at import time).
let client: OpenAI | undefined

function getClient(): OpenAI {
  if (!client) {
    const apiKey = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY
    client = new OpenAI({ apiKey })
  }
  return client
}

/**
 * Single entry point. Runs the job in the session's Pi container; only an
 * unreachable engine or a container start failure may fall back to the direct
 * model call (D-14). Cap hit ('busy') and every post-claim failure never do.
 * Never rejects.
 */
export async function runJob(jobId: string): Promise<void> {
  const job = getJob(jobId)
  if (!job) return // unknown jobId — nothing to run, nothing to mutate

  setStatus(jobId, 'running')

  try {
    await runJobInContainer(jobId)
  } catch (err) {
    const fallbackEnabled = getTryItOutService().config.fallbackEnabled
    if (
      err instanceof TryItOutRuntimeError &&
      (err.code === 'engine_unavailable' || err.code === 'container_start_failed') &&
      fallbackEnabled
    ) {
      console.warn('Try It Out fallback for job', jobId, err.message)
      pushEvent(jobId, 'container unavailable, falling back to direct model call')
      try {
        await runDirectLlmJob(jobId)
      } catch (e) {
        pushEvent(jobId, 'agent failed')
        setStatus(jobId, 'failed', e instanceof Error ? e.message : String(e))
      }
      return
    }
    pushEvent(jobId, 'agent failed')
    setStatus(jobId, 'failed', err instanceof Error ? err.message : String(err))
  }
}

/** The Phase 7 direct model call; reachable only from the runJob fallback. */
export async function runDirectLlmJob(jobId: string): Promise<void> {
  const job = getJob(jobId)
  if (!job) return

  setStatus(jobId, 'running')

  try {
    let inputText: string
    if (job.fileName !== null) {
      pushEvent(jobId, 'reading input…')
      inputText = await readFile(inputFilePath(jobId), 'utf-8')
    } else {
      // D-13/CONTEXT.md discretion: no file uploaded -> the task text
      // itself is the RFI content. The stage line must not claim a file
      // was read.
      pushEvent(jobId, 'using task text as input…')
      inputText = job.task
    }

    const { basePrompt, skill } = await loadPromptFor(job.agentId)

    // D-12: emitted immediately before issuing the request — not on a
    // timer, not after the call resolves.
    pushEvent(jobId, 'calling model…')
    const response = await getClient().responses.create({
      model: MODEL,
      ...modelParams(),
      input: composePrompt({ basePrompt, skill, inputText }),
    })

    const text = response.output_text
    if (!text) {
      throw new Error('model returned no output text')
    }

    pushEvent(jobId, 'writing output…')
    await mkdir(outputDir(jobId), { recursive: true })
    await writeFile(outputFilePath(jobId), text, 'utf-8')

    await zipOutputDir(jobId)

    pushEvent(jobId, 'agent settled (clean exit)')
    setStatus(jobId, 'succeeded')
  } catch (err) {
    // Real error strings only — never a fabricated container/CLI-style
    // failure message, since this backend never pretends to run one.
    pushEvent(jobId, 'agent failed')
    setStatus(jobId, 'failed', err instanceof Error ? err.message : String(err))
  }
}
