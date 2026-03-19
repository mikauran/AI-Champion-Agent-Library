<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  interface Props {
    currentPage: number
    totalPages: number
  }
  let { currentPage, totalPages }: Props = $props()

  function navigate(p: number) {
    const params = new URLSearchParams($page.url.searchParams)
    params.set('page', String(p))
    goto(`?${params.toString()}`)
  }
</script>

{#if totalPages > 1}
  <nav class="flex items-center gap-2 justify-center mt-8" aria-label="Pagination">
    <button
      onclick={() => navigate(currentPage - 1)}
      disabled={currentPage <= 1}
      class="px-3 py-2 rounded border border-gray-200 text-sm min-h-[44px] disabled:opacity-40 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      Previous
    </button>
    <span class="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
    <button
      onclick={() => navigate(currentPage + 1)}
      disabled={currentPage >= totalPages}
      class="px-3 py-2 rounded border border-gray-200 text-sm min-h-[44px] disabled:opacity-40 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      Next
    </button>
  </nav>
{/if}
