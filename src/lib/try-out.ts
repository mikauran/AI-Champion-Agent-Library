export interface TryOutCustomization {
  systemPrompt: string
  llmName: string
  temperature: number | null
  toolNames: string[]
}

export interface TryOutRequest {
  agentSlug: string
  userPrompt: string
  customization: TryOutCustomization
}

export interface TryOutSessionFile {
  formatVersion: 1
  sessionId: string
  agent: {
    slug: string
    title: string
  }
  customization: TryOutCustomization
  input: {
    userPrompt: string
  }
  renderedPrompt: string
  output: {
    kind: 'placeholder'
    content: string
  }
  processingMode: 'placeholder-serial'
  createdAt: string
  completedAt: string
}

export function isTryOutSessionFile(value: unknown): value is TryOutSessionFile {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<TryOutSessionFile>
  return candidate.formatVersion === 1
    && typeof candidate.sessionId === 'string'
    && typeof candidate.agent?.slug === 'string'
    && typeof candidate.customization?.systemPrompt === 'string'
    && typeof candidate.customization?.llmName === 'string'
    && Array.isArray(candidate.customization?.toolNames)
    && typeof candidate.input?.userPrompt === 'string'
    && typeof candidate.output?.content === 'string'
}
