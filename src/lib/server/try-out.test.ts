import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTryOutService } from './try-out.js'

describe('try-out service', () => {
  it('renders and stores a versioned placeholder session', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'aic-try-out-'))
    const templatePath = join(directory, 'template.txt')
    await writeFile(templatePath, '{{agentTitle}}\n{{systemPrompt}}\n{{userPrompt}}')
    const service = createTryOutService({ storagePath: directory, templatePath })

    const session = await service.run(
      { slug: 'test-agent', title: 'Test Agent' },
      {
        agentSlug: 'test-agent',
        userPrompt: 'Size this system',
        customization: {
          systemPrompt: 'Act as an engineer',
          llmName: 'test-model',
          temperature: 0.2,
          toolNames: ['calculator'],
        },
      },
    )

    expect(session.formatVersion).toBe(1)
    expect(session.processingMode).toBe('placeholder-serial')
    expect(session.renderedPrompt).toContain('Act as an engineer')
    expect(session.output.kind).toBe('placeholder')

    const storedPrompt = await readFile(join(directory, `prompt-${session.sessionId}.txt`), 'utf8')
    const storedSession = JSON.parse(
      await readFile(join(directory, `session-${session.sessionId}.json`), 'utf8'),
    )
    expect(storedPrompt).toBe(session.renderedPrompt)
    expect(storedSession.sessionId).toBe(session.sessionId)
  })
})
