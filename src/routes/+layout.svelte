<script>
  import '../app.css'
  let { children, data } = $props()
</script>

<div class="min-h-screen bg-white">
  <header class="bg-gray-100 border-b border-gray-200">
    <div class="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
      <a href="/catalog" class="text-lg font-semibold text-gray-900">AIC Agent Library</a>
      {#if data.user}
        <div class="flex items-center gap-4">
          <span class="hidden text-sm text-gray-600 sm:inline">{data.user.email}</span>
          <form method="POST" action="/logout">
            <button type="submit" class="text-sm font-medium text-blue-700 hover:underline">Sign out</button>
          </form>
        </div>
      {/if}
    </div>
  </header>
  <main class="max-w-6xl mx-auto px-4 md:px-6 py-8">
    {@render children()}
  </main>
</div>
