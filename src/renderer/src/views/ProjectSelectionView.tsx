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
  DialogTrigger
} from '@fluentui/react-components'
import {
  FolderOpenRegular,
  EditRegular,
  ShieldRegular,
  ErrorCircleRegular,
  CheckmarkCircleRegular
} from '@fluentui/react-icons'
import { ProjectChip } from '../components/ProjectChip'
import type { GameVerificationResult, ModVerificationResult } from '../../../shared/pathTypes'

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
    borderColor: tokens.colorPaletteRedBorder2,
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

const PATH_LABELS: Record<string, string> = {
  defaultMap: 'Default Map',
  definitions: 'Definitions',
  provinces: 'Provinces',
  continent: 'Continent',
  provinceTerrain: 'Province Terrain'
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
  const hasGamePath = !!gamePath
  const gameInvalid = hasGamePath && gamePathValid === false
  const canProceed = gamePathValid === true

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={600} weight="bold">HOI4 Map Editor</Text>
        <Text size={300} style={{ color: 'var(--colorNeutralForeground3)' }}>
          Open a mod folder to get started
        </Text>
      </div>

      {!hasGamePath ? (
        <MessageBar intent="warning">
          <MessageBarBody>A vanilla game path is required to continue.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="subtle" icon={<FolderOpenRegular />} onClick={onBrowseGamePath}>
              Locate game folder…
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
              <Text size={300} weight="semibold">Hearts of Iron IV</Text>
              <Text size={200} className={styles.gameChipPath}>{gamePath}</Text>
              {gameInvalid && gameVerification && (
                <div className={styles.missingPaths}>
                  <Text size={200} style={{ color: tokens.colorPaletteRedForeground3 }}>
                    Missing required files:
                  </Text>
                  {gameVerification.missingPaths.map((key) => (
                    <Text key={key} size={200} style={{ color: tokens.colorPaletteRedForeground3 }}>
                      · {PATH_LABELS[key] ?? key}
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
          <Divider className={styles.divider}>Recent</Divider>
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
        Open a mod folder…
      </Button>

      {/* Mod warning dialog — shown when the selected mod has no recognized paths */}
      <Dialog open={!!pendingProject} onOpenChange={(_, d) => { if (!d.open) onCancelPending() }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>No recognized files found</DialogTitle>
            <DialogContent>
              <Text size={300}>
                This folder doesn't contain any of the expected mod files. It may be a full vanilla
                overwrite or an empty project. You can still open it — missing files will fall back
                to the game installation.
              </Text>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" onClick={onCancelPending}>Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={onConfirmPending}>Open anyway</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
