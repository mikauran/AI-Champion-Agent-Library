<script lang="ts">
  interface Props {
    categories: string[]
    llms: string[]
    maturityStatuses: string[]
    selectedCategory: string
    selectedLlm: string
    selectedMaturity: string
    onCategoryChange: (value: string) => void
    onLlmChange: (value: string) => void
    onMaturityChange: (value: string) => void
    onClear: () => void
  }
  let { categories, llms, maturityStatuses, selectedCategory, selectedLlm, selectedMaturity, onCategoryChange, onLlmChange, onMaturityChange, onClear }: Props = $props()

  let hasActiveFilters = $derived(selectedCategory !== '' || selectedLlm !== '' || selectedMaturity !== '')
</script>

<div class="flex flex-wrap items-end gap-4 mb-6">
  <div>
    <label for="filter-category" class="block text-xs font-medium text-gray-700 mb-1">Category</label>
    <select
      id="filter-category"
      class="min-h-[44px] rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
      value={selectedCategory}
      onchange={(e) => onCategoryChange(e.currentTarget.value)}
    >
      <option value="">All categories</option>
      {#each categories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="filter-llm" class="block text-xs font-medium text-gray-700 mb-1">Model</label>
    <select
      id="filter-llm"
      class="min-h-[44px] rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
      value={selectedLlm}
      onchange={(e) => onLlmChange(e.currentTarget.value)}
    >
      <option value="">All models</option>
      {#each llms as llm}
        <option value={llm}>{llm}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="filter-maturity" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
    <select
      id="filter-maturity"
      class="min-h-[44px] rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
      value={selectedMaturity}
      onchange={(e) => onMaturityChange(e.currentTarget.value)}
    >
      <option value="">All statuses</option>
      {#each maturityStatuses as status}
        <option value={status}>{status}</option>
      {/each}
    </select>
  </div>

  {#if hasActiveFilters}
    <button
      onclick={onClear}
      class="text-sm text-indigo-600 hover:underline min-h-[44px] px-2"
    >
      Clear filters
    </button>
  {/if}
</div>
