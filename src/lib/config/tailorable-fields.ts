// src/lib/config/tailorable-fields.ts
// Static list of agent fields that can be customized.
// Phase 4 will activate these; Phase 2 renders them as read-only labels.

export interface TailorableField {
  key: string
  label: string
  description: string
}

export const TAILORABLE_FIELDS: TailorableField[] = [
  {
    key: 'llm.name',
    label: 'Language Model',
    description: 'The LLM used by this agent (e.g., GPT-4o, Llama 3.1)',
  },
  {
    key: 'llm.temperature',
    label: 'Temperature',
    description: 'Controls randomness of LLM responses (0.0 = deterministic, 1.0 = creative)',
  },
  {
    key: 'systemPrompt',
    label: 'System Prompt',
    description: 'The instruction prompt that defines agent behavior',
  },
  {
    key: 'tools',
    label: 'Tools',
    description: 'The set of tools available to this agent',
  },
]
