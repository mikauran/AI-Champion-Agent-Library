// Redaction for report text. Pure and total. Core purity: no $lib, svelte or @sveltejs imports.

export const REDACT_CAP = 200
const MASK = '[redacted]'

/**
 * Masks the given secrets (for example the per-run canary), Bearer tokens and long key-like tokens,
 * then caps the length. Never returns more than `cap` characters.
 */
export function redact(text: string, extraSecrets: string[] = [], cap: number = REDACT_CAP): string {
  let out = typeof text === 'string' ? text : String(text)
  for (const s of extraSecrets) {
    if (typeof s === 'string' && s.length >= 4) out = out.split(s).join(MASK)
  }
  out = out.replace(/\bBearer\s+[^\s"',;]+/gi, `Bearer ${MASK}`)
  out = out.replace(/[A-Za-z0-9_-]{32,}/g, MASK)
  const limit = Math.max(4, cap)
  if (out.length > limit) out = out.slice(0, limit - 3) + '...'
  return out
}

/** Builds a redactor closure over fixed secrets. */
export function makeRedactor(secrets: string[], cap: number = REDACT_CAP): (s: string) => string {
  return (s: string) => redact(s, secrets, cap)
}
