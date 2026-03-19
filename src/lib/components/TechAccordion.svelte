<script lang="ts">
  interface Props {
    agent: {
      llmName: string
      llmTemperature: number | null
      llmMaxTokens: number | null
      llmTopP: number | null
      toolNames: string[]
      requiresHumanApproval: boolean
      systemPrompt: string
    }
  }
  let { agent }: Props = $props()
</script>

<details class="mt-8 border-t border-gray-200">
  <summary class="cursor-pointer font-semibold text-gray-700 py-3 select-none">
    Technical Specification
  </summary>
  <div class="pt-4 pb-6 space-y-3 text-sm text-gray-600">
    <div>
      <span class="font-medium text-gray-900">Language Model:</span>
      {agent.llmName}
    </div>
    <div>
      <span class="font-medium text-gray-900">Temperature:</span>
      {agent.llmTemperature ?? 'default'}
    </div>
    {#if agent.llmMaxTokens}
      <div>
        <span class="font-medium text-gray-900">Max Tokens:</span>
        {agent.llmMaxTokens}
      </div>
    {/if}
    {#if agent.llmTopP !== null && agent.llmTopP !== undefined}
      <div>
        <span class="font-medium text-gray-900">Top P:</span>
        {agent.llmTopP}
      </div>
    {/if}
    <div>
      <span class="font-medium text-gray-900">Tools:</span>
      {agent.toolNames.length > 0 ? agent.toolNames.join(', ') : 'none'}
    </div>
    <div>
      <span class="font-medium text-gray-900">Human Approval:</span>
      {agent.requiresHumanApproval ? 'required' : 'not required'}
    </div>
    <div>
      <span class="font-medium text-gray-900">System Prompt:</span>
      <pre class="mt-1 whitespace-pre-wrap bg-gray-50 rounded p-3 text-xs text-gray-700 max-h-48 overflow-y-auto">{agent.systemPrompt}</pre>
    </div>
  </div>
</details>
