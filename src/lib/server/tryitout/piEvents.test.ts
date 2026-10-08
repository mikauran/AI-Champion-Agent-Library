import { describe, it, expect } from 'vitest'
import {
  createJsonlParser,
  createPiEventMapper,
  createCompletionTracker,
  type MappedJobEvent,
} from './piEvents'
import { PI_SUCCESS_STREAM } from './piFixtures'

function run(stream: string, chunkSize = 7) {
  const mapper = createPiEventMapper()
  const tracker = createCompletionTracker()
  const events: MappedJobEvent[] = []
  const parser = createJsonlParser((r) => {
    tracker.observe(r)
    const e = mapper.map(r)
    if (e) events.push(e)
  })
  const buf = Buffer.from(stream, 'utf8')
  for (let i = 0; i < buf.length; i += chunkSize) parser.push(buf.subarray(i, i + chunkSize))
  parser.end()
  return { events, tracker }
}

describe('pi success stream (tracer)', () => {
  it('maps a chunked success stream to the expected events and a succeeded verdict', () => {
    const { events, tracker } = run(PI_SUCCESS_STREAM)
    expect(events).toEqual([
      { type: 'info', summary: 'pi session started' },
      { type: 'tool_start', tool: 'read', summary: 'read input/task.txt' },
      { type: 'tool_end', tool: 'read', summary: 'read input/task.txt done' },
      { type: 'tool_start', tool: 'write', summary: 'write output/result.txt' },
      { type: 'tool_end', tool: 'write', summary: 'write output/result.txt done' },
      { type: 'info', summary: 'agent settled' },
    ])
    expect(JSON.stringify(events)).not.toContain('SECRET_CONTENT')
    expect(tracker.verdict({ exitCode: 0, timedOut: false, timeoutMs: 300000, stderrTail: '' })).toEqual({ ok: true })
    expect(tracker.lastAssistantText()).toBe('Done.')
  })
})
