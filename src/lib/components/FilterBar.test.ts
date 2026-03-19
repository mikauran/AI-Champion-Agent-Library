// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import FilterBar from './FilterBar.svelte'

const defaultProps = {
  categories: ['productivity', 'devops', 'nlp'],
  llms: ['gpt-4o', 'claude-3-5-sonnet'],
  maturityStatuses: ['experimental', 'beta', 'production'],
  selectedCategory: '',
  selectedLlm: '',
  selectedMaturity: '',
  onCategoryChange: vi.fn(),
  onLlmChange: vi.fn(),
  onMaturityChange: vi.fn(),
  onClear: vi.fn(),
}

describe('FilterBar', () => {
  it('renders category dropdown with provided options', () => {
    const { container } = render(FilterBar, defaultProps)
    const select = container.querySelector('#filter-category')
    expect(select).not.toBeNull()
    const optionValues = Array.from(select!.querySelectorAll('option')).map(o => o.value)
    expect(optionValues).toContain('productivity')
    expect(optionValues).toContain('devops')
    expect(optionValues).toContain('nlp')
  })

  it('renders LLM dropdown with provided options', () => {
    const { container } = render(FilterBar, defaultProps)
    const select = container.querySelector('#filter-llm')
    expect(select).not.toBeNull()
    const optionValues = Array.from(select!.querySelectorAll('option')).map(o => o.value)
    expect(optionValues).toContain('gpt-4o')
    expect(optionValues).toContain('claude-3-5-sonnet')
  })

  it('renders maturity status dropdown with provided options', () => {
    const { container } = render(FilterBar, defaultProps)
    const select = container.querySelector('#filter-maturity')
    expect(select).not.toBeNull()
    const optionValues = Array.from(select!.querySelectorAll('option')).map(o => o.value)
    expect(optionValues).toContain('experimental')
    expect(optionValues).toContain('beta')
    expect(optionValues).toContain('production')
  })

  it('calls onCategoryChange when category selected', async () => {
    const onCategoryChange = vi.fn()
    const { container } = render(FilterBar, { ...defaultProps, onCategoryChange })
    const select = container.querySelector('#filter-category') as HTMLSelectElement
    await fireEvent.change(select, { target: { value: 'devops' } })
    expect(onCategoryChange).toHaveBeenCalledWith('devops')
  })

  it('calls onLlmChange when LLM selected', async () => {
    const onLlmChange = vi.fn()
    const { container } = render(FilterBar, { ...defaultProps, onLlmChange })
    const select = container.querySelector('#filter-llm') as HTMLSelectElement
    await fireEvent.change(select, { target: { value: 'gpt-4o' } })
    expect(onLlmChange).toHaveBeenCalledWith('gpt-4o')
  })

  it('calls onMaturityChange when maturity status selected', async () => {
    const onMaturityChange = vi.fn()
    const { container } = render(FilterBar, { ...defaultProps, onMaturityChange })
    const select = container.querySelector('#filter-maturity') as HTMLSelectElement
    await fireEvent.change(select, { target: { value: 'production' } })
    expect(onMaturityChange).toHaveBeenCalledWith('production')
  })

  it('shows Clear filters button when a filter is active', () => {
    const { container } = render(FilterBar, { ...defaultProps, selectedCategory: 'productivity' })
    const buttons = Array.from(container.querySelectorAll('button'))
    const clearButton = buttons.find(b => b.textContent?.trim() === 'Clear filters')
    expect(clearButton).toBeTruthy()
  })

  it('hides Clear filters button when no filter is active', () => {
    const { container } = render(FilterBar, defaultProps)
    const buttons = Array.from(container.querySelectorAll('button'))
    const clearButton = buttons.find(b => b.textContent?.trim() === 'Clear filters')
    expect(clearButton).toBeFalsy()
  })
})
