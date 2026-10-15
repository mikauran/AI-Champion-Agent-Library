// Shared text-hygiene primitives and the filter for spec-derived descriptions (Phase 21).
// Text taken from a source document is untrusted and is published to the model that uses the generated
// server. cleanSpecText removes or replaces what must not reach a description: links, markup, template
// syntax, credential-shaped text, control characters and instruction-like phrases. The proposal gate
// (proposals/hygiene.ts) reuses the detection primitives below and keeps its stricter reject behaviour.
// Pure, linear, never throws, never returns the offending text.
import { INSTRUCTION_REMOVED, LINK_REMOVED, redactSecrets, sanitizeSourceText } from './redact.js'

/** Longest text the filter looks at; callers clip to far less. */
const MAX_INPUT = 8192

// Control characters except tab and newline, zero-width and bidi controls, the BOM (by code point,
// so this file holds no invisible characters).
function isControlCode(c: number): boolean {
  if (c <= 0x08 || (c >= 0x0b && c <= 0x1f) || (c >= 0x7f && c <= 0x9f)) return true
  return (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e) || (c >= 0x2060 && c <= 0x2064) || c === 0xfeff
}

export function hasControl(s: string): boolean {
  for (const ch of s) if (isControlCode(ch.codePointAt(0)!)) return true
  return false
}

/** Replace every control, zero-width and bidi character with a space. */
function stripControl(s: string): string {
  let out = ''
  for (const ch of s) out += isControlCode(ch.codePointAt(0)!) ? ' ' : ch
  return out
}

/** Detection patterns (test only; not global). */
export const URL_LIKE: RegExp[] = [
  /\b[a-z][a-z0-9+.-]{1,31}:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(?:com|org|net|io|dev|ai|app|edu|gov|example|local|internal|test)\b/i,
  /\]\(/,
  /\bmailto:/i,
]
export const MARKUP = /[<>`]|\$\{|\{\{|<%|%>/

// Replacement patterns: a whole whitespace-free word that carries a link.
const URL_WORD: RegExp[] = [
  /\S*\b[a-z][a-z0-9+.-]{1,31}:\/\/\S*/gi,
  /\S*\bwww\.\S*/gi,
  /\S*\bmailto:\S*/gi,
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|dev|ai|app|edu|gov|example|local|internal|test)\b\S*/gi,
]
const TEMPLATE_SPAN: RegExp[] = [/\$\{[^}]{0,200}\}/g, /\{\{[^}]{0,200}\}\}/g, /<%[^%]{0,200}%>/g]
const LEFTOVER_MARKUP = /[<>`]|\$\{|\{\{|\}\}|<%|%>/g
// Markdown link -> its label (before link removal, which would otherwise leave a dangling "](").
const MD_LINK = /\[([^\]]{0,80})\]\((?:[^()]|\([^()]{0,100}\)){0,200}\)/g
const REMOVAL_MARKERS = [LINK_REMOVED, INSTRUCTION_REMOVED]

export interface CleanSpecResult {
  text: string
  /** True when instruction-like (model-directed) text was found and dropped. */
  flagged: boolean
}

/** cleanSpecText plus whether model-directed phrases were dropped. */
export function cleanSpecTextFlagged(s: unknown, max = 200): CleanSpecResult {
  try {
    const raw = typeof s === 'string' ? s : s === undefined || s === null ? '' : String(s)
    // Redact secrets and links, drop model-directed phrases, flatten markdown links and tags.
    const r = sanitizeSourceText(stripControl(raw.slice(0, MAX_INPUT)).replace(MD_LINK, '$1'))
    let t = r.text
    for (const m of REMOVAL_MARKERS) t = t.split(m).join(' ')
    for (const re of URL_WORD) t = t.replace(re, ' ')
    for (const re of TEMPLATE_SPAN) t = t.replace(re, ' ')
    t = t.replace(LEFTOVER_MARKUP, ' ')
    t = redactSecrets(t).replace(/\s+/g, ' ').trim()
    // Tidy the gaps that removal leaves before punctuation.
    t = t.replace(/\s+([.,;:!?])/g, '$1')
    if (t.length > max) t = `${t.slice(0, Math.max(0, max - 3)).trimEnd()}...`
    return { text: t, flagged: r.flagged }
  } catch {
    return { text: '', flagged: false }
  }
}

/** Sanitise spec-derived description text. Returns '' when nothing safe remains (callers fall back to defaults). */
export function cleanSpecText(s: unknown, max = 200): string {
  return cleanSpecTextFlagged(s, max).text
}
