import { describe, it, expect } from 'vitest'
import { buildCatalogParams } from './catalogUrl'

describe('buildCatalogParams', () => {
  it('includes set values, trimmed q, and page=1', () => {
    const p = buildCatalogParams({ category: 'a', llm: '', maturity: '', q: '  sql ' })
    expect(p.toString()).toBe('category=a&q=sql&page=1')
  })
  it('omits empty values', () => {
    expect(buildCatalogParams({ category: '', llm: '', maturity: '', q: '   ' }).toString()).toBe('page=1')
    expect(buildCatalogParams({ q: null }).toString()).toBe('page=1')
  })
  it('keeps all filters together with q', () => {
    const p = buildCatalogParams({ category: 'c', llm: 'l', maturity: 'm', q: 'x y' })
    expect(p.get('llm')).toBe('l')
    expect(p.get('maturity')).toBe('m')
    expect(p.get('q')).toBe('x y')
    expect(p.get('page')).toBe('1')
  })
})
