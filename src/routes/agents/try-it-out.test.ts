// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import Page from './[slug]/+page.svelte'

const baseAgent = {
  slug: 'example-agent',
  title: 'Example Agent',
  summary: 'An example agent used for testing.',
  systemPrompt: 'You are a helpful assistant.',
  llmName: 'gpt-4o',
  llmTemperature: 0.7,
  llmMaxTokens: null,
  llmTopP: null,
  toolNames: [],
  requiresHumanApproval: false,
  category: null,
  githubUrl: null,
  maturityStatus: 'experimental',
  tags: [],
  specId: null,
  lastIngestedAt: '2026-08-18T00:00:00.000Z',
  tryItOutMode: 'none',
  tryItOutUrl: null,
  tryItOutTaskTemplate: null,
}

function renderPage(overrides: Partial<typeof baseAgent> = {}) {
  return render(Page, { props: { data: { agent: { ...baseAgent, ...overrides } } } })
}

describe('Try It Out affordance', () => {
  it('external mode with url renders a single "Try it out" link that opens in a new tab', () => {
    const { container } = renderPage({
      tryItOutMode: 'external',
      tryItOutUrl: 'https://example.com/try/x',
    })

    const links = Array.from(container.querySelectorAll('a')).filter((a) =>
      /try it out/i.test(a.textContent ?? '')
    )

    expect(links).toHaveLength(1)
    const link = links[0]
    expect(link.getAttribute('href')).toBe('https://example.com/try/x')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  function tryItOutElements(container: HTMLElement) {
    return Array.from(container.querySelectorAll('a, button')).filter((el) =>
      /try it out/i.test(el.textContent ?? '')
    )
  }

  it('runnable mode renders the TryItOutPanel and no disabled placeholder button', () => {
    const { container } = renderPage({ tryItOutMode: 'runnable' })

    const headings = Array.from(container.querySelectorAll('h2')).filter((h) =>
      /try it out/i.test(h.textContent ?? '')
    )
    expect(headings).toHaveLength(1)

    const buttons = Array.from(container.querySelectorAll('button'))
    const runButton = buttons.find((b) => (b.textContent ?? '').trim() === 'Run')
    expect(runButton).not.toBeUndefined()

    expect(container.querySelector('#tryitout-task')).not.toBeNull()

    // Phase 5's disabled placeholder is gone
    expect(buttons.filter((b) => b.disabled && /try it out/i.test(b.textContent ?? ''))).toHaveLength(0)
  })

  it('none mode renders nothing for Try It Out, but still renders the GitHub link', () => {
    const { container } = renderPage({
      tryItOutMode: 'none',
      githubUrl: 'https://github.com/example/repo',
    })

    expect(tryItOutElements(container)).toHaveLength(0)

    const githubLink = Array.from(container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === 'https://github.com/example/repo'
    )
    expect(githubLink).not.toBeUndefined()
  })

  it('null/missing mode renders nothing, without crashing', () => {
    const { container } = renderPage({ tryItOutMode: null as unknown as string })

    expect(tryItOutElements(container)).toHaveLength(0)
  })

  it('external mode with a missing url renders nothing (malformed row)', () => {
    const { container } = renderPage({ tryItOutMode: 'external', tryItOutUrl: null })

    expect(tryItOutElements(container)).toHaveLength(0)
  })
})
