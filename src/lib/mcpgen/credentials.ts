import type { Gap } from './types.js'

export interface CredentialFinding {
  code: 'credential-rejected'
  line: number
  kind: string
}

/** Placeholder; the real scanner lands in the next task. */
export function scanForCredentials(_text: string): CredentialFinding[] {
  return []
}

export function toGaps(findings: CredentialFinding[]): Gap[] {
  return findings.map((f) => ({
    code: 'credential-rejected',
    severity: 'error' as const,
    message: `Credential-like value (${f.kind}) on line ${f.line}. Remove it and use an env-var placeholder.`,
  }))
}
