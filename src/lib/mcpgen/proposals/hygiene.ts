// Text hygiene for proposal text (gate 3). Descriptions are published to the model that will use the
// server, so they get the same suspicion as source text plus rules for text an author wrote on purpose:
// no links, no markup, no credential-shaped strings, no instructions addressed to the model, no claim
// of write capability, no limit numbers that differ from the server's real limits.
// Pure, linear, never throws, never returns the offending text (only stable codes).
import { scanForCredentials } from '../credentials.js'
import { redactSecrets, sanitizeSourceText } from '../redact.js'

export type TextKind = 'description' | 'constant' | 'reason'

// Control characters except tab and newline, zero-width and bidi controls, the BOM (by code point,
// so this file holds no invisible characters).
function hasControl(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (c <= 0x08 || (c >= 0x0b && c <= 0x1f) || (c >= 0x7f && c <= 0x9f)) return true
    if ((c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e) || (c >= 0x2060 && c <= 0x2064) || c === 0xfeff) return true
  }
  return false
}
const URL_LIKE: RegExp[] = [
  /\b[a-z][a-z0-9+.-]{1,31}:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(?:com|org|net|io|dev|ai|app|edu|gov|example|local|internal|test)\b/i,
  /\]\(/,
  /\bmailto:/i,
]
const MARKUP = /[<>`]|\$\{|\{\{|<%|%>/
const INJECTION: RegExp[] = [
  /\b(?:ignore|disregard|forget|bypass|override)\b/i,
  /\b(?:always|never|must|should)\s+(?:call|use|invoke|run|execute|prefer|choose)\b/i,
  /\b(?:instead\s+of|rather\s+than)\s+(?:calling|using)\b/i,
  /\bdo\s+not\s+(?:tell|inform|mention|reveal|show|warn)\b/i,
  /\byou\s+(?:are|must|will|should|shall)\b/i,
  /\b(?:before|after)\s+(?:calling|using)\s+(?:any|every|all|other)\b/i,
  /\b(?:exfiltrat|send\s+(?:it|this|them|the\s+\w+)\s+to\b)/i,
  /(?:^|\s)(?:system|assistant|user|developer)\s*:/i,
  /\b(?:jailbreak|prompt\s+injection|new\s+instructions?)\b/i,
]
const CREDENTIAL_WORD = /\b(?:password|passwd|passphrase|secret|api[_ -]?key|bearer|credential|private[_ -]?key|access[_ -]?token)s?\b/i
const WRITE_CLAIM = /\b(?:creates?|updates?|deletes?|modif(?:y|ies)|inserts?|overwrites?|writes?|removes?|drops?|truncates?|mutates?)\b/i
const LIMIT_CLAIM = /\b(?:max(?:imum)?|at\s+most|up\s+to|limit(?:ed)?(?:\s+(?:of|to))?|clamp(?:ed)?(?:\s+(?:to|at))?)\s*(?:of\s+)?(\d[\d,]*)/gi

export interface TextOptions {
  kind: TextKind
  /** Numbers a limit claim may name (the server's real limits). */
  allowedNumbers?: Set<number>
}

/** Stable codes for everything wrong with the text; [] means clean. */
export function textCodes(text: string, opts: TextOptions): string[] {
  const out: string[] = []
  if (typeof text !== 'string' || text.trim() === '') return ['text-empty']
  if (hasControl(text)) out.push('text-control-chars')
  if (scanForCredentials(text).length > 0 || redactSecrets(text) !== text) out.push('text-credential')
  if (URL_LIKE.some((re) => re.test(text))) out.push('text-url')
  if (MARKUP.test(text)) out.push('text-markup')
  if (opts.kind === 'reason') return [...new Set(out)]
  if (opts.kind === 'description') {
    if (sanitizeSourceText(text).flagged || INJECTION.some((re) => re.test(text))) out.push('text-injection')
    if (CREDENTIAL_WORD.test(text)) out.push('text-credential-word')
    if (WRITE_CLAIM.test(text)) out.push('text-write-claim')
    if (opts.allowedNumbers) {
      for (const m of text.matchAll(LIMIT_CLAIM)) {
        const n = Number(m[1].replace(/,/g, ''))
        if (!opts.allowedNumbers.has(n)) {
          out.push('text-limit-claim')
          break
        }
      }
    }
  }
  return [...new Set(out)]
}

/** A short, safe rendering of a user-supplied identifier for a message (never a secret-looking value). */
export function show(s: unknown): string {
  if (typeof s !== 'string') return '(not text)'
  if (s.length > 48 || scanForCredentials(s).length > 0 || redactSecrets(s) !== s) return '[value]'
  return s.replace(/[^A-Za-z0-9_.\-[\]]/g, '?')
}
