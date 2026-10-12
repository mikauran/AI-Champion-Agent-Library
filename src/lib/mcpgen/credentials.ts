// Credential scanner (design doc section 7). Line based, no fs, no network.
// Findings carry the rule code, line number and kind ONLY: the matched text is never
// kept, so nothing downstream (gaps, logs, API responses) can echo it.
import type { Gap } from './types.js'

export interface CredentialFinding {
  code: 'credential-rejected'
  line: number
  kind: string
}

const MAX_FINDINGS = 20

/** Literal values that are placeholders, not secrets. */
function isPlaceholder(v: string): boolean {
  const s = v.trim().replace(/^["'`]+|["'`,;]+$/g, '')
  if (s === '') return true
  if (/^\$\{?[A-Za-z_]/.test(s)) return true // ${NAME} or $NAME
  if (/^<[^>]*>?$/.test(s) || /^\{\{.*\}\}?$/.test(s) || /^\[.*\]$/.test(s)) return true
  if (/^%[A-Za-z_]+%$/.test(s)) return true
  if (/^[A-Z][A-Z0-9_]*$/.test(s)) return true // an env var NAME such as NAME_API_KEY
  if (/^(x{3,}|\*{3,}|\.{3,}|-+|null|none|true|false)$/i.test(s)) return true
  return /your[_-]|changeme|change[_-]me|example|placeholder|redacted|dummy|<|>/i.test(s)
}

interface ValueRule {
  kind: string
  re: RegExp
  /** index of the capture group holding the value */
  group: number
  min: number
}

const KEY_NAMES = '(?:api[_-]?key|apikey|token|secret|password)'
const VALUE_RULES: ValueRule[] = [
  {
    kind: 'key-literal',
    re: new RegExp(`[A-Za-z0-9_-]*${KEY_NAMES}["']?\\s*[:=]\\s*["']?([^\\s"',;&}#]+)`, 'gi'),
    group: 1,
    min: 8,
  },
  {
    kind: 'authorization-header',
    re: /authorization["']?\s*[:=]\s*["']?(?:(?:bearer|basic|token)\s+)?([^\s"',;]+)/gi,
    group: 1,
    min: 8,
  },
  {
    kind: 'env-assignment',
    re: /^\s*(?:export\s+)?[A-Z][A-Z0-9_]*_KEY\s*=\s*["']?([^\s"']+)/g,
    group: 1,
    min: 8,
  },
  { kind: 'bearer-token', re: /\bbearer\s+([A-Za-z0-9._~+/=-]{20,})/gi, group: 1, min: 20 },
]

const PATTERN_RULES: Array<{ kind: string; re: RegExp }> = [
  { kind: 'sk-token', re: /sk-[A-Za-z0-9_-]{16,}/ },
  { kind: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/ },
  { kind: 'github-token', re: /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { kind: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
]

export function scanForCredentials(text: string): CredentialFinding[] {
  const findings: CredentialFinding[] = []
  if (typeof text !== 'string' || text === '') return findings
  const lines = text.split(/\r\n|\r|\n/)
  for (let i = 0; i < lines.length && findings.length < MAX_FINDINGS; i++) {
    const line = lines[i]
    const kinds = new Set<string>()
    for (const rule of PATTERN_RULES) {
      if (rule.re.test(line)) kinds.add(rule.kind)
    }
    for (const rule of VALUE_RULES) {
      rule.re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rule.re.exec(line)) !== null) {
        const value = m[rule.group] ?? ''
        if (value.length >= rule.min && !isPlaceholder(value)) {
          kinds.add(rule.kind)
          break
        }
        if (m[0] === '') rule.re.lastIndex++
      }
    }
    for (const kind of kinds) {
      if (findings.length < MAX_FINDINGS) {
        findings.push({ code: 'credential-rejected', line: i + 1, kind })
      }
    }
  }
  return findings
}

export function toGaps(findings: CredentialFinding[]): Gap[] {
  return findings.map((f) => ({
    code: 'credential-rejected',
    severity: 'error' as const,
    message: `Credential-like value (${f.kind}) on line ${f.line}. Remove it and use an env-var placeholder such as <NAME>_API_KEY; the value is not shown or stored.`,
    path: `line ${f.line}`,
  }))
}
