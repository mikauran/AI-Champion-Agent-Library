<script lang="ts">
  import { TAILORABLE_FIELDS } from '$lib/config/tailorable-fields.js'
</script>

<aside class="rounded-xl border border-gray-200 bg-white p-6">
  <h2 class="font-semibold text-gray-900 mb-2">Customization Options</h2>
  <p class="text-sm text-gray-600 mb-4">These fields can be tailored when you customize this agent.</p>
  <ul class="space-y-3">
    {#each TAILORABLE_FIELDS as field}
      <li class="flex items-start gap-3">
        <span class="shrink-0 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mt-0.5">Customizable</span>
        <div>
          <p class="text-sm font-medium text-gray-900">{field.label}</p>
          <p class="text-xs text-gray-500">{field.description}</p>
        </div>
      </li>
    {/each}
  </ul>
</aside>
