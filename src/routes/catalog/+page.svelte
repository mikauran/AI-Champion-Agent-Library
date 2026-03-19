<script lang="ts">
  import { goto } from '$app/navigation'
  import AgentCard from '$lib/components/AgentCard.svelte'
  import FilterBar from '$lib/components/FilterBar.svelte'
  import Pagination from '$lib/components/Pagination.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // Client-side filter state — initialized from server-provided URL params
  let selectedCategory = $state(data.filters.category ?? '')
  let selectedLlm = $state(data.filters.llm ?? '')
  let selectedMaturity = $state(data.filters.maturity ?? '')

  // Client-side derived filter on already-loaded agents (no server round-trip)
  let filteredAgents = $derived.by(() => {
    return data.agents.filter(agent => {
      const categoryMatch = !selectedCategory || agent.category === selectedCategory
      const llmMatch = !selectedLlm || agent.llmName === selectedLlm
      const maturityMatch = !selectedMaturity || agent.maturityStatus === selectedMaturity
      return categoryMatch && llmMatch && maturityMatch
    })
  })

  function updateCategory(value: string) {
    selectedCategory = value
    syncUrl()
  }

  function updateLlm(value: string) {
    selectedLlm = value
    syncUrl()
  }

  function updateMaturity(value: string) {
    selectedMaturity = value
    syncUrl()
  }

  function clearFilters() {
    selectedCategory = ''
    selectedLlm = ''
    selectedMaturity = ''
    syncUrl()
  }

  function syncUrl() {
    const params = new URLSearchParams()
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedLlm) params.set('llm', selectedLlm)
    if (selectedMaturity) params.set('maturity', selectedMaturity)
    params.set('page', '1')
    goto(`?${params.toString()}`, { replaceState: true })
  }
</script>

<h1 class="text-3xl font-semibold text-gray-900 mb-6">Agent Catalog</h1>

<FilterBar
  categories={data.categories}
  llms={data.llms}
  maturityStatuses={data.maturityStatuses}
  {selectedCategory}
  {selectedLlm}
  {selectedMaturity}
  onCategoryChange={updateCategory}
  onLlmChange={updateLlm}
  onMaturityChange={updateMaturity}
  onClear={clearFilters}
/>

{#if filteredAgents.length === 0}
  <div class="text-center py-16">
    <h2 class="text-lg font-semibold text-gray-900 mb-2">No agents match your filters</h2>
    <p class="text-sm text-gray-600">Try removing a filter or browsing all categories.</p>
  </div>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each filteredAgents as agent (agent.slug)}
      <AgentCard {agent} />
    {/each}
  </div>

  <Pagination currentPage={data.page} totalPages={data.totalPages} />
{/if}
