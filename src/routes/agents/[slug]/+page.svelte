<script lang="ts">
  import TechAccordion from '$lib/components/TechAccordion.svelte'
  import CustomizationPanel from '$lib/components/CustomizationPanel.svelte'
  import TryItOutPanel from '$lib/components/TryItOutPanel.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let { agent } = data
  let tryItOutOpen = $state(false)
</script>

<svelte:head>
  <title>{agent.title} — AIC Agent Library</title>
</svelte:head>

<div class="mb-4">
  <a href="/catalog" class="text-sm text-gray-500 hover:text-gray-700">
    &larr; Back to catalog
  </a>
</div>

<div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
  <!-- Left column: Executive summary + TechAccordion -->
  <div>
    <!-- Executive summary — visible by default (DETL-01) -->
    <section>
      <div class="flex items-start justify-between gap-3 mb-3">
        <h1 class="text-3xl font-semibold text-gray-900">{agent.title}</h1>
        {#if agent.maturityStatus === 'production'}
          <span class="shrink-0 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mt-1">Production</span>
        {:else if agent.maturityStatus === 'beta'}
          <span class="shrink-0 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full mt-1">Beta</span>
        {:else}
          <span class="shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mt-1">Experimental</span>
        {/if}
      </div>

      {#if agent.category}
        <p class="text-xs text-indigo-600 font-medium mb-3">{agent.category}</p>
      {/if}

      <p class="text-gray-600 mb-4">{agent.summary}</p>

      {#if agent.tags.length > 0}
        <div class="flex flex-wrap gap-1 mb-4">
          {#each agent.tags as tag}
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
          {/each}
        </div>
      {/if}

      <div class="flex flex-wrap items-center gap-4">
        {#if agent.githubUrl}
          <a
            href={agent.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            View on GitHub &rarr;
          </a>
        {/if}

        {#if agent.tryItOutMode === 'external' && agent.tryItOutUrl}
          <a
            href={agent.tryItOutUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            Try it out &rarr;
          </a>
        {/if}
      </div>

      {#if agent.tryItOutMode === 'runnable'}
        <div class="mt-6">
          <button
            type="button"
            onclick={() => (tryItOutOpen = !tryItOutOpen)}
            aria-expanded={tryItOutOpen}
            class="inline-flex items-center gap-2 rounded text-sm font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Try it out
            <span
              class="inline-block transition-transform"
              class:rotate-180={tryItOutOpen}
              aria-hidden="true">&darr;</span
            >
          </button>

          {#if tryItOutOpen}
            <div class="mt-4">
              <TryItOutPanel agentId={agent.slug} />
            </div>
          {/if}
        </div>
      {/if}
    </section>

    <!-- Collapsible technical spec — collapsed by default (DETL-02) -->
    <TechAccordion {agent} />
  </div>

  <!-- Right column: Customization panel (DETL-03) -->
  <div class="lg:sticky lg:top-8 self-start">
    <CustomizationPanel />
  </div>
</div>
