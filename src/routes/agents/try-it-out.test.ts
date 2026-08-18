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
})
