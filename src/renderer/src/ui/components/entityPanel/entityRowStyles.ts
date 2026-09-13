import { makeStyles, tokens } from '@fluentui/react-components'

/** Shared row-cell styles for EntityList row renderers (id/name are common to every entity type). */
export const useEntityRowStyles = makeStyles({
  id: {
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    width: '36px',
    textAlign: 'right',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2
  },
  name: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  category: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    maxWidth: '72px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  owner: {
    fontFamily: 'monospace',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
    width: '32px',
    textAlign: 'center'
  },
  count: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    fontFamily: 'monospace'
  }
})
