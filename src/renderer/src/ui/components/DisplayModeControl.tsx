import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Input,
  Option,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
  shorthands
} from '@fluentui/react-components'
import {
  BuildingLighthouseFilled,
  BuildingPeopleFilled,
  EarthFilled,
  PuzzlePieceFilled,
  SettingsRegular,
  TreeEvergreenFilled,
  VehicleShipFilled,
  WaterFilled
} from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages/en'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'
import {
  type ConfigurableDisplayMode,
  type DisplayMode,
  type DisplayModeValueDescriptor,
  DISPLAY_MODES,
  isConfigurableDisplayMode,
  packedColorToHex
} from '../../infra/config/displayModes'
import { type HsvColor, normalizeHexCandidate, hexToHsv, hsvToHex, hsvToRgb, colorDistance, vividnessScore } from '../lib/colorUtils'

const MODE_LABEL_KEYS: Record<DisplayMode, MessageKey> = {
  provinces: 'mapMode.provinces',
  type: 'mapMode.type',
  terrain: 'mapMode.terrain',
  coastal: 'mapMode.coastal',
  continent: 'mapMode.continent',
  state: 'mapMode.state',
  strategicRegion: 'mapMode.strategicRegion'
}

const MODE_ICONS: Record<DisplayMode, JSX.Element> = {
  provinces: <PuzzlePieceFilled />,
  type: <WaterFilled />,
  terrain: <TreeEvergreenFilled />,
  coastal: <BuildingLighthouseFilled />,
  continent: <EarthFilled />,
  state: <BuildingPeopleFilled />,
  strategicRegion: <VehicleShipFilled />
}

