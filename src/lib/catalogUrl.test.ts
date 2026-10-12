import { describe, it, expect } from 'vitest'
import { buildCatalogParams, parsePage } from './catalogUrl'

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

describe('parsePage', () => {
  it('passes valid pages through', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('7')).toBe(7)
    expect(parsePage('3abc')).toBe(3)
  })
  it('clamps NaN, missing, zero and negative to 1', () => {
    for (const raw of ['abc', '', '0', '-5', '-0', null, undefined, 'NaN', 'Infinity']) {
      expect(parsePage(raw as string | null)).toBe(1)
    }
  })
  it('caps absurdly large pages', () => {
    expect(parsePage('99999999999999999999')).toBe(1_000_000)
    expect(Number.isSafeInteger((parsePage('1e30') - 1) * 24)).toBe(true)
  })
})
