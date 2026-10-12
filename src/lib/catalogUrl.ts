export interface CatalogParamsInput {
  category?: string
  llm?: string
  maturity?: string
  q?: string | null
}

/** Build catalog query params; empty values are omitted and page always resets to 1. */
export function buildCatalogParams(input: CatalogParamsInput): URLSearchParams {
  const params = new URLSearchParams()
  if (input.category) params.set('category', input.category)
  if (input.llm) params.set('llm', input.llm)
  if (input.maturity) params.set('maturity', input.maturity)
  const q = (input.q ?? '').trim()
  if (q) params.set('q', q)
  params.set('page', '1')
  return params
}
