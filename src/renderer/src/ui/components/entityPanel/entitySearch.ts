import { useMemo, useState } from 'react'

/** One filterable dimension of an entity (e.g. "type", "severity"). */
export interface EntityFilterField<T> {
  key: string
  label: string
  /** Normalized (lowercase) values this item has for the field. */
  getValues: (item: T) => string[]
  /** Fixed candidate values (e.g. coastal: ['coastal','inland']); omitted means "derive distinct values from the dataset". */
  knownValues?: string[]
  /** Display casing for a value in the default "Label: value" suggestion/chip text. */
  formatValue?: (value: string) => string
  /** Full override of the suggestion/chip text, bypassing "Label: value" (e.g. "Has issues"). */
  formatLabel?: (value: string) => string
}

export interface EntitySearchConfig<T> {
  /** Values plain (non-chip) query words are substring-matched against. */
  freeTextValues: (item: T) => string[]
  fields: EntityFilterField<T>[]
}

export interface EntityFilterChip {
  fieldKey: string
  value: string
  label: string
}

export interface EntitySearchSuggestion {
  fieldKey: string
  value: string
  label: string
}

const SUGGESTION_LIMIT = 8

export function matchesEntitySearch<T>(
  item: T,
  query: string,
  chips: readonly EntityFilterChip[],
  config: EntitySearchConfig<T>
): boolean {
  for (const chip of chips) {
    const field = config.fields.find((f) => f.key === chip.fieldKey)
    if (field && !field.getValues(item).includes(chip.value)) return false
  }
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  return config.freeTextValues(item).some((value) => value.toLowerCase().includes(q))
}

function distinctValues<T>(items: readonly T[], getValues: (item: T) => string[]): string[] {
  const values = new Set<string>()
  for (const item of items) {
    for (const value of getValues(item)) {
      if (value) values.add(value)
    }
  }
  return [...values].sort()
}

function formatSuggestionLabel<T>(field: EntityFilterField<T>, value: string): string {
  if (field.formatLabel) return field.formatLabel(value)
  return `${field.label}: ${field.formatValue ? field.formatValue(value) : value}`
}

export function buildSearchSuggestions<T>(
  query: string,
  items: readonly T[],
  activeChips: readonly EntityFilterChip[],
  config: EntitySearchConfig<T>
): EntitySearchSuggestion[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []

  const suggestions: EntitySearchSuggestion[] = []
  for (const field of config.fields) {
    const candidates = field.knownValues ?? distinctValues(items, field.getValues)
    const active = new Set(activeChips.filter((c) => c.fieldKey === field.key).map((c) => c.value))
    for (const value of candidates) {
      if (active.has(value)) continue
      if (!value.toLowerCase().includes(q)) continue
      suggestions.push({ fieldKey: field.key, value, label: formatSuggestionLabel(field, value) })
      if (suggestions.length >= SUGGESTION_LIMIT) return suggestions
    }
  }
  return suggestions
}

export interface EntitySearchState<T> {
  query: string
  setQuery: (query: string) => void
  chips: EntityFilterChip[]
  addChip: (suggestion: EntitySearchSuggestion) => void
  removeChip: (chip: EntityFilterChip) => void
  suggestions: EntitySearchSuggestion[]
  filteredItems: T[]
}

/**
 * Shared search+filter state: a free-text query matched against
 * `freeTextValues`, plus removable filter chips picked from inline
 * suggestions (field/value pairs matched against the query as it's typed).
 */
export function useEntitySearch<T>(items: readonly T[], config: EntitySearchConfig<T>): EntitySearchState<T> {
  const [query, setQuery] = useState('')
  const [chips, setChips] = useState<EntityFilterChip[]>([])

  const suggestions = useMemo(
    () => buildSearchSuggestions(query, items, chips, config),
    [query, items, chips, config]
  )

  const filteredItems = useMemo(
    () => items.filter((item) => matchesEntitySearch(item, query, chips, config)),
    [items, query, chips, config]
  )

  const addChip = (suggestion: EntitySearchSuggestion) => {
    setChips((current) => (
      current.some((c) => c.fieldKey === suggestion.fieldKey && c.value === suggestion.value)
        ? current
        : [...current, { fieldKey: suggestion.fieldKey, value: suggestion.value, label: suggestion.label }]
    ))
    setQuery('')
  }

  const removeChip = (chip: EntityFilterChip) => {
    setChips((current) => current.filter((c) => !(c.fieldKey === chip.fieldKey && c.value === chip.value)))
  }

  return { query, setQuery, chips, addChip, removeChip, suggestions, filteredItems }
}
