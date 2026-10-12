// Security helpers for untrusted submissions (Phase 13). Pure functions; no fs, no network,
// nothing from author input is ever executed or imported.

const KEY_DENY = /(api[_-]?key|authorization|bearer|password|secret|token)/i
const SK_VALUE = /^sk-.{8,}/
const MAX_DEPTH = 20

function flagged(key: string | null, value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  if (key !== null && KEY_DENY.test(key)) return true
  return SK_VALUE.test(value)
}

/** JSON-paths of values that look like secrets (key denylist, or `sk-` prefixed strings). */
export function scanSecrets(value: unknown): string[] {
  const out: string[] = []
  const seen = new WeakSet<object>()
  const walk = (v: unknown, path: string, key: string | null, depth: number): void => {
    if (depth > MAX_DEPTH) return
    if (typeof v === 'string') {
      if (flagged(key, v)) out.push(path)
      return
    }
    if (typeof v !== 'object' || v === null) return
    if (seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${path}[${i}]`, key, depth + 1))
      return
    }
    for (const [k, item] of Object.entries(v as Record<string, unknown>)) {
      walk(item, path === '$' ? `$.${k}` : `${path}.${k}`, k, depth + 1)
    }
  }
  try {
    walk(value, '$', null, 0)
  } catch {
    /* never throw */
  }
  return out
}

/** Deep copy with flagged values replaced by "[redacted]"; deep or cyclic input is truncated. */
export function redactSecrets<T>(value: T): T {
  const seen = new WeakSet<object>()
  const walk = (v: unknown, key: string | null, depth: number): unknown => {
    if (typeof v === 'string') return flagged(key, v) ? '[redacted]' : v
    if (typeof v !== 'object' || v === null) return v
    if (depth >= MAX_DEPTH || seen.has(v)) return '[truncated]'
    seen.add(v)
    if (Array.isArray(v)) return v.map((item) => walk(item, key, depth + 1))
    const o: Record<string, unknown> = {}
    for (const [k, item] of Object.entries(v as Record<string, unknown>)) {
      if (k === '__proto__') continue
      o[k] = walk(item, k, depth + 1)
    }
    return o
  }
  try {
    return walk(value, null, 0) as T
  } catch {
    return '[truncated]' as unknown as T
  }
}

/** Truncate text to at most maxBytes of UTF-8 without splitting a character. */
export function capText(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const buf = Buffer.from(text, 'utf8')
  if (buf.length <= maxBytes) return { text, truncated: false }
  let end = Math.max(0, maxBytes)
  while (end > 0 && (buf[end]! & 0xc0) === 0x80) end--
  return { text: buf.subarray(0, end).toString('utf8'), truncated: true }
}
