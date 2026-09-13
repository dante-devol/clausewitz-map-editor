import {
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  Text
} from '@fluentui/react-components'
import { useI18n } from '../i18n/I18nProvider'

const useStyles = makeStyles({
  surface: {
    maxWidth: '860px',
    width: '90vw'
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM
  },
  description: {
    color: tokens.colorNeutralForeground3
  }
})

interface DebugPanelProps {
  open: boolean
  onClose: () => void
}

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const styles = useStyles()
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onClose() }}>
      <DialogSurface className={styles.surface}>
        <DialogTitle>{t('debug.title')}</DialogTitle>
        <DialogBody className={styles.body}>
          <DialogContent>
            <Text className={styles.description}>{t('debug.movedToDataView')}</Text>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
