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
