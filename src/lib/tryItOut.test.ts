// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitJob, subscribeProgress, downloadArtifact } from './tryItOut'
import type { JobUpdate } from './tryItOut'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('submitJob', () => {
  it('resolves after ~400ms with a unique jobId and status queued', async () => {
    const p = submitJob('a', 't')
    await vi.advanceTimersByTimeAsync(400)
    const res = await p
    expect(res.status).toBe('queued')
    expect(typeof res.jobId).toBe('string')
    expect(res.jobId.length).toBeGreaterThan(0)

    const p2 = submitJob('a', 't')
    await vi.advanceTimersByTimeAsync(400)
    const res2 = await p2
    expect(res2.jobId).not.toBe(res.jobId)
  })
})

describe('subscribeProgress', () => {
  it('emits running synchronously with empty events and null error', async () => {
    const p = submitJob('a', 'summarize the csv')
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    const onUpdate = vi.fn()
    subscribeProgress(jobId, onUpdate)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith({ status: 'running', events: [], error: null })
  })

  it('delivers the success script and terminal succeeded at ~4s', async () => {
    const p = submitJob('a', 'summarize the csv')
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    const onUpdate = vi.fn()
    subscribeProgress(jobId, onUpdate)
    await vi.advanceTimersByTimeAsync(4000)

    const last = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as JobUpdate
    expect(last.status).toBe('succeeded')
    expect(last.error).toBeNull()
    expect(last.events.map((e) => e.summary)).toEqual([
      'read data/sample.csv',
      'read data/sample.csv (12 lines)',
      'count rows in data/sample.csv',
      'write output/result.txt',
      'agent settled (clean exit)',
    ])
  })

  it('every event has a HH:MM:SS ts and correct type/tool on the first two events, info on the last', async () => {
    const p = submitJob('a', 'summarize the csv')
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    const onUpdate = vi.fn()
    subscribeProgress(jobId, onUpdate)
    await vi.advanceTimersByTimeAsync(4000)

    const last = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as JobUpdate
    for (const e of last.events) {
      expect(e.ts).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    }
    expect(last.events[0].type).toBe('tool_start')
    expect(last.events[0].tool).toBe('read')
    expect(last.events[1].type).toBe('tool_end')
    expect(last.events[1].tool).toBe('read')
    expect(last.events[last.events.length - 1].type).toBe('info')
  })

  it('delivers events progressively — after 1400ms status is still running with 2 events', async () => {
    const p = submitJob('a', 'summarize the csv')
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    const onUpdate = vi.fn()
    subscribeProgress(jobId, onUpdate)
    await vi.advanceTimersByTimeAsync(1400)

    const last = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as JobUpdate
    expect(last.status).toBe('running')
    expect(last.events).toHaveLength(2)
  })

  describe('fail path — exact contract regex /(^|\\W)fail(\\W|$)/i', () => {
    const mustFail = ['fail', 'please fail now', 'FAIL', 'do not fail.', '(fail)']
    const mustSucceed = ['failure', 'failing', 'hardfailover', 'summarize the csv']

    it.each(mustFail)('task "%s" ends in failed with the contract error', async (task) => {
      const p = submitJob('a', task)
      await vi.advanceTimersByTimeAsync(400)
      const { jobId } = await p

      const onUpdate = vi.fn()
      subscribeProgress(jobId, onUpdate)
      await vi.advanceTimersByTimeAsync(4000)

      const last = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as JobUpdate
      expect(last.status).toBe('failed')
      expect(last.error).toBe('pi exited non-zero: required input file missing')
      expect(last.events.map((e) => e.summary)).toEqual([
        'read data/sample.csv',
        'read data/sample.csv (12 lines)',
        'agent failed (exit 1)',
      ])
    })

    it.each(mustSucceed)('task "%s" ends in succeeded', async (task) => {
      const p = submitJob('a', task)
      await vi.advanceTimersByTimeAsync(400)
      const { jobId } = await p

      const onUpdate = vi.fn()
      subscribeProgress(jobId, onUpdate)
      await vi.advanceTimersByTimeAsync(4000)

      const last = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as JobUpdate
      expect(last.status).toBe('succeeded')
    })
  })

  it('unsubscribe stops further updates and clears all pending timers', async () => {
    const p = submitJob('a', 'summarize the csv')
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    const onUpdate = vi.fn()
    const unsubscribe = subscribeProgress(jobId, onUpdate)
    await vi.advanceTimersByTimeAsync(700)

    const callCountBefore = onUpdate.mock.calls.length
    unsubscribe()
    expect(vi.getTimerCount()).toBe(0)

    await vi.advanceTimersByTimeAsync(5000)
    expect(onUpdate.mock.calls.length).toBe(callCountBefore)
    expect(onUpdate.mock.calls.some((c) => (c[0] as JobUpdate).status === 'succeeded' || (c[0] as JobUpdate).status === 'failed')).toBe(false)
  })
})

describe('downloadArtifact', () => {
  beforeEach(() => {
    // @ts-expect-error jsdom does not implement these
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    // @ts-expect-error jsdom does not implement these
    URL.revokeObjectURL = vi.fn()
  })

  it('triggers a browser download of a text blob containing the submitted task', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const p = submitJob('rfi-triage-assistant', 'summarize the csv', new File(['x'], 'sample.csv'))
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    await downloadArtifact(jobId)

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/plain')
    const text = await blob.text()
    expect(text).toContain('summarize the csv')
    expect(text).toContain('rfi-triage-assistant')
    expect(text).toContain('sample.csv')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(document.body.querySelector('a')).toBeNull()

    clickSpy.mockRestore()
  })

  it('sets a sanitized download filename matching aic-job-<id>.txt', async () => {
    let capturedDownload: string | null = null
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        capturedDownload = this.download
      })

    const p = submitJob('a', 'summarize the csv')
    await vi.advanceTimersByTimeAsync(400)
    const { jobId } = await p

    await downloadArtifact(jobId)

    expect(capturedDownload).toMatch(/^aic-job-[A-Za-z0-9._-]+\.txt$/)

    clickSpy.mockRestore()
  })

  it('rejects for an unknown jobId', async () => {
    await expect(downloadArtifact('nope')).rejects.toThrow('unknown job: nope')
  })
})

describe('unknown job handling', () => {
  it('subscribeProgress synchronously emits failed for an unknown job and returns a no-op unsubscribe', () => {
    const onUpdate = vi.fn()
    const unsubscribe = subscribeProgress('nope', onUpdate)

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith({ status: 'failed', events: [], error: 'unknown job: nope' })
    expect(() => unsubscribe()).not.toThrow()
  })
})
