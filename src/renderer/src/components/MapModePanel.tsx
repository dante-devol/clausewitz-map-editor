import { makeStyles, tokens, Text, RadioGroup, Radio } from '@fluentui/react-components'
import { type DisplayMode, DISPLAY_MODE_LABELS } from '../config/displayModes'

const MODES = Object.keys(DISPLAY_MODE_LABELS) as DisplayMode[]

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  label: {
    color: tokens.colorNeutralForeground2,
    marginBottom: tokens.spacingVerticalXS,
  },
})

interface Props {
  mode: DisplayMode
  onModeChange: (mode: DisplayMode) => void
}

export function MapModePanel({ mode, onModeChange }: Props): JSX.Element {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <Text size={200} weight="semibold" className={styles.label}>Display Mode</Text>
      <RadioGroup
        value={mode}
        layout="vertical"
        onChange={(_, data) => onModeChange(data.value as DisplayMode)}
      >
        {MODES.map((m) => (
          <Radio key={m} value={m} label={DISPLAY_MODE_LABELS[m]} />
        ))}
      </RadioGroup>
    </div>
  )
}
