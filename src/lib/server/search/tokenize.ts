// Server-only search tokenizer. Pure, no I/O.
// Lowercase, split on non-alphanumerics, drop stopwords and 1-char tokens.
// Hyphenated words ('ai-act') yield their parts ('ai', 'act') AND the joined form ('ai-act').

const STOPWORDS = new Set(['the', 'and', 'for', 'of', 'to', 'a', 'in', 'on', 'with'])

function keep(t: string): boolean {
  return t.length > 1 && !STOPWORDS.has(t)
}

export function tokenize(text: string): string[] {
  const out: string[] = []
  const chunks = text.toLowerCase().split(/[^a-z0-9-]+/)
  for (const raw of chunks) {
    const chunk = raw.replace(/^-+|-+$/g, '')
    if (!chunk) continue
    if (chunk.includes('-')) {
      const parts = chunk.split(/-+/).filter(Boolean)
      for (const p of parts) if (keep(p)) out.push(p)
      if (parts.length > 1) out.push(parts.join('-'))
    } else if (keep(chunk)) {
      out.push(chunk)
    }
  }
  return out
}
