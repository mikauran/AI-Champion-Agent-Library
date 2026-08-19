// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import { tick } from 'svelte'
import { readFileSync } from 'node:fs'
import TryItOutPanel from './TryItOutPanel.svelte'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TryItOutPanel idle render', () => {
  it('renders a Task label, a placeholder textarea, and a disabled Run button; no Progress label yet', () => {
    const { container, getByText } = render(TryItOutPanel, { props: { agentId: 'demo' } })

    const label = getByText('Task')
    expect(label.tagName).toBe('LABEL')

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()
    expect(textarea.placeholder).toBe('Describe the task you want this agent to do…')

    const button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Run'
    ) as HTMLButtonElement
    expect(button).not.toBeUndefined()
    expect(button.disabled).toBe(true)

    expect(container.textContent).not.toMatch(/Progress/)
  })

  it('enables Run once the task is non-empty', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Run'
    ) as HTMLButtonElement

    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })
    expect(button.disabled).toBe(false)
  })
})

describe('TryItOutPanel success flow', () => {
  it('runs a job to succeeded through submitJob + subscribeProgress', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })

    const runButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Run'
    ) as HTMLButtonElement
    await fireEvent.click(runButton)

    await vi.advanceTimersByTimeAsync(400)
    await tick()

    const runningButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Running')
    ) as HTMLButtonElement
    expect(runningButton).not.toBeUndefined()
    expect(runningButton.disabled).toBe(true)
    expect(container.textContent).toMatch(/Progress/)

    await vi.advanceTimersByTimeAsync(1000)
    await tick()
    expect(container.textContent).toContain('read data/sample.csv')
    expect(container.textContent).toMatch(/\d{2}:\d{2}:\d{2}\s+read data\/sample\.csv/)

    await vi.advanceTimersByTimeAsync(3000)
    await tick()
    expect(container.textContent).toContain('read data/sample.csv')
    expect(container.textContent).toContain('read data/sample.csv (12 lines)')
    expect(container.textContent).toContain('count rows in data/sample.csv')
    expect(container.textContent).toContain('write output/result.txt')
    expect(container.textContent).toContain('agent settled (clean exit)')

    const finalButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Run'
    ) as HTMLButtonElement
    expect(finalButton).not.toBeUndefined()
    expect(finalButton.disabled).toBe(false)
  })

  it('works standalone with no props at all', async () => {
    const { container } = render(TryItOutPanel)
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })

    const runButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Run'
    ) as HTMLButtonElement
    await fireEvent.click(runButton)

    await vi.advanceTimersByTimeAsync(4400)
    await tick()

    expect(container.textContent).toContain('agent settled (clean exit)')
  })
})

describe('TryItOutPanel transport discipline', () => {
  it('imports only from $lib/tryItOut and contains no transport details or {@html}', () => {
    const src = readFileSync('src/lib/components/TryItOutPanel.svelte', 'utf8')
    expect(src).toMatch(/from '\$lib\/tryItOut'/)
    expect(src).not.toMatch(/fetch\s*\(/)
    expect(src).not.toMatch(/EventSource/)
    expect(src).not.toMatch(/XMLHttpRequest/)
    expect(src).not.toMatch(/https?:\/\//)
    expect(src).not.toMatch(/\{@html/)
  })
})

function getRunButton(container: HTMLElement): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Run'
  ) as HTMLButtonElement
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text
  ) as HTMLButtonElement | undefined
}

describe('TryItOutPanel fail path', () => {
  it('T2.6 shows the red Job failed block with the verbatim error and no Download button', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'please fail now' } })
    await fireEvent.click(getRunButton(container))

    await vi.advanceTimersByTimeAsync(4400)
    await tick()

    expect(container.textContent).toContain('Job failed')
    expect(container.textContent).toContain('pi exited non-zero: required input file missing')
    expect(container.textContent).toContain('Adjust your task and try again.')
    expect(container.querySelector('.bg-red-50')).not.toBeNull()
    expect(findButtonByText(container, 'Download results')).toBeUndefined()
    expect(container.textContent).toContain('read data/sample.csv (12 lines)')
    expect(container.textContent).toContain('agent failed (exit 1)')
  })
})

describe('TryItOutPanel download button visibility', () => {
  it('T2.7 success reveals a Download results button and no failed block', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })
    await fireEvent.click(getRunButton(container))

    await vi.advanceTimersByTimeAsync(4400)
    await tick()

    expect(findButtonByText(container, 'Download results')).not.toBeUndefined()
    expect(container.querySelector('.bg-red-50')).toBeNull()
  })

  it('T2.8 no Download button at idle or immediately after clicking Run', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    expect(findButtonByText(container, 'Download results')).toBeUndefined()

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })
    await fireEvent.click(getRunButton(container))

    expect(findButtonByText(container, 'Download results')).toBeUndefined()
  })
})

describe('TryItOutPanel download interaction', () => {
  it('T2.9 clicking Download triggers a real artifact and never leaks object URLs', async () => {
    let capturedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob
      return 'blob:mock'
    })
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })
    await fireEvent.click(getRunButton(container))
    await vi.advanceTimersByTimeAsync(4400)
    await tick()

    const downloadButton = findButtonByText(container, 'Download results') as HTMLButtonElement
    await fireEvent.click(downloadButton)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(capturedBlob).not.toBeNull()
    const text = await (capturedBlob as unknown as Blob).text()
    expect(text).toContain('summarize the csv')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledTimes(createObjectURL.mock.calls.length)

    await fireEvent.click(downloadButton)
    expect(revokeObjectURL).toHaveBeenCalledTimes(createObjectURL.mock.calls.length)

    clickSpy.mockRestore()
  })
})

describe('TryItOutPanel XSS-shape assertion', () => {
  it('T2.10 renders the error as text, never markup', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'please fail now' } })
    await fireEvent.click(getRunButton(container))
    await vi.advanceTimersByTimeAsync(4400)
    await tick()

    const failedBlock = container.querySelector('.bg-red-50')
    expect(failedBlock).not.toBeNull()
    expect(failedBlock!.querySelector('script')).toBeNull()
    expect(failedBlock!.textContent).toContain('pi exited non-zero: required input file missing')

    const src = readFileSync('src/lib/components/TryItOutPanel.svelte', 'utf8')
    expect(src).not.toMatch(/\{@html/)
  })
})

describe('TryItOutPanel re-run reset', () => {
  it('T2.11 clears the failed block and stale feed before the new job starts', async () => {
    const { container } = render(TryItOutPanel, { props: { agentId: 'demo' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    await fireEvent.input(textarea, { target: { value: 'please fail now' } })
    await fireEvent.click(getRunButton(container))
    await vi.advanceTimersByTimeAsync(4400)
    await tick()
    expect(container.querySelector('.bg-red-50')).not.toBeNull()

    await fireEvent.input(textarea, { target: { value: 'summarize the csv' } })
    await fireEvent.click(getRunButton(container))
    await tick()

    expect(container.querySelector('.bg-red-50')).toBeNull()
    expect(container.textContent).not.toContain('agent failed (exit 1)')

    await vi.advanceTimersByTimeAsync(4400)
    await tick()
    expect(findButtonByText(container, 'Download results')).not.toBeUndefined()
  })
})
