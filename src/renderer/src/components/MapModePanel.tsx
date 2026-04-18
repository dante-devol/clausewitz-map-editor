import { useEffect, useMemo, useState } from 'react'
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  Radio,
  RadioGroup,
  Text,
  makeStyles,
  mergeClasses,
  tokens
} from '@fluentui/react-components'
import { SettingsRegular } from '@fluentui/react-icons'
import {
  type ConfigurableDisplayMode,
  type DisplayMode,
  type DisplayModeValueDescriptor,
  DISPLAY_MODE_LABELS,
  isConfigurableDisplayMode,
  packedColorToHex
} from '../config/displayModes'
import { useDisplayModeConfigStore } from '../store/displayModeConfigStore'

const MODES = Object.keys(DISPLAY_MODE_LABELS) as DisplayMode[]

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  label: {
    color: tokens.colorNeutralForeground2,
    marginBottom: tokens.spacingVerticalXS,
  },
  modeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  },
  modeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS
  },
  modeRadio: {
    flex: 1
  },
  iconButton: {
    flexShrink: 0
  },
  dialogSurface: {
    width: 'min(960px, calc(100vw - 32px))',
    maxWidth: 'calc(100vw - 32px)'
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    minWidth: 0
  },
  dialogContent: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
    minWidth: 0,
    overflowX: 'hidden',
    '@media (max-width: 900px)': {
      gridTemplateColumns: 'minmax(0, 1fr)'
    }
  },
  valueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxHeight: '520px',
    overflowY: 'auto',
    paddingRight: tokens.spacingHorizontalXS,
    minWidth: 0
  },
  valueRow: {
    display: 'grid',
    gridTemplateColumns: '14px minmax(0, 1fr)',
    gap: tokens.spacingHorizontalS,
    alignItems: 'start',
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: 'pointer'
  },
  valueRowSelected: {
    borderColor: tokens.colorBrandStroke1,
    backgroundColor: tokens.colorBrandBackground2
  },
  swatch: {
    width: '14px',
    height: '14px',
    marginTop: '3px',
    borderRadius: tokens.borderRadiusCircular,
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground5}`
  },
  valueMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
    minWidth: 0
  },
  valueName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  valueSource: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  valueSourceOverride: {
    color: tokens.colorPaletteGreenForeground1
  },
  controls: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center'
  },
  editorPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    minWidth: 0
  },
  editorTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0
  },
  editorSwatch: {
    width: '18px',
    height: '18px',
    borderRadius: tokens.borderRadiusCircular,
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground5}`,
    flexShrink: 0
  },
  pickerShell: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    minWidth: 0,
    overflowX: 'hidden'
  },
  pickerArea: {
    minHeight: '220px',
    minWidth: 0
  },
  hexRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    minWidth: 0
  },
  input: {
    flex: '1 1 220px',
    minWidth: 0
  },
  empty: {
    color: tokens.colorNeutralForeground3
  }
})

interface Props {
  mode: DisplayMode
  onModeChange: (mode: DisplayMode) => void
  valuesByMode: Partial<Record<ConfigurableDisplayMode, DisplayModeValueDescriptor[]>>
}

