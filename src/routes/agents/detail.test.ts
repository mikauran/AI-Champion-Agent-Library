import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'

// Mock the db module before importing the load function
vi.mock('$lib/server/db', () => {
  const mockGet = vi.fn()
  const mockWhere = vi.fn(() => ({ get: mockGet }))
  const mockFrom = vi.fn(() => ({ where: mockWhere }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))
  return {
    db: { select: mockSelect },
    agents: { slug: 'slug' },
  }
})

// Mock drizzle-orm eq
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

// Mock @sveltejs/kit error helper
vi.mock('@sveltejs/kit', () => ({
  error: vi.fn((status: number, message: string) => {
    const err = new Error(message) as Error & { status: number }
    err.status = status
    throw err
  }),
}))

describe('Agent detail load function', () => {
  let load: (args: { params: { slug: string } }) => Promise<unknown>
  let mockDb: { select: ReturnType<typeof vi.fn> }
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const dbModule = await import('$lib/server/db')
    mockDb = dbModule.db as typeof mockDb
    // Rebuild the mock chain fresh each test
    mockGet = vi.fn()
    const mockWhere = vi.fn(() => ({ get: mockGet }))
    const mockFrom = vi.fn(() => ({ where: mockWhere }))
    mockDb.select = vi.fn(() => ({ from: mockFrom }))

    // Re-import load after mocks are set
    const mod = await import('./[slug]/+page.server.js')
    load = mod.load as typeof load
  })

  it('returns agent data for valid slug', async () => {
    const fakeRow = {
      slug: 'test-agent',
      title: 'Test Agent',
      summary: 'Does things',
      systemPrompt: 'You are helpful',
      llmName: 'gpt-4o',
      llmTemperature: 0.7,
      llmMaxTokens: null,
      llmTopP: null,
      toolNames: '["search","calculator"]',
      requiresHumanApproval: false,
      category: 'Automation',
      githubUrl: 'https://github.com/example/test-agent',
      maturityStatus: 'beta',
      tags: '["automation","ai"]',
      specId: null,
      lastIngestedAt: '2026-01-01T00:00:00.000Z',
    }
    mockGet.mockReturnValue(fakeRow)

    const result = await load({ params: { slug: 'test-agent' } }) as { agent: Record<string, unknown> }
    expect(result.agent.slug).toBe('test-agent')
    expect(result.agent.title).toBe('Test Agent')
  })

  it('deserializes toolNames JSON string to array', async () => {
    const fakeRow = {
      slug: 'test-agent',
      title: 'Test Agent',
      summary: '',
      systemPrompt: 'prompt',
      llmName: 'gpt-4o',
      llmTemperature: null,
      llmMaxTokens: null,
      llmTopP: null,
      toolNames: '["search","calculator"]',
      requiresHumanApproval: false,
      category: null,
      githubUrl: null,
      maturityStatus: 'experimental',
      tags: '[]',
      specId: null,
      lastIngestedAt: '2026-01-01T00:00:00.000Z',
    }
    mockGet.mockReturnValue(fakeRow)

    const result = await load({ params: { slug: 'test-agent' } }) as { agent: { toolNames: unknown } }
    expect(Array.isArray(result.agent.toolNames)).toBe(true)
    expect(result.agent.toolNames).toEqual(['search', 'calculator'])
  })

  it('deserializes tags JSON string to array', async () => {
    const fakeRow = {
      slug: 'test-agent',
      title: 'Test Agent',
      summary: '',
      systemPrompt: 'prompt',
      llmName: 'gpt-4o',
      llmTemperature: null,
      llmMaxTokens: null,
      llmTopP: null,
      toolNames: '[]',
      requiresHumanApproval: false,
      category: null,
      githubUrl: null,
      maturityStatus: 'experimental',
      tags: '["nlp","automation"]',
      specId: null,
      lastIngestedAt: '2026-01-01T00:00:00.000Z',
    }
    mockGet.mockReturnValue(fakeRow)

    const result = await load({ params: { slug: 'test-agent' } }) as { agent: { tags: unknown } }
    expect(Array.isArray(result.agent.tags)).toBe(true)
    expect(result.agent.tags).toEqual(['nlp', 'automation'])
  })

  it('throws 404 for unknown slug', async () => {
    mockGet.mockReturnValue(undefined)

    await expect(load({ params: { slug: 'nonexistent' } })).rejects.toThrow()
    try {
      await load({ params: { slug: 'nonexistent' } })
    } catch (err) {
      expect((err as { status: number }).status).toBe(404)
    }
  })
})
