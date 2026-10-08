import { beforeEach, describe, expect, it, vi } from 'vitest'

const authEnabled = vi.fn()
vi.mock('$lib/server/auth-config', () => ({ isAuthenticationEnabled: () => authEnabled() }))
vi.mock('$lib/server/auth', () => ({
  AUTH_COOKIE_NAME: 'aic_session',
  authCookieOptions: () => ({}),
  getAuthService: () => ({ getSession: () => null }),
}))

import { handle } from './hooks.server'

function makeEvent(path: string, method = 'POST') {
  return {
    url: new URL(`http://localhost${path}`),
    request: new Request(`http://localhost${path}`, { method }),
    cookies: { get: vi.fn(), set: vi.fn() },
    locals: {} as Record<string, unknown>,
    route: { id: path },
  }
}

async function run(path: string, method = 'POST') {
  const event = makeEvent(path, method)
  const resolve = vi.fn(async () => new Response('ok'))
  try {
    const res = await handle({ event, resolve } as unknown as Parameters<typeof handle>[0])
    return { res, resolve, event, thrown: null as null | { status: number; location: string } }
  } catch (e) {
    const err = e as { status: number; location: string }
    return { res: null, resolve, event, thrown: err }
  }
}

describe('hooks.server auth handling', () => {
  beforeEach(() => authEnabled.mockReset())

  it('lets /api/llm/ through without a session', async () => {
    authEnabled.mockReturnValue(true)
    const { res, resolve } = await run('/api/llm/v1/chat/completions')
    expect(resolve).toHaveBeenCalled()
    expect(res?.status).toBe(200)
  })

  it('still 401s other api paths', async () => {
    authEnabled.mockReturnValue(true)
    const { res, resolve } = await run('/api/tryitout/jobs')
    expect(res?.status).toBe(401)
    expect(await res?.json()).toEqual({ error: 'Authentication required' })
    expect(resolve).not.toHaveBeenCalled()
  })

  it('401s /api/llmx/foo', async () => {
    authEnabled.mockReturnValue(true)
    const { res } = await run('/api/llmx/foo')
    expect(res?.status).toBe(401)
  })

  it('redirects pages to login', async () => {
    authEnabled.mockReturnValue(true)
    const { thrown } = await run('/catalog', 'GET')
    expect(thrown?.status).toBe(303)
    expect(thrown?.location).toBe('/login?next=%2Fcatalog')
  })

  it('auth disabled resolves with user null', async () => {
    authEnabled.mockReturnValue(false)
    const { res, event, resolve } = await run('/api/tryitout/jobs')
    expect(resolve).toHaveBeenCalled()
    expect(res?.status).toBe(200)
    expect(event.locals.user).toBeNull()
  })
})
