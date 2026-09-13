import { useState, type KeyboardEvent } from 'react'
import { Button, Input, Tag, makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import { DismissRegular, SearchRegular } from '@fluentui/react-icons'
import type { EntityFilterChip, EntitySearchSuggestion } from './entitySearch'

const useStyles = makeStyles({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  input: {
    width: '100%'
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXS
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: tokens.spacingHorizontalS,
    right: tokens.spacingHorizontalS,
    zIndex: 20,
    marginTop: '2px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    overflow: 'hidden'
  },
  suggestionItem: {
    justifyContent: 'flex-start',
    borderRadius: 0
  },
  suggestionItemActive: {
    backgroundColor: tokens.colorNeutralBackground2
  }
})

interface EntitySearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  chips: EntityFilterChip[]
  onRemoveChip: (chip: EntityFilterChip) => void
  suggestions: EntitySearchSuggestion[]
  onApplySuggestion: (suggestion: EntitySearchSuggestion) => void
  placeholder: string
  removeChipLabel: string
}

/**
 * Shared search bar: free-text input with inline field/value suggestions
 * that apply as removable chips, used by the province, state, and
 * strategic-region panels in place of a separate filter popover.
 */
export function EntitySearchBar({
  query,
  onQueryChange,
  chips,
  onRemoveChip,
  suggestions,
  onApplySuggestion,
  placeholder,
  removeChipLabel
}: EntitySearchBarProps): JSX.Element {
  const styles = useStyles()
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const showSuggestions = focused && suggestions.length > 0

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const suggestion = suggestions[activeIndex] ?? suggestions[0]
      if (suggestion) {
        e.preventDefault()
        onApplySuggestion(suggestion)
      }
    } else if (e.key === 'Escape') {
      setFocused(false)
    }
  }

  return (
    <div className={styles.root}>
      <Input
        size="small"
        className={styles.input}
        placeholder={placeholder}
        value={query}
        contentBefore={<SearchRegular />}
        contentAfter={query.length > 0
          ? <Button size="small" appearance="transparent" icon={<DismissRegular />} onClick={() => onQueryChange('')} />
          : undefined}
        onChange={(_, data) => { onQueryChange(data.value); setActiveIndex(0) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
      />
      {chips.length > 0 && (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <Tag
              key={`${chip.fieldKey}:${chip.value}`}
              size="small"
              dismissible
              dismissIcon={{ 'aria-label': removeChipLabel, onClick: () => onRemoveChip(chip) }}
            >
              {chip.label}
            </Tag>
          ))}
        </div>
      )}
      {showSuggestions && (
        <div className={styles.suggestions}>
          {suggestions.map((suggestion, index) => (
            <Button
              key={`${suggestion.fieldKey}:${suggestion.value}`}
              appearance="subtle"
              size="small"
              className={mergeClasses(styles.suggestionItem, index === activeIndex && styles.suggestionItemActive)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onApplySuggestion(suggestion)}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
