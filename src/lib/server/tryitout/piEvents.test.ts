import { describe, it, expect } from 'vitest'
import {
  createJsonlParser,
  createPiEventMapper,
  createCompletionTracker,
  type MappedJobEvent,
} from './piEvents'
import { PI_SUCCESS_STREAM, PI_MODEL_ERROR_STREAM, PI_RETRY_FAILURE_STREAM } from './piFixtures'

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

const base = { timedOut: false, timeoutMs: 300000, stderrTail: '' }

describe('failure verdicts', () => {
  it('model error stream with exit 0 fails with the real errorMessage', () => {
    const { tracker } = run(PI_MODEL_ERROR_STREAM)
    expect(tracker.verdict({ ...base, exitCode: 0 })).toEqual({ ok: false, error: '401 invalid token' })
  })
  it('retry failure stream fails with finalError', () => {
    const { tracker } = run(PI_RETRY_FAILURE_STREAM)
    expect(tracker.verdict({ ...base, exitCode: 0 })).toEqual({ ok: false, error: 'rate limited after 3 attempts' })
  })
  it('nonzero exit uses stderr, or a generic message when empty', () => {
    const { tracker } = run(PI_SUCCESS_STREAM)
    const v = tracker.verdict({ ...base, exitCode: 1, stderrTail: 'boom' })
    expect(v.ok).toBe(false)
    expect(!v.ok && v.error).toContain('boom')
    expect(tracker.verdict({ ...base, exitCode: 1 })).toEqual({ ok: false, error: 'pi exited with code 1' })
  })
  it('limits stderr to the last 500 characters', () => {
    const { tracker } = run(PI_SUCCESS_STREAM)
    const v = tracker.verdict({ ...base, exitCode: 2, stderrTail: 'a'.repeat(600) + 'END' })
    expect(!v.ok && v.error.length).toBe(500)
    expect(!v.ok && v.error.endsWith('END')).toBe(true)
  })
  it('missing agent_settled fails', () => {
    const t = createCompletionTracker()
    expect(t.verdict({ ...base, exitCode: 0 })).toEqual({ ok: false, error: 'pi exited before the agent settled' })
  })
  it('timeout takes precedence', () => {
    const { tracker } = run(PI_MODEL_ERROR_STREAM)
    expect(tracker.verdict({ exitCode: 1, timedOut: true, timeoutMs: 300000, stderrTail: 'x' })).toEqual({
      ok: false,
      error: 'timeout after 300s',
    })
  })
  it('unknown exit status', () => {
    const { tracker } = run(PI_SUCCESS_STREAM)
    expect(tracker.verdict({ ...base, exitCode: null })).toEqual({ ok: false, error: 'pi exit status unknown' })
  })
})

describe('parser robustness', () => {
  function collect(chunks: Buffer[]) {
    const out: unknown[] = []
    const p = createJsonlParser((r) => out.push(r))
    for (const c of chunks) p.push(c)
    p.end()
    return out
  }
  it('parses CRLF lines', () => {
    expect(collect([Buffer.from('{"a":1}\r\n{"a":2}\r\n')])).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('does not split on U+2028 inside a string', () => {
    const out = collect([Buffer.from(JSON.stringify({ t: 'x\u2028y' }) + '\n')])
    expect(out).toEqual([{ t: 'x\u2028y' }])
  })
  it('skips garbage lines', () => {
    expect(collect([Buffer.from('{"a":1}\nnot json\n{"a":2}\n')])).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('delivers a final line without LF on end()', () => {
    expect(collect([Buffer.from('{"a":1}')])).toEqual([{ a: 1 }])
  })
  it('decodes a multibyte character split across chunks', () => {
    const b = Buffer.from('{"t":"é"}\n')
    const i = b.indexOf(0xc3) + 1
    expect(collect([b.subarray(0, i), b.subarray(i)])).toEqual([{ t: 'é' }])
  })
})

describe('mapper edge cases', () => {
  it('maps tool errors to the first result line', () => {
    const m = createPiEventMapper()
    m.map({ type: 'tool_execution_start', toolCallId: '1', toolName: 'read', args: { path: 'x' } })
    expect(
      m.map({
        type: 'tool_execution_end',
        toolCallId: '1',
        toolName: 'read',
        isError: true,
        result: { content: [{ type: 'text', text: 'ENOENT: no such file\nstack...' }] },
      }),
    ).toEqual({ type: 'tool_end', tool: 'read', summary: 'read failed: ENOENT: no such file' })
  })
  it('truncates long bash commands to 120 chars', () => {
    const m = createPiEventMapper()
    const e = m.map({ type: 'tool_execution_start', toolCallId: '1', toolName: 'bash', args: { command: 'a'.repeat(500) } })
    expect(e!.summary.length).toBeLessThanOrEqual(120)
  })
  it('returns null for non-object records', () => {
    const m = createPiEventMapper()
    expect(m.map(1)).toBeNull()
    expect(m.map(null)).toBeNull()
    expect(m.map([])).toBeNull()
  })
})
