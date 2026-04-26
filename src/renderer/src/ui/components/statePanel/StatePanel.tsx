import { useState } from 'react'
import { makeStyles } from '@fluentui/react-components'
import { StateList } from './StateList'
import { StateDetailPanel } from './StateDetailPanel'
import { StateChangesList } from './StateChangesList'
import { StateSaveBar } from './StateSaveBar'

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden'
  }
})

export function StatePanel(): JSX.Element {
  const styles = useStyles()
  const [changesCollapsed, setChangesCollapsed] = useState(false)

  return (
    <div className={styles.panel}>
      <StateList />
      <StateDetailPanel />
      <StateChangesList
        collapsed={changesCollapsed}
        onToggleCollapse={() => setChangesCollapsed((c) => !c)}
      />
      <StateSaveBar />
    </div>
  )
}
