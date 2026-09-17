<script lang="ts">
  interface Props {
    agent: {
      slug: string
      title: string
      summary: string
      category: string | null
      maturityStatus: string
      tags: string[]
      tryItOutMode: string
      tryItOutUrl: string | null
    }
  }
  let { agent }: Props = $props()
</script>

<article class="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
  <div class="flex items-start justify-between gap-2 mb-2">
    <h3 class="font-semibold text-gray-900 text-lg leading-snug">{agent.title}</h3>
    {#if agent.maturityStatus === 'production'}
      <span class="shrink-0 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Production</span>
    {:else if agent.maturityStatus === 'beta'}
      <span class="shrink-0 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Beta</span>
    {:else}
      <span class="shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Experimental</span>
    {/if}
  </div>
  {#if agent.category}
    <p class="text-xs text-indigo-600 font-medium mb-2">{agent.category}</p>
  {/if}
  <p class="text-sm text-gray-600 line-clamp-3">{agent.summary}</p>
  {#if agent.tags.length > 0}
    <div class="flex flex-wrap gap-1 mt-3">
      {#each agent.tags.slice(0, 3) as tag}
        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
      {/each}
    </div>
  {/if}
  <div class="mt-auto flex items-center gap-4 pt-5">
    <a
      href="/agents/{agent.slug}"
      class="text-sm font-medium text-gray-700 hover:text-indigo-700 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-600"
      aria-label="{agent.title} — view agent details"
    >
      View details
    </a>
    {#if agent.tryItOutMode === 'runnable'}
      <a
        href="/agents/{agent.slug}?tryout=1#try-out"
        class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        aria-label="Try out {agent.title}"
      >
        Try out
      </a>
    {:else if agent.tryItOutMode === 'external' && agent.tryItOutUrl}
      <a
        href={agent.tryItOutUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        aria-label="Try out {agent.title}"
      >
        Try out
      </a>
    {/if}
  </div>
</article>
