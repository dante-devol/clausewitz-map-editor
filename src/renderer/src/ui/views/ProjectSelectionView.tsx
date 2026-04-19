import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarActions,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  DialogTrigger,
  shorthands
} from '@fluentui/react-components'
import {
  FolderOpenRegular,
  EditRegular,
  ShieldRegular,
  ErrorCircleRegular,
  CheckmarkCircleRegular
} from '@fluentui/react-icons'
import { ProjectChip } from '../components/ProjectChip'
import type { GameVerificationResult, ModVerificationResult } from '../../../../shared/pathTypes'
import { useI18n } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages/en'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    gap: tokens.spacingVerticalL
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS
  },
  gameChip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2
  },
  gameChipError: {
    ...shorthands.borderColor(tokens.colorPaletteRedBorder2),
    backgroundColor: tokens.colorPaletteRedBackground1
  },
  gameChipIcon: {
    marginTop: '2px',
    flexShrink: 0
  },
  gameChipText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
    flex: 1
  },
  gameChipPath: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground4
  },
  statusIcon: {
    marginTop: '2px',
    flexShrink: 0
  },
  missingPaths: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXS
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    overflowY: 'auto',
    flex: 1
  },
  divider: {
    flexGrow: 0
  },
  empty: {
    color: tokens.colorNeutralForeground4,
    textAlign: 'center',
    paddingTop: tokens.spacingVerticalM
  }
})

interface ProjectSelectionViewProps {
  gamePath: string | null
  gamePathValid: boolean | null
  gameVerification: GameVerificationResult | null
  recentProjects: string[]
  pendingProject: { path: string; verification: ModVerificationResult } | null
  onBrowseGamePath: () => void
  onOpen: (path: string) => void
  onBrowse: () => void
  onRemove: (path: string) => void
  onConfirmPending: () => void
  onCancelPending: () => void
}

const PATH_LABEL_KEYS: Record<string, MessageKey> = {
  descriptor: 'path.descriptor',
  defaultMap: 'path.defaultMap',
  definitions: 'path.definitions',
  provinces: 'path.provinces',
  continent: 'path.continent',
  provinceTerrain: 'path.provinceTerrain',
  states: 'path.states',
  strategicRegions: 'path.strategicRegions'
}

export function ProjectSelectionView({
  gamePath,
  gamePathValid,
  gameVerification,
  recentProjects,
  pendingProject,
  onBrowseGamePath,
  onOpen,
  onBrowse,
  onRemove,
  onConfirmPending,
  onCancelPending
}: ProjectSelectionViewProps) {
  const styles = useStyles()
  const { t } = useI18n()
  const hasGamePath = !!gamePath
  const gameInvalid = hasGamePath && gamePathValid === false
  const canProceed = gamePathValid === true

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={600} weight="bold">{t('app.title')}</Text>
        <Text size={300} style={{ color: 'var(--colorNeutralForeground3)' }}>
          {t('projectSelection.subtitle')}
        </Text>
      </div>

      {!hasGamePath ? (
        <MessageBar intent="warning">
          <MessageBarBody>{t('projectSelection.gamePathRequired')}</MessageBarBody>
          <MessageBarActions>
            <Button appearance="subtle" icon={<FolderOpenRegular />} onClick={onBrowseGamePath}>
              {t('projectSelection.locateGameFolder')}
            </Button>
          </MessageBarActions>
        </MessageBar>
      ) : (
        <>
          <div className={`${styles.gameChip} ${gameInvalid ? styles.gameChipError : ''}`}>
            <ShieldRegular
              className={styles.gameChipIcon}
              fontSize={20}
              style={{ color: gameInvalid ? tokens.colorPaletteRedForeground3 : tokens.colorBrandForeground1 }}
            />
            <div className={styles.gameChipText}>
              <Text size={300} weight="semibold">{t('projectSelection.gameTitle')}</Text>
              <Text size={200} className={styles.gameChipPath}>{gamePath}</Text>
              {gameInvalid && gameVerification && (
                <div className={styles.missingPaths}>
                  <Text size={200} style={{ color: tokens.colorPaletteRedForeground3 }}>
                    {t('projectSelection.missingRequiredFiles')}
                  </Text>
                  {gameVerification.missingPaths.map((key) => (
                    <Text key={key} size={200} style={{ color: tokens.colorPaletteRedForeground3 }}>
                      · {PATH_LABEL_KEYS[key] ? t(PATH_LABEL_KEYS[key]) : key}
                    </Text>
                  ))}
                </div>
              )}
            </div>
            {gamePathValid === true && (
              <CheckmarkCircleRegular
                className={styles.statusIcon}
                fontSize={16}
                style={{ color: tokens.colorPaletteGreenForeground1 }}
              />
            )}
            {gameInvalid && (
              <ErrorCircleRegular
                className={styles.statusIcon}
                fontSize={16}
                style={{ color: tokens.colorPaletteRedForeground3 }}
              />
            )}
            <Button appearance="subtle" size="small" icon={<EditRegular />} onClick={onBrowseGamePath} />
          </div>
        </>
      )}

      {recentProjects.length > 0 && (
        <>
          <Divider className={styles.divider}>{t('projectSelection.recent')}</Divider>
          <div className={styles.recentList}>
            {recentProjects.map((path) => (
              <ProjectChip
                key={path}
                path={path}
                onClick={() => canProceed && onOpen(path)}
                onRemove={() => onRemove(path)}
                disabled={!canProceed}
              />
            ))}
          </div>
        </>
      )}

      <Divider className={styles.divider} />

      <Button
        appearance="primary"
        icon={<FolderOpenRegular />}
        onClick={onBrowse}
        size="large"
        disabled={!canProceed}
      >
        {t('projectSelection.openModFolder')}
      </Button>

      {/* Mod warning dialog — shown when the selected mod has no recognized paths */}
      <Dialog open={!!pendingProject} onOpenChange={(_, d) => { if (!d.open) onCancelPending() }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('projectSelection.noRecognizedFilesTitle')}</DialogTitle>
            <DialogContent>
              <Text size={300}>
                {t('projectSelection.noRecognizedFilesBody')}
              </Text>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" onClick={onCancelPending}>{t('projectSelection.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={onConfirmPending}>{t('projectSelection.openAnyway')}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
