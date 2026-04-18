import { makeStyles, tokens, Text } from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3
  }
})

export function SettingsView() {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <Text size={400}>Settings</Text>
    </div>
  )
}
