// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/svelte'
import TryOutPanel from './TryOutPanel.svelte'

const agent = {
  slug: 'test-agent',
  title: 'Test Agent',
  systemPrompt: 'Act as an engineer.',
  llmName: 'test-model',
  llmTemperature: 0.2,
  toolNames: ['calculator'],
}

describe('TryOutPanel', () => {
  it('reveals fields populated from the agent', async () => {
    const { getByRole, getByLabelText } = render(TryOutPanel, { props: { agent } })

    await fireEvent.click(getByRole('button', { name: 'Try out' }))

    expect((getByLabelText('Language model') as HTMLInputElement).value).toBe('test-model')
    expect((getByLabelText('System prompt') as HTMLTextAreaElement).value).toBe('Act as an engineer.')
    expect((getByLabelText(/Tools/) as HTMLInputElement).value).toBe('calculator')
  })

  it('submits a placeholder session and exposes its download', async () => {
    const response = {
      formatVersion: 1,
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      agent: { slug: agent.slug, title: agent.title },
      customization: {
        systemPrompt: agent.systemPrompt,
        llmName: agent.llmName,
        temperature: agent.llmTemperature,
        toolNames: agent.toolNames,
      },
      input: { userPrompt: 'Calculate this' },
      renderedPrompt: 'rendered',
      output: { kind: 'placeholder', content: 'Stored.' },
      processingMode: 'placeholder-serial',
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(response),
    }))
    const { getByRole, getByLabelText } = render(TryOutPanel, {
      props: { agent, initiallyOpen: true },
    })
    await fireEvent.input(getByLabelText('Your input'), { target: { value: 'Calculate this' } })
    await fireEvent.click(getByRole('button', { name: 'Run placeholder' }))

    await waitFor(() => {
      expect(getByRole('button', { name: 'Download session JSON' })).toBeTruthy()
    })
    expect(fetch).toHaveBeenCalledWith('/api/try-out', expect.objectContaining({ method: 'POST' }))
    vi.unstubAllGlobals()
  })
})
