import { useState } from 'react'
import { makeStyles } from '@fluentui/react-components'
import { StrategicRegionList } from './StrategicRegionList'
import { StrategicRegionChangesList } from './StrategicRegionChangesList'
import { StrategicRegionSaveBar } from './StrategicRegionSaveBar'

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden'
  }
})

export function StrategicRegionPanel(): JSX.Element {
  const styles = useStyles()
  const [changesCollapsed, setChangesCollapsed] = useState(false)

  return (
    <div className={styles.panel}>
      <StrategicRegionList />
      <StrategicRegionChangesList
        collapsed={changesCollapsed}
        onToggleCollapse={() => setChangesCollapsed((c) => !c)}
      />
      <StrategicRegionSaveBar />
    </div>
  )
}
