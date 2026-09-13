import type { ReactNode } from 'react'
import { Button, makeStyles, tokens, Text } from '@fluentui/react-components'
import { ChevronDownRegular, ChevronRightRegular, DismissRegular } from '@fluentui/react-icons'

const useStyles = makeStyles({
  container: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    cursor: 'pointer',
    userSelect: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground3 }
  },
  chevron: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  title: {
    flex: 1,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: tokens.fontSizeBase100
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `0 ${tokens.spacingHorizontalS}`,
    paddingBottom: tokens.spacingVerticalXS
  }
})

interface CollapsibleSectionProps {
  title: string
  expanded: boolean
  onToggle: () => void
  action?: ReactNode
  onRemove?: () => void
  children: ReactNode
}

/**
 * Shared collapsible section header/body used by the detail panels (state,
 * strategic region). Kept generic so all detail panels share one visual
 * definition for "section header + chevron + optional badge/remove + body".
 */
export function CollapsibleSection({
  title,
  expanded,
  onToggle,
  action,
  onRemove,
  children
}: CollapsibleSectionProps): JSX.Element {
  const styles = useStyles()

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
      >
        {expanded
          ? <ChevronDownRegular fontSize={12} className={styles.chevron} />
          : <ChevronRightRegular fontSize={12} className={styles.chevron} />}
        <Text size={100} className={styles.title}>{title}</Text>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
        {onRemove && (
          <span onClick={(e) => { e.stopPropagation(); onRemove() }}>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} />
          </span>
        )}
      </div>
      {expanded && <div className={styles.body}>{children}</div>}
    </div>
  )
}
