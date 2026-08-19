<script lang="ts">
  import { submitJob, subscribeProgress, downloadArtifact } from '$lib/tryItOut'
  import type { JobEvent, JobStatus } from '$lib/tryItOut'

  interface Props {
    agentId?: string
  }
  let { agentId = 'demo-agent' }: Props = $props()

  let task = $state('')
  let file = $state<File | null>(null)
  let status = $state<JobStatus | 'idle'>('idle')
  let events = $state<JobEvent[]>([])
  let error = $state<string | null>(null)
  let jobId = $state<string | null>(null)

  let feedEl: HTMLDivElement | null = $state(null)
  let unsubscribe: (() => void) | null = null

  let inFlight = $derived(status === 'queued' || status === 'running')

  async function run() {
    unsubscribe?.()
    unsubscribe = null
    events = []
    error = null
    jobId = null
    status = 'queued'

    const result = await submitJob(agentId, task, file)
    jobId = result.jobId

    unsubscribe = subscribeProgress(result.jobId, (u) => {
      status = u.status
      events = u.events
      error = u.error
      if (u.status === 'succeeded' || u.status === 'failed') {
        unsubscribe?.() // stop timers as soon as the job is terminal (threat T2)
        unsubscribe = null
      }
    })
  }

  // Auto-scroll: keep the newest line visible (D-10). Reading events.length is what tracks it.
  $effect(() => {
    events.length
    if (feedEl) feedEl.scrollTop = feedEl.scrollHeight
  })

  // Destroy cleanup: never leave a mock timer running after unmount (D-12, threat T2).
  $effect(() => () => {
    unsubscribe?.()
    unsubscribe = null
  })
</script>

<aside class="rounded-xl border border-gray-200 bg-white p-6">
  <h2 class="font-semibold text-gray-900 mb-2">Try it out</h2>

  <label for="tryitout-task" class="block text-xs font-semibold text-gray-700 mb-1">Task</label>
  <textarea
    id="tryitout-task"
    rows="3"
    placeholder="Describe the task you want this agent to do…"
    class="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
    value={task}
    oninput={(e) => (task = e.currentTarget.value)}
  ></textarea>

  <label for="tryitout-file" class="mt-4 block text-xs font-semibold text-gray-700 mb-1">Attach a file (optional)</label>
  <input
    id="tryitout-file"
    type="file"
    class="block w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-600"
    onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
  />

  <button
    type="button"
    disabled={inFlight || task.trim() === ''}
    onclick={run}
    class="mt-4 inline-flex items-center gap-2 min-h-[44px] rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
  >
    {inFlight ? 'Running…' : 'Run'}
  </button>

  {#if status !== 'idle'}
    <p class="mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</p>
    <div
      bind:this={feedEl}
      class="max-h-64 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm text-gray-900"
    >
      {#each events as event}
        <p class="py-1 whitespace-pre-wrap break-words">
          <span class="text-xs font-semibold text-gray-500">{event.ts}</span> {event.summary}
        </p>
      {/each}
    </div>
  {/if}

  {#if status === 'succeeded' && jobId}
    <button
      type="button"
      onclick={() => downloadArtifact(jobId!)}
      class="mt-4 inline-flex items-center gap-2 min-h-[44px] rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      Download results
    </button>
  {/if}

  {#if status === 'failed'}
    <div class="mt-4 rounded border border-red-200 bg-red-50 p-4">
      <p class="text-xs font-semibold text-red-700">Job failed</p>
      <p class="mt-1 text-sm text-red-700">{error}</p>
      <p class="mt-1 text-sm text-red-700">Adjust your task and try again.</p>
    </div>
  {/if}
</aside>
