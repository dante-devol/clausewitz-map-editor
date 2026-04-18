import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider
} from '@fluentui/react-components'
import { FolderOpenRegular } from '@fluentui/react-icons'
import { ProjectChip } from '../components/ProjectChip'

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
  browse: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
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
  recentProjects: string[]
  onOpen: (path: string) => void
  onBrowse: () => void
  onRemove: (path: string) => void
}

export function ProjectSelectionView({
  recentProjects,
  onOpen,
  onBrowse,
  onRemove
}: ProjectSelectionViewProps) {
  const styles = useStyles()

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={600} weight="bold">HOI4 Map Editor</Text>
        <Text size={300} style={{ color: 'var(--colorNeutralForeground3)' }}>
          Open a mod folder to get started
        </Text>
      </div>

      <div className={styles.browse}>
        <Button
          appearance="primary"
          icon={<FolderOpenRegular />}
          onClick={onBrowse}
          size="large"
        >
          Browse for folder…
        </Button>
      </div>

      {recentProjects.length > 0 && (
        <>
          <Divider className={styles.divider}>Recent</Divider>
          <div className={styles.recentList}>
            {recentProjects.map((path) => (
              <ProjectChip
                key={path}
                path={path}
                onClick={() => onOpen(path)}
                onRemove={() => onRemove(path)}
              />
            ))}
          </div>
        </>
      )}

      {recentProjects.length === 0 && (
        <Text className={styles.empty} size={200}>No recent projects</Text>
      )}
    </div>
  )
}
