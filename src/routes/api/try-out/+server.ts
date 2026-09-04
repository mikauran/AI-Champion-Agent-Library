import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, agents } from '$lib/server/db.js'
import { runTryOut } from '$lib/server/try-out.js'
import type { RequestHandler } from './$types'

const tryOutRequestSchema = z.object({
  agentSlug: z.string().trim().min(1).max(200),
  userPrompt: z.string().trim().min(1).max(20_000),
  customization: z.object({
    systemPrompt: z.string().trim().min(1).max(20_000),
    llmName: z.string().trim().min(1).max(200),
    temperature: z.number().min(0).max(2).nullable(),
    toolNames: z.array(z.string().trim().min(1).max(200)).max(50),
  }),
})

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ message: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = tryOutRequestSchema.safeParse(body)
  if (!parsed.success) {
    return json({ message: 'Try out fields are missing or invalid.' }, { status: 400 })
  }

  const row = db
    .select({ slug: agents.slug, title: agents.title })
    .from(agents)
    .where(eq(agents.slug, parsed.data.agentSlug))
    .get()

  if (!row) {
    return json({ message: 'Agent not found.' }, { status: 404 })
  }

  try {
    const session = await runTryOut(row, parsed.data)
    return json(session, { status: 201 })
  } catch (err) {
    console.error('Try out processing failed', err)
    return json({ message: 'The try out session could not be processed.' }, { status: 500 })
  }
}
