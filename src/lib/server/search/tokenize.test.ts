import { describe, it, expect } from 'vitest'
import { tokenize } from './tokenize.js'

describe('tokenize', () => {
  it('lowercases, splits, keeps hyphen parts and joined form', () => {
    const t = tokenize('Check HVAC-ready ai-act, SQL!')
    for (const x of ['check', 'hvac', 'ready', 'hvac-ready', 'ai', 'act', 'ai-act', 'sql']) {
      expect(t).toContain(x)
    }
  })

  it('drops stopwords and single chars, keeps digits', () => {
    const t = tokenize('the and for of to a in on with x ISO 9001')
    expect(t).toEqual(['iso', '9001'])
  })

  it('is deterministic', () => {
    expect(tokenize('Foo bar-baz')).toEqual(tokenize('Foo bar-baz'))
  })

  it('handles empty input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize(' - -- ')).toEqual([])
  })
})