export function MapModePanel({ mode, onModeChange, valuesByMode }: Props): JSX.Element {
  const styles = useStyles()
  const [dialogMode, setDialogMode] = useState<ConfigurableDisplayMode | null>(null)

  const activeValues = dialogMode ? (valuesByMode[dialogMode] ?? []) : []

  return (
    <>
      <div className={styles.root}>
        <Text size={200} weight="semibold" className={styles.label}>Display Mode</Text>
        <RadioGroup
          value={mode}
          layout="vertical"
          onChange={(_, data) => onModeChange(data.value as DisplayMode)}
        >
          <div className={styles.modeList}>
            {MODES.map((entryMode) => {
              const configurable = isConfigurableDisplayMode(entryMode)
              return (
                <div key={entryMode} className={styles.modeRow}>
                  <Radio className={styles.modeRadio} value={entryMode} label={DISPLAY_MODE_LABELS[entryMode]} />
                  {configurable && (
                    <Button
                      className={styles.iconButton}
                      appearance="subtle"
                      size="small"
                      icon={<SettingsRegular />}
                      aria-label={`Configure ${DISPLAY_MODE_LABELS[entryMode]} colors`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setDialogMode(entryMode)
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </RadioGroup>
      </div>

      <ModeConfigDialog
        mode={dialogMode}
        values={activeValues}
        onClose={() => setDialogMode(null)}
      />
    </>
  )
}

interface ModeConfigDialogProps {
  mode: ConfigurableDisplayMode | null
  values: DisplayModeValueDescriptor[]
  onClose: () => void
}

function ModeConfigDialog({ mode, values, onClose }: ModeConfigDialogProps): JSX.Element {
  const styles = useStyles()
  const resetModeOverrides = useDisplayModeConfigStore((s) => s.resetModeOverrides)
  const hasOverrides = useMemo(() => values.some((value) => value.isOverride), [values])
  const [selectedValueKey, setSelectedValueKey] = useState<string | null>(null)

  useEffect(() => {
    setSelectedValueKey(values[0]?.key ?? null)
  }, [mode, values])

  const selectedValue = values.find((value) => value.key === selectedValueKey) ?? values[0] ?? null

  return (
    <Dialog open={mode !== null} onOpenChange={(_, data) => { if (!data.open) onClose() }}>
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody>
          <div className={styles.dialogHeader}>
            <DialogTitle>{mode ? `${DISPLAY_MODE_LABELS[mode]} Colors` : 'Colors'}</DialogTitle>
            {mode && (
              <Button
                size="small"
                appearance="subtle"
                disabled={!hasOverrides}
                onClick={() => void resetModeOverrides(mode)}
              >
                Reset Mode
              </Button>
            )}
          </div>
          <DialogContent className={styles.dialogContent}>
            {mode === null || values.length === 0 ? (
              <Text size={100} className={styles.empty}>No values loaded</Text>
            ) : (
              <>
                <div className={styles.valueList}>
                  {values.map((value) => (
                    <ModeValueRow
                      key={value.key}
                      value={value}
                      selected={value.key === selectedValue?.key}
                      onSelect={() => setSelectedValueKey(value.key)}
                    />
                  ))}
                </div>
                {selectedValue && <ModeValueEditor mode={mode} value={selectedValue} values={values} />}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

interface ModeValueRowProps {
  value: DisplayModeValueDescriptor
  selected: boolean
  onSelect: () => void
}

function ModeValueRow({ value, selected, onSelect }: ModeValueRowProps): JSX.Element {
  const styles = useStyles()

  return (
    <div
      className={mergeClasses(styles.valueRow, selected && styles.valueRowSelected)}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className={styles.swatch} style={{ backgroundColor: packedColorToHex(value.color) }} />
      <div>
        <div className={styles.valueMeta}>
          <Text size={100} weight="medium" className={styles.valueName}>{value.label}</Text>
          <Text
            size={100}
            className={mergeClasses(styles.valueSource, value.isOverride && styles.valueSourceOverride)}
          >
            {value.isOverride ? 'override' : 'default'}
          </Text>
        </div>
        <Text size={100} className={styles.valueSource}>{packedColorToHex(value.color)}</Text>
      </div>
    </div>
  )
}

interface ModeValueEditorProps {
  mode: ConfigurableDisplayMode
  value: DisplayModeValueDescriptor
  values: DisplayModeValueDescriptor[]
}

type HsvColor = {
  h: number
  s: number
  v: number
  a?: number
}

function ModeValueEditor({ mode, value, values }: ModeValueEditorProps): JSX.Element {
  const styles = useStyles()
  const setOverride = useDisplayModeConfigStore((s) => s.setOverride)
  const resetOverride = useDisplayModeConfigStore((s) => s.resetOverride)
  const [draft, setDraft] = useState(packedColorToHex(value.color))
  const [pickerColor, setPickerColor] = useState<HsvColor>(() => hexToHsv(packedColorToHex(value.color)))

  useEffect(() => {
    const hex = packedColorToHex(value.color)
    setDraft(hex)
    setPickerColor(hexToHsv(hex))
  }, [value.key, value.color])

  const normalized = normalizeHexCandidate(draft)
  const currentHex = packedColorToHex(value.color)
  const canApply = normalized !== null && normalized !== currentHex

  return (
    <div className={styles.editorPanel}>
      <div className={styles.editorHeader}>
        <div className={styles.editorTitle}>
          <div className={styles.editorSwatch} style={{ backgroundColor: hsvToHex(pickerColor) }} />
          <Text size={300} weight="semibold" className={styles.valueName}>{value.label}</Text>
        </div>
        <Text
          size={100}
          className={mergeClasses(styles.valueSource, value.isOverride && styles.valueSourceOverride)}
        >
          {value.isOverride ? 'override' : 'default'}
        </Text>
      </div>

      <div className={styles.pickerShell}>
        <ColorPicker
          style={{ minWidth: 0 }}
          color={pickerColor}
          onColorChange={(_, data) => {
            setPickerColor({ ...data.color, a: data.color.a ?? 1 })
            setDraft(hsvToHex(data.color))
          }}
        >
          <ColorArea className={styles.pickerArea} />
          <ColorSlider />
        </ColorPicker>

        <div className={styles.hexRow}>
          <Input
            size="small"
            className={styles.input}
            value={draft}
            onChange={(_, data) => {
              setDraft(data.value)
              const next = normalizeHexCandidate(data.value)
              if (next) setPickerColor(hexToHsv(next))
            }}
          />
          <Button
            size="small"
            appearance="secondary"
            onClick={() => {
              const randomHex = pickDistantColorHex(values, value.key)
              setDraft(randomHex)
              setPickerColor(hexToHsv(randomHex))
            }}
          >
            Random
          </Button>
          <Button
            size="small"
            appearance="primary"
            disabled={!canApply}
            onClick={() => {
              if (normalized) void setOverride(mode, value.key, normalized)
            }}
          >
            Apply
          </Button>
          <Button
            size="small"
            appearance="subtle"
            disabled={!value.isOverride}
            onClick={() => void resetOverride(mode, value.key)}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

function normalizeHexCandidate(value: string): string | null {
  const normalized = value.trim().replace(/^#/, '').toLowerCase()
  if (!/^[0-9a-f]{6}$/.test(normalized)) return null
  return `#${normalized}`
}

function hexToHsv(hex: string): HsvColor {
  const normalized = normalizeHexCandidate(hex) ?? '#ffffff'
  const r = parseInt(normalized.slice(1, 3), 16) / 255
  const g = parseInt(normalized.slice(3, 5), 16) / 255
  const b = parseInt(normalized.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * (((b - r) / delta) + 2)
    else h = 60 * (((r - g) / delta) + 4)
  }

  return {
    h: (h + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
    a: 1
  }
}

function hsvToHex(color: HsvColor): string {
  const h = ((color.h % 360) + 360) % 360
  const s = clamp01(color.s)
  const v = clamp01(color.v)
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return `#${toHexChannel((r + m) * 255)}${toHexChannel((g + m) * 255)}${toHexChannel((b + m) * 255)}`
}

function pickDistantColorHex(values: DisplayModeValueDescriptor[], selectedKey: string): string {
  const existing = values
    .filter((value) => value.key !== selectedKey)
    .map((value) => hexToHsv(packedColorToHex(value.color)))

  const candidates: HsvColor[] = []
  for (let hue = 0; hue < 360; hue += 8) {
    for (const saturation of [0.58, 0.72, 0.86, 1]) {
      for (const brightness of [0.58, 0.72, 0.86, 1]) {
        candidates.push({ h: hue, s: saturation, v: brightness, a: 1 })
      }
    }
  }

  let bestScore = -1
  let best: HsvColor[] = []

  for (const candidate of candidates) {
    const score = existing.length === 0
      ? vividnessScore(candidate)
      : Math.min(...existing.map((color) => colorDistance(candidate, color)))

    if (score > bestScore + 1e-6) {
      bestScore = score
      best = [candidate]
    } else if (Math.abs(score - bestScore) <= 1e-6) {
      best.push(candidate)
    }
  }

  const shortlist = best
    .sort((a, b) => vividnessScore(b) - vividnessScore(a))
    .slice(0, 12)

  const chosen = shortlist[Math.floor(Math.random() * shortlist.length)] ?? { h: 210, s: 0.8, v: 0.9, a: 1 }
  return hsvToHex(chosen)
}

function colorDistance(a: HsvColor, b: HsvColor): number {
  const rgbA = hsvToRgb(a)
  const rgbB = hsvToRgb(b)
  const dr = (rgbA.r - rgbB.r) / 255
  const dg = (rgbA.g - rgbB.g) / 255
  const db = (rgbA.b - rgbB.b) / 255
  const hueDelta = circularHueDistance(a.h, b.h) / 180
  const satDelta = a.s - b.s
  const valDelta = a.v - b.v

  return Math.sqrt(
    dr * dr * 0.45 +
    dg * dg * 0.8 +
    db * db * 0.35 +
    hueDelta * hueDelta * 0.9 +
    satDelta * satDelta * 0.35 +
    valDelta * valDelta * 0.2
  )
}

function vividnessScore(color: HsvColor): number {
  return color.s * 0.7 + color.v * 0.3
}

function hsvToRgb(color: HsvColor): { r: number; g: number; b: number } {
  const hex = hsvToHex(color)
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  }
}

function circularHueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360
  return Math.min(delta, 360 - delta)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}