const useStyles = makeStyles({
  root: {
    display: 'block',
    maxWidth: 'min(320px, calc(100vw - 40px))'
  },
  rootExpanded: {
    maxWidth: 'min(260px, calc(100vw - 40px))'
  },
  widget: {
    display: 'flex',
    alignItems: 'center',
    width: '40px',
    minWidth: '40px',
    overflow: 'hidden',
    padding: '0',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    backdropFilter: 'blur(12px)',
    transitionProperty: 'width, min-width, background-color, border-color, box-shadow',
    transitionDuration: '320ms',
    transitionTimingFunction: tokens.curveEasyEase
  },
  widgetExpanded: {
    width: '196px',
    minWidth: '196px'
  },
  modeIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    lineHeight: 1,
    flexShrink: 0,
    width: '40px',
    minWidth: '40px',
    height: '34px',
    paddingBottom: '1px',
    paddingRight: '1px'
  },
  combobox: {
    flex: 1,
    minWidth: 0,
    opacity: 0,
    transform: 'translateX(-6px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: '320ms',
    transitionTimingFunction: tokens.curveEasyEase,
    '& > button': {
      border: 'none',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      minHeight: '34px',
      paddingLeft: 0,
      paddingRight: 0
    },
    '& [data-button]': {
      justifyContent: 'flex-start'
    }
  },
  comboboxExpanded: {
    opacity: 1,
    transform: 'translateX(0)'
  },
  comboboxCollapsed: {
    pointerEvents: 'none'
  },
  settingsDivider: {
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: tokens.colorNeutralStroke2,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '320ms',
    transitionTimingFunction: tokens.curveEasyEase
  },
  settingsDividerExpanded: {
    opacity: 1
  },
  optionContent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  optionIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    lineHeight: 1
  },
  settingsButton: {
    flexShrink: 0,
    opacity: 0,
    transform: 'translateX(6px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: '320ms',
    transitionTimingFunction: tokens.curveEasyEase
  },
  settingsButtonExpanded: {
    opacity: 1,
    transform: 'translateX(0)'
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
    ...shorthands.borderColor(tokens.colorBrandStroke1),
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

interface DisplayModeControlProps {
  mode: DisplayMode
  onModeChange: (mode: DisplayMode) => void
  valuesByMode: Partial<Record<ConfigurableDisplayMode, DisplayModeValueDescriptor[]>>
}

export function DisplayModeControl({
  mode,
  onModeChange,
  valuesByMode
}: DisplayModeControlProps): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [dialogMode, setDialogMode] = useState<ConfigurableDisplayMode | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  const configurableMode = isConfigurableDisplayMode(mode) ? mode : null
  const activeValues = configurableMode ? (valuesByMode[configurableMode] ?? []) : []
  const expanded = hovered || focusWithin || comboboxOpen
  const selectedLabel = t(MODE_LABEL_KEYS[mode])

  return (
    <>
      <div
        className={mergeClasses(styles.root, expanded && styles.rootExpanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocusWithin(false)
          }
        }}
      >
        <div className={mergeClasses(styles.widget, expanded && styles.widgetExpanded)}>
          <span className={styles.modeIcon}>{MODE_ICONS[mode]}</span>
          <Dropdown
            className={mergeClasses(
              styles.combobox,
              expanded ? styles.comboboxExpanded : styles.comboboxCollapsed
            )}
            size="small"
            appearance="filled-lighter"
            selectedOptions={[mode]}
            aria-label={t('mapMode.title')}
            onOpenChange={(_, data) => setComboboxOpen(data.open)}
            onOptionSelect={(_, data) => {
              if (data.optionValue) onModeChange(data.optionValue as DisplayMode)
            }}
            button={{
              children: selectedLabel
            }}
          >
            {DISPLAY_MODES.map((entryMode) => (
              <Option key={entryMode} value={entryMode} text={t(MODE_LABEL_KEYS[entryMode])}>
                <span className={styles.optionContent}>
                  <span className={styles.optionIcon}>{MODE_ICONS[entryMode]}</span>
                  <span>{t(MODE_LABEL_KEYS[entryMode])}</span>
                </span>
              </Option>
            ))}
          </Dropdown>
          <span
            className={mergeClasses(
              styles.settingsDivider,
              expanded && styles.settingsDividerExpanded
            )}
          />
          <Button
            className={mergeClasses(
              styles.settingsButton,
              expanded && styles.settingsButtonExpanded
            )}
            appearance="subtle"
            size="small"
            icon={<SettingsRegular />}
            disabled={configurableMode === null}
            aria-label={t(
              'mapMode.configureColors',
              { mode: t(MODE_LABEL_KEYS[configurableMode ?? 'provinces']) }
            )}
            onClick={() => {
              if (configurableMode) setDialogMode(configurableMode)
            }}
          />
        </div>
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
  const { t } = useI18n()
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
            <DialogTitle>
              {mode
                ? t('mapMode.colorsTitle', { mode: t(MODE_LABEL_KEYS[mode]) })
                : t('mapMode.colorsFallbackTitle')}
            </DialogTitle>
            {mode && (
              <Button
                size="small"
                appearance="subtle"
                disabled={!hasOverrides}
                onClick={() => void resetModeOverrides(mode)}
              >
                {t('mapMode.resetMode')}
              </Button>
            )}
          </div>
          <DialogContent className={styles.dialogContent}>
            {mode === null || values.length === 0 ? (
              <Text size={100} className={styles.empty}>{t('mapMode.noValuesLoaded')}</Text>
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
            <Button appearance="primary" onClick={onClose}>{t('mapMode.close')}</Button>
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
  const { t } = useI18n()

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
          <Text size={100} weight="medium" className={styles.valueName}>{getModeValueDisplayLabel(value.key, t)}</Text>
          <Text
            size={100}
            className={mergeClasses(styles.valueSource, value.isOverride && styles.valueSourceOverride)}
          >
            {value.isOverride ? t('mapMode.valueSource.override') : t('mapMode.valueSource.default')}
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

function ModeValueEditor({ mode, value, values }: ModeValueEditorProps): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
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
          <Text size={300} weight="semibold" className={styles.valueName}>{getModeValueDisplayLabel(value.key, t)}</Text>
        </div>
        <Text
          size={100}
          className={mergeClasses(styles.valueSource, value.isOverride && styles.valueSourceOverride)}
        >
          {value.isOverride ? t('mapMode.valueSource.override') : t('mapMode.valueSource.default')}
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
            {t('mapMode.random')}
          </Button>
          <Button
            size="small"
            appearance="primary"
            disabled={!canApply}
            onClick={() => {
              if (normalized) void setOverride(mode, value.key, normalized)
            }}
          >
            {t('mapMode.apply')}
          </Button>
          <Button
            size="small"
            appearance="subtle"
            disabled={!value.isOverride}
            onClick={() => void resetOverride(mode, value.key)}
          >
            {t('mapMode.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function getModeValueDisplayLabel(valueKey: string, t: (key: MessageKey) => string): string {
  if (valueKey === 'coastal') return t('mapValue.coastal')
  if (valueKey === 'inland') return t('mapValue.inland')
  if (valueKey === 'none') return t('mapValue.none')
  return valueKey
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

