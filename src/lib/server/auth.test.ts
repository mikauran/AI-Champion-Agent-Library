import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { AuthError, AuthService } from './auth'

const tempDirs: string[] = []

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function service(options: { allowedEmails?: string[]; now?: () => number } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'aic-auth-'))
  tempDirs.push(directory)
  const sent: Array<{ email: string; code: string }> = []
  const auth = new AuthService({
    dbPath: join(directory, 'auth.db'),
    allowedEmails: options.allowedEmails ?? ['member@example.org'],
    sendCode: async (email, code) => {
      sent.push({ email, code })
    },
    now: options.now,
  })
  return { auth, sent }
}

describe('AuthService', () => {
  it('only sends a code to an exact whitelisted email address', async () => {
    const { auth, sent } = service()

    await expect(auth.requestLoginCode('outsider@example.org')).rejects.toMatchObject({
      code: 'not_allowed',
    })
    expect(sent).toHaveLength(0)

    const challenge = await auth.requestLoginCode(' Member@Example.org ')
    expect(challenge.email).toBe('member@example.org')
    expect(sent).toHaveLength(1)
    expect(sent[0].code).toMatch(/^\d{6}$/)
    auth.close()
  })

  it('accepts a valid code once and creates a server-side session', async () => {
    const { auth, sent } = service()
    const challenge = await auth.requestLoginCode('member@example.org')
    const session = auth.verifyLoginCode(challenge.challengeId, challenge.email, sent[0].code)

    expect(session.token.length).toBeGreaterThan(30)
    expect(auth.getSession(session.token)).toMatchObject({ email: 'member@example.org' })
    expect(() => auth.verifyLoginCode(challenge.challengeId, challenge.email, sent[0].code)).toThrow(AuthError)

    auth.deleteSession(session.token)
    expect(auth.getSession(session.token)).toBeNull()
    auth.close()
  })

  it('expires login codes after ten minutes', async () => {
    let now = 1_000_000
    const { auth, sent } = service({ now: () => now })
    const challenge = await auth.requestLoginCode('member@example.org')
    now += 10 * 60 * 1000 + 1

    expect(() => auth.verifyLoginCode(challenge.challengeId, challenge.email, sent[0].code)).toThrow(
      expect.objectContaining({ code: 'expired_code' }),
    )
    auth.close()
  })

  it('limits code requests per email address', async () => {
    const { auth } = service()
    await auth.requestLoginCode('member@example.org')
    await auth.requestLoginCode('member@example.org')
    await auth.requestLoginCode('member@example.org')

    await expect(auth.requestLoginCode('member@example.org')).rejects.toMatchObject({
      code: 'rate_limited',
    })
    auth.close()
  })
})
