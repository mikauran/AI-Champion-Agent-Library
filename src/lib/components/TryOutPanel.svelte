<script lang="ts">
  import { isTryOutSessionFile, type TryOutSessionFile } from '$lib/try-out.js'

  interface Props {
    agent: {
      slug: string
      title: string
      systemPrompt: string
      llmName: string
      llmTemperature: number | null
      toolNames: string[]
    }
    initiallyOpen?: boolean
  }

  let { agent, initiallyOpen = false }: Props = $props()
  let isOpen = $state(initiallyOpen)
  let systemPrompt = $state(agent.systemPrompt)
  let userPrompt = $state('')
  let llmName = $state(agent.llmName)
  let temperature = $state(agent.llmTemperature?.toString() ?? '')
  let tools = $state(agent.toolNames.join(', '))
  let isSubmitting = $state(false)
  let message = $state('')
  let session = $state<TryOutSessionFile | null>(null)

  function parseTools(): string[] {
    return [...new Set(tools.split(',').map(tool => tool.trim()).filter(Boolean))]
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    isSubmitting = true
    message = ''
    session = null

    const parsedTemperature = temperature.trim() === '' ? null : Number(temperature)
    if (parsedTemperature !== null && (!Number.isFinite(parsedTemperature) || parsedTemperature < 0 || parsedTemperature > 2)) {
      message = 'Temperature must be between 0 and 2.'
      isSubmitting = false
      return
    }

    try {
      const response = await fetch('/api/try-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agentSlug: agent.slug,
          userPrompt,
          customization: {
            systemPrompt,
            llmName,
            temperature: parsedTemperature,
            toolNames: parseTools(),
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message ?? 'The try out session could not be processed.')
      }

      session = payload as TryOutSessionFile
      message = 'Session processed and saved.'
    } catch (err) {
      message = err instanceof Error ? err.message : 'The try out session could not be processed.'
    } finally {
      isSubmitting = false
    }
  }

  function downloadSession() {
    if (!session) return

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `agent-session-${session.sessionId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function restoreSession(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isTryOutSessionFile(parsed)) {
        throw new Error('The selected file is not a supported agent session.')
      }
      if (parsed.agent.slug !== agent.slug) {
        throw new Error(`This session belongs to ${parsed.agent.title}, not ${agent.title}.`)
      }

      systemPrompt = parsed.customization.systemPrompt
      userPrompt = parsed.input.userPrompt
      llmName = parsed.customization.llmName
      temperature = parsed.customization.temperature?.toString() ?? ''
      tools = parsed.customization.toolNames.join(', ')
      session = parsed
      message = 'Session restored from file.'
      isOpen = true
    } catch (err) {
      message = err instanceof Error ? err.message : 'The session could not be restored.'
    } finally {
      input.value = ''
    }
  }
</script>

<section id="try-out" class="mt-8 rounded-xl border border-indigo-200 bg-indigo-50/40 p-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-xl font-semibold text-gray-900">Try out this agent</h2>
      <p class="mt-1 text-sm text-gray-600">
        Customize a prompt and save a portable placeholder session. No agent container is started.
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
      aria-expanded={isOpen}
      aria-controls="try-out-form"
      onclick={() => isOpen = !isOpen}
    >
      {isOpen ? 'Close' : 'Try out'}
    </button>
  </div>

  {#if isOpen}
    <form id="try-out-form" class="mt-6 space-y-5" onsubmit={submit}>
      <div class="grid gap-5 md:grid-cols-2">
        <label class="block text-sm font-medium text-gray-800">
          Language model
          <input
            class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal focus:border-indigo-500 focus:ring-indigo-500"
            bind:value={llmName}
            maxlength="200"
            required
          />
        </label>
        <label class="block text-sm font-medium text-gray-800">
          Temperature
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal focus:border-indigo-500 focus:ring-indigo-500"
            bind:value={temperature}
            placeholder="Model default"
          />
        </label>
      </div>

      <label class="block text-sm font-medium text-gray-800">
        Tools <span class="font-normal text-gray-500">(comma-separated)</span>
        <input
          class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal focus:border-indigo-500 focus:ring-indigo-500"
          bind:value={tools}
        />
      </label>

      <label class="block text-sm font-medium text-gray-800">
        System prompt
        <textarea
          rows="7"
          class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm font-normal focus:border-indigo-500 focus:ring-indigo-500"
          bind:value={systemPrompt}
          maxlength="20000"
          required
        ></textarea>
      </label>

      <label class="block text-sm font-medium text-gray-800">
        Your input
        <textarea
          rows="4"
          class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal focus:border-indigo-500 focus:ring-indigo-500"
          bind:value={userPrompt}
          maxlength="20000"
          placeholder="Describe what you want the agent to process..."
          required
        ></textarea>
      </label>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Processing…' : 'Run placeholder'}
        </button>
        <label class="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Restore session
          <input type="file" accept="application/json,.json" class="sr-only" onchange={restoreSession} />
        </label>
        {#if message}
          <span class="text-sm text-gray-700" role="status">{message}</span>
        {/if}
      </div>
    </form>
  {/if}

  {#if session}
    <div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
      <p class="text-sm font-medium text-green-900">Session {session.sessionId}</p>
      <p class="mt-1 text-sm text-green-800">{session.output.content}</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
        onclick={downloadSession}
      >
        Download session JSON
      </button>
    </div>
  {/if}
</section>
