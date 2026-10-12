// Canonical kind contracts for multi-agent / multi-format hosting (Phase 13, flag AGENT_KINDS).
// Kind data is separate from AgentRecord so flag-off record output cannot change.
import type { AgentRecord } from './types.js'

export const AGENT_KIND_VALUES = [
  'agent',
  'system',
  'workflow',
  'skill',
  'mcp-server',
  'external-agent',
] as const
export type AgentKind = (typeof AGENT_KIND_VALUES)[number]

export type MemberRole = 'manager' | 'worker' | 'peer' | 'step' | 'participant'
const MEMBER_ROLES: readonly string[] = ['manager', 'worker', 'peer', 'step', 'participant']

export interface AgentMember {
  ref: string
  name: string
  role: MemberRole
  description: string | null
  slug: string | null
}

export interface KindInfo {
  kind: AgentKind
  framework: string | null
  topology: string | null
  members: AgentMember[]
  sourceFormat: string | null
  extras: Record<string, unknown>
}

export const DEFAULT_KIND_INFO: KindInfo = Object.freeze({
  kind: 'agent',
  framework: null,
  topology: null,
  members: Object.freeze([]) as unknown as AgentMember[],
  sourceFormat: null,
  extras: Object.freeze({}) as Record<string, unknown>,
}) as KindInfo

export function defaultKindInfo(): KindInfo {
  return { kind: 'agent', framework: null, topology: null, members: [], sourceFormat: null, extras: {} }
}

export interface SubmissionFile {
  path: string // relative, posix separators
  text: string
}
export interface DetectResult {
  format: string
  confidence: number // 0..1
}
export type SubmissionStatus = 'ingestible' | 'partial' | 'missing-from-author'
export interface ParseOutcome {
  status: SubmissionStatus
  format: string
  record: AgentRecord | null
  kindInfo: KindInfo | null
  missingFromAuthor: string[]
  unknownFields: string[]
  warnings: string[]
}
export interface FormatAdapter {
  id: string
  detect(files: SubmissionFile[]): DetectResult | null
  parse(files: SubmissionFile[], ctx: { now: string }): ParseOutcome
}

export const EXTRAS_MAX_BYTES = 16384
export const MEMBERS_MAX = 50

export function clampExtras(obj: Record<string, unknown>): Record<string, unknown> {
  try {
    const json = JSON.stringify(obj)
    const bytes = Buffer.byteLength(json, 'utf8')
    if (bytes <= EXTRAS_MAX_BYTES) return obj
    return { _truncated: true, _originalBytes: bytes }
  } catch {
    return { _truncated: true, _originalBytes: -1 }
  }
}

function parseJson(v: unknown): unknown {
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch {
    return undefined
  }
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

function toMember(m: unknown): AgentMember | null {
  if (typeof m !== 'object' || m === null) return null
  const o = m as Record<string, unknown>
  if (typeof o.ref !== 'string' || typeof o.name !== 'string') return null
  if (typeof o.role !== 'string' || !MEMBER_ROLES.includes(o.role)) return null
  return {
    ref: o.ref,
    name: o.name,
    role: o.role as MemberRole,
    description: strOrNull(o.description),
    slug: strOrNull(o.slug),
  }
}

export function parseKindInfoRow(row: {
  kind?: unknown
  framework?: unknown
  topology?: unknown
  members?: unknown
  sourceFormat?: unknown
  extras?: unknown
}): KindInfo {
  const out = defaultKindInfo()
  if (typeof row.kind === 'string' && (AGENT_KIND_VALUES as readonly string[]).includes(row.kind)) {
    out.kind = row.kind as AgentKind
  }
  out.framework = strOrNull(row.framework)
  out.topology = strOrNull(row.topology)
  out.sourceFormat = strOrNull(row.sourceFormat)
  const members = parseJson(row.members)
  if (Array.isArray(members)) {
    out.members = members.map(toMember).filter((m): m is AgentMember => m !== null).slice(0, MEMBERS_MAX)
  }
  const extras = parseJson(row.extras)
  if (typeof extras === 'object' && extras !== null && !Array.isArray(extras)) {
    out.extras = extras as Record<string, unknown>
  }
  return out
}
