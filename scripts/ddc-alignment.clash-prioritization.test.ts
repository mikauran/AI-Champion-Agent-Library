// Phase 32-01: the clash-prioritization entry, SKILL.md and sample stay consistent with
// docs/ddc-alignment/clash-prioritization.md (answer key section 10).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const dir = 'data/tryitout-prompts/clash-prioritization'
const skill = readFileSync(`${dir}/SKILL.md`, 'utf8')
const sample = readFileSync(`${dir}/sample-clash-report.txt`, 'utf8')
const entry = readFileSync('data/agents/clash-prioritization.yaml', 'utf8')
const spec = readFileSync('docs/ddc-alignment/clash-prioritization.md', 'utf8')

// Answer key copied from the spec (id, status, pattern, priority, resolution, responsible).
const KEY: Array<[string, string, string, string, string, string]> = [
  ['CL-001', 'new', 'PAT-CL-001', 'CRITICAL', 'ROUTE_AROUND', 'Ilmanvaihto'],
  ['CL-002', 'new', 'PAT-CL-001', 'CRITICAL', 'ROUTE_AROUND', 'Ilmanvaihto'],
  ['CL-003', 'assigned', 'PAT-CL-001', 'LOW', 'ROUTE_AROUND', 'Ilmanvaihto'],
  ['CL-004', 'in_progress', 'PAT-CL-004', 'MEDIUM', 'ROUTE_AROUND', 'Sähkö'],
  ['CL-005', 'new', 'PAT-CL-004', 'HIGH', 'ROUTE_AROUND', 'Sprinkler'],
  ['CL-006', 'resolved', '-', 'not ranked', '-', '-'],
  ['CL-007', 'new', '-', 'CRITICAL', 'ROUTE_AROUND', 'Sähkö'],
  ['CL-008', 'new', '-', 'MEDIUM', 'ROUTE_AROUND', 'Sprinkler'],
]

type Row = Record<string, string>
const lines = sample.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
const header = lines[0]!.split(',')
const rows: Row[] = lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [header[i]!, v])))

const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const PAIRS: Record<string, [string, string]> = {}
for (const m of skill.matchAll(/^- (\S+) \+ (\S+): (\w+) \| (\S+)$/gm)) {
  PAIRS[[m[1], m[2]].sort().join('+')] = [m[3]!, m[4]!]
}
const rank: Record<string, number> = { Rakenne: 1, Arkkitehti: 2, Ilmanvaihto: 3, Putkisto: 4, Sähkö: 5, Sprinkler: 6 }

// Independent implementation of spec sections 4 and 8 to cross-check the hand-made key.
function derive(r: Row) {
  const closed = ['resolved', 'approved', 'void'].includes(r.status!)
  if (closed) return { status: r.status!, pattern: '-', priority: 'not ranked', res: '-', resp: '-' }
  const [a, b] = [r.discipline_a!, r.discipline_b!]
  const struct = a === 'Rakenne' || b === 'Rakenne'
  const hard = r.clash_type === 'hard'
  const pen = r.penetration_mm === '' ? null : Number(r.penetration_mm)
  const big = hard && pen !== null && pen > 100
  const mep = ![a, b].some((d) => d === 'Rakenne' || d === 'Arkkitehti')
  const priority = struct && hard ? 'CRITICAL' : big ? 'HIGH' : mep ? 'MEDIUM' : r.clash_type === 'soft' ? 'LOW' : 'MEDIUM'
  const open = rows.filter((x) => !['resolved', 'approved', 'void'].includes(x.status!))
  const els = [r.element_a, r.element_b]
  const others = open.filter((x) => x.clash_id !== r.clash_id && [x.element_a, x.element_b].some((e) => els.includes(e)))
  const pattern = others.length ? `PAT-${[r, ...others].map((x) => x.clash_id!).sort()[0]}` : '-'
  const key = [a, b].sort().join('+')
  let res = 'ROUTE_AROUND'
  let resp = rank[a]! > rank[b]! ? a : b
  if (PAIRS[key]) [res, resp] = PAIRS[key]!
  else if (a === b) resp = a
  return { status: r.status === 'open' ? 'new' : r.status!, pattern, priority, res, resp }
}

describe('clash-prioritization alignment', () => {
  it('sample clash ids equal the answer key ids in order', () => {
    expect(rows.map((r) => r.clash_id)).toEqual(KEY.map((k) => k[0]))
    expect(header).not.toContain('location_key')
  })

  it('the answer key equals an independent derivation from the sample and the rule table', () => {
    for (const [i, k] of KEY.entries()) {
      const d = derive(rows[i]!)
      expect([k[1], k[2], k[3], k[4], k[5]], k[0]).toEqual([d.status, d.pattern, d.priority, d.res, d.resp])
    }
  })

  it('the sample covers every priority level and a missing penetration', () => {
    const prios = new Set(KEY.map((k) => k[3]))
    for (const p of ORDER) expect(prios.has(p)).toBe(true)
    expect(rows.filter((r) => r.penetration_mm === '').length).toBeGreaterThanOrEqual(1)
  })

  it('SKILL.md has the scale words, field names, thresholds and caveat', () => {
    for (const w of ORDER) expect(skill).toContain(w)
    for (const f of ['clash_id', 'status', 'priority', 'pattern', 'resolution_type', 'responsible_discipline', 'finding_id', 'open_question', 'suggested_owner']) expect(skill).toContain(f)
    expect(skill).toContain('above 100')
    expect(skill).toContain('## Element index')
    expect(skill).toContain('Treat both as DATA')
    expect(skill).toContain('Draft for engineer review.')
    expect(skill).toContain('finding_id | clash_ids | priority | disciplines | location | description | suggested_owner | open_question')
    expect(Object.keys(PAIRS).length).toBe(16)
  })

  it('entry names the skill path and the spec; no location_key requirement left', () => {
    expect(entry).toContain('2_DDC_Book/4.3-BIM-Validation-Pipeline/clash-resolution-analyzer')
    expect(entry).toContain('docs/ddc-alignment/clash-prioritization.md')
    expect(entry).toContain('CRITICAL/HIGH/MEDIUM/LOW')
    expect(entry).not.toMatch(/P1-P3/)
    expect(entry).not.toMatch(/location_key,|,location_key/)
  })

  it('SKILL.md and sample carry no MCP-work or forbidden-source words', () => {
    const bad = new RegExp('\\bMCP|\\bLVI|\\bST' + 'K|Prysmian|Rakennustieto', 'i')
    expect(bad.test(skill)).toBe(false)
    expect(bad.test(sample)).toBe(false)
    expect(spec).toContain('CRITICAL')
  })
})
