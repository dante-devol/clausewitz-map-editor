import { useState } from 'react'
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions
} from '@fluentui/react-components'
import { DismissRegular, FolderRegular } from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'

const useStyles = makeStyles({
  chip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: 'pointer',
    transition: 'background 0.1s, border-color 0.1s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
      borderColor: tokens.colorNeutralStroke1Hover
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground2Pressed
    }
  },
  icon: {
    marginTop: '2px',
    color: tokens.colorBrandForeground1,
    flexShrink: 0
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
    flex: 1
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  path: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground4
  }
})

interface ProjectChipProps {
  path: string
  onClick: () => void
  onRemove: () => void
  disabled?: boolean
}

function folderName(path: string): string {
  return path.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? path
}

export function ProjectChip({ path, onClick, onRemove, disabled }: ProjectChipProps) {
  const styles = useStyles()
  const { t } = useI18n()
  const [hovered, setHovered] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div
        className={styles.chip}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
        onKeyDown={(e) => !disabled && e.key === 'Enter' && onClick()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <FolderRegular className={styles.icon} fontSize={20} />
        <div className={styles.text}>
          <Text className={styles.name} weight="semibold" size={300}>{folderName(path)}</Text>
          <Text className={styles.path} size={200}>{path}</Text>
        </div>
        {hovered && !disabled && (
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
          />
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(_, d) => setConfirmOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('projectChip.removeFromRecents')}</DialogTitle>
            <DialogContent>
              <Text size={300} style={{ color: 'var(--colorNeutralForeground3)' }}>{path}</Text>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('projectSelection.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={() => { setConfirmOpen(false); onRemove() }}>
                {t('projectChip.remove')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
