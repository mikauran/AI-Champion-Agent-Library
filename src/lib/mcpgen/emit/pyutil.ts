// Small helpers for writing Python source text. Everything that reaches generated Python as a
// string goes through pyStr (exact literals) or cleanText (docstrings and messages).

/** A valid Python string literal for any JS string. */
export function pyStr(s: string): string {
  return JSON.stringify(s).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

/** Python literal for JSON-like data (null -> None, true -> True). Objects keep insertion order. */
export function pyLit(v: unknown, indent = 0): string {
  if (v === null || v === undefined) return 'None'
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'None'
  if (typeof v === 'string') return pyStr(v)
  const pad = '    '.repeat(indent + 1)
  const end = '    '.repeat(indent)
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]'
    const flat = `[${v.map((x) => pyLit(x, indent + 1)).join(', ')}]`
    if (flat.length <= 88 && !flat.includes('\n')) return flat
    return `[\n${v.map((x) => `${pad}${pyLit(x, indent + 1)},`).join('\n')}\n${end}]`
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return `{\n${entries
      .map(([k, x]) => `${pad}${pyStr(k)}: ${pyLit(x, indent + 1)},`)
      .join('\n')}\n${end}}`
  }
  return 'None'
}

/**
 * Text taken from the source model (descriptions, labels, summaries) is untrusted. This makes it
 * safe inside a triple-quoted docstring or a message literal: no control characters, no quotes,
 * no backslashes, no URLs and no token-looking strings, clipped to `max` characters.
 */
export function cleanText(s: unknown, max = 200): string {
  let t = typeof s === 'string' ? s : s === undefined || s === null ? '' : String(s)
  t = t
    .replace(/https?:\/\/\S+/gi, '[link removed]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '[removed]')
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
    .replace(/\\/g, '/')
    .replace(/["`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t
}

/** Flatten string and string[] parts into text with a trailing newline. */
export function joinLines(...parts: (string | string[] | null | undefined)[]): string {
  const out: string[] = []
  for (const p of parts) {
    if (p === null || p === undefined) continue
    if (Array.isArray(p)) out.push(...p)
    else out.push(p)
  }
  return out.join('\n') + '\n'
}
