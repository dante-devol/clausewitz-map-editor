import {
  makeStyles,
  tokens,
  Text,
  Button
} from '@fluentui/react-components'
import { DismissRegular, FolderRegular } from '@fluentui/react-icons'

const useStyles = makeStyles({
  chip: {
    position: 'relative',
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
  },
  remove: {
    position: 'absolute',
    top: tokens.spacingVerticalXS,
    right: tokens.spacingHorizontalXS,
    opacity: 0,
    '$chip:hover &': { opacity: 1 }
  }
})

interface ProjectChipProps {
  path: string
  onClick: () => void
  onRemove: () => void
}

function folderName(path: string): string {
  return path.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? path
}

export function ProjectChip({ path, onClick, onRemove }: ProjectChipProps) {
  const styles = useStyles()

  return (
    <div className={styles.chip} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <FolderRegular className={styles.icon} fontSize={20} />
      <div className={styles.text}>
        <Text className={styles.name} weight="semibold" size={300}>{folderName(path)}</Text>
        <Text className={styles.path} size={200}>{path}</Text>
      </div>
      <Button
        className={styles.remove}
        appearance="subtle"
        size="small"
        icon={<DismissRegular />}
        onClick={(e) => { e.stopPropagation(); onRemove() }}
      />
    </div>
  )
}
