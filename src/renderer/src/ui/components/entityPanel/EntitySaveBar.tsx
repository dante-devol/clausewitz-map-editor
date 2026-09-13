import { makeStyles, tokens, Button, Text } from '@fluentui/react-components'
import { SaveRegular } from '@fluentui/react-icons'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  summaryText: {
    color: tokens.colorNeutralForeground3
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1
  }
})

interface EntitySaveBarProps {
  summary: string
  actionLabel: string
  savingLabel: string
  disabled: boolean
  saving: boolean
  error: string | null
  onSave: () => void
}

/**
 * Shared save-bar footer for the province/state/strategic-region panels:
 * a pending-change summary plus a save button and inline error message.
 */
export function EntitySaveBar({
  summary,
  actionLabel,
  savingLabel,
  disabled,
  saving,
  error,
  onSave
}: EntitySaveBarProps): JSX.Element {
  const styles = useStyles()

  return (
    <div className={styles.root}>
      <Text size={100} className={styles.summaryText}>{summary}</Text>
      <div className={styles.actions}>
        {error && <Text size={100} className={styles.errorText}>{error}</Text>}
        <Button
          size="small"
          appearance="primary"
          icon={<SaveRegular />}
          disabled={disabled}
          onClick={onSave}
        >
          {saving ? savingLabel : actionLabel}
        </Button>
      </div>
    </div>
  )
}
