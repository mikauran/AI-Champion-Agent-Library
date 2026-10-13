// E3: edge cases of scripts/set-try-it-out-mode.ts not covered by set-try-it-out-mode.test.ts.
import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTryItOutMode } from './set-try-it-out-mode.js'

const dirs: string[] = []
function tmpDb(): string {
  const d = mkdtempSync(join(tmpdir(), 'mode-gaps-'))
  dirs.push(d)
  return join(d, 'c.db')
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

function seed(path: string, rows: Array<{ slug: string; mode?: string; url?: string; tpl?: string }>) {
  const db = new Database(path)
  db.exec(`CREATE TABLE agents (
    slug TEXT PRIMARY KEY,
    try_it_out_mode TEXT NOT NULL DEFAULT 'none',
    try_it_out_url TEXT,
    try_it_out_task_template TEXT,
    title TEXT NOT NULL DEFAULT 't')`)
  const ins = db.prepare('INSERT INTO agents (slug, try_it_out_mode, try_it_out_url, try_it_out_task_template) VALUES (?,?,?,?)')
  for (const r of rows) ins.run(r.slug, r.mode ?? 'none', r.url ?? null, r.tpl ?? null)
  db.close()
}

function read(path: string) {
  const db = new Database(path, { readonly: true })
  const rows = db.prepare('SELECT slug, try_it_out_mode m, try_it_out_url u, try_it_out_task_template t, title FROM agents ORDER BY slug').all()
  db.close()
  return rows as Array<{ slug: string; m: string; u: string | null; t: string | null; title: string }>
}

describe('setTryItOutMode edge cases', () => {
  it('sets ABSOLUTE values: stale url and task template on the targeted rows are cleared', () => {
    const p = tmpDb()
    seed(p, [
      { slug: 'demo-rfi-triage', mode: 'link', url: 'https://x', tpl: 'T' },
      { slug: 'hvac-load-calculator', mode: 'runnable', url: 'https://y', tpl: 'U' },
    ])
    setTryItOutMode(p)
    const rows = read(p)
    expect(rows.map((r) => [r.slug, r.m, r.u, r.t])).toEqual([
      ['demo-rfi-triage', 'runnable', null, null],
      ['hvac-load-calculator', 'none', null, null],
    ])
  })

  it('never touches rows other than the two targeted slugs', () => {
    const p = tmpDb()
    seed(p, [
      { slug: 'demo-rfi-triage' },
      { slug: 'hvac-load-calculator' },
      { slug: 'other-agent', mode: 'link', url: 'https://keep', tpl: 'keep' },
      { slug: 'demo-rfi-triage-2', mode: 'runnable' },
    ])
    setTryItOutMode(p)
    const other = read(p).filter((r) => r.slug === 'other-agent' || r.slug === 'demo-rfi-triage-2')
    expect(other.map((r) => [r.slug, r.m, r.u, r.t])).toEqual([
      ['demo-rfi-triage-2', 'runnable', null, null],
      ['other-agent', 'link', 'https://keep', 'keep'],
    ])
  })

  it('returns results in the declared order with one changed row each', () => {
    const p = tmpDb()
    seed(p, [{ slug: 'hvac-load-calculator' }, { slug: 'demo-rfi-triage' }])
    expect(setTryItOutMode(p)).toEqual([
      { slug: 'demo-rfi-triage', mode: 'runnable', changes: 1 },
      { slug: 'hvac-load-calculator', mode: 'none', changes: 1 },
    ])
  })

  it('an already-correct row still counts as one change (SQLite counts matched rows)', () => {
    const p = tmpDb()
    seed(p, [{ slug: 'demo-rfi-triage', mode: 'runnable' }, { slug: 'hvac-load-calculator', mode: 'none' }])
    expect(setTryItOutMode(p).map((r) => r.changes)).toEqual([1, 1])
  })

  it('a missing hvac row throws naming that slug', () => {
    const p = tmpDb()
    seed(p, [{ slug: 'demo-rfi-triage' }])
    expect(() => setTryItOutMode(p)).toThrow(/no row matched slug 'hvac-load-calculator'.*ingest/)
  })

  it('OBSERVATION: the update is not transactional, so a missing second slug leaves the first row already updated', () => {
    const p = tmpDb()
    seed(p, [{ slug: 'demo-rfi-triage', mode: 'link', url: 'https://x' }])
    expect(() => setTryItOutMode(p)).toThrow()
    const row = read(p)[0]
    expect(row.m).toBe('runnable') // partial application; harmless because values are absolute and re-run converges
    expect(row.u).toBeNull()
  })

  it('a database without the agents table throws a SQLite error and closes the handle (file stays usable)', () => {
    const p = tmpDb()
    new Database(p).close()
    expect(() => setTryItOutMode(p)).toThrow(/no such table|agents/)
    const db = new Database(p)
    db.exec('CREATE TABLE z (a)')
    db.close()
  })

  it('a missing database file is created empty by SQLite, then fails on the missing table', () => {
    const p = tmpDb()
    expect(existsSync(p)).toBe(false)
    expect(() => setTryItOutMode(p)).toThrow(/no such table/)
  })

  it('a path in a non-existent directory throws instead of creating directories', () => {
    expect(() => setTryItOutMode(join(tmpdir(), 'definitely-not-here-xyz', 'c.db'))).toThrow()
  })

  it('a case-differing slug does not match (slugs are exact)', () => {
    const p = tmpDb()
    seed(p, [{ slug: 'Demo-RFI-Triage' }, { slug: 'hvac-load-calculator' }])
    expect(() => setTryItOutMode(p)).toThrow(/demo-rfi-triage/)
  })
})
