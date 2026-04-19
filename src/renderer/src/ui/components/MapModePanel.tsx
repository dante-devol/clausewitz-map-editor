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
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Select,
  Radio,
  RadioGroup,
  Slider,
  Tab,
  TabList,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
  shorthands
} from '@fluentui/react-components'
import {
  Add12Regular,
  BuildingLighthouseFilled,
  CheckmarkCircleRegular,
  ColorRegular,
  DismissRegular,
  EarthFilled,
  EditRegular,
  EyeOffRegular,
  EyeRegular,
  MoreHorizontalRegular,
  PuzzlePieceFilled,
  ReOrderDotsVerticalRegular,
  SettingsRegular,
  TreeEvergreenFilled,
  WaterFilled
} from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages/en'
import type { OverlayFilterRule, OverlayId } from '../../core/contracts/MapOverlay'
import { useDisplayModeConfigStore } from '../../infra/store/displayModeConfigStore'
import type { OverlayPanelItem } from '../hooks/useOverlayAssets'
import type { OverlayFilterRuleTemplate } from '../contracts/OverlayConfiguration'
import {
  type ConfigurableDisplayMode,
  type DisplayMode,
  type DisplayModeValueDescriptor,
  DISPLAY_MODES,
  isConfigurableDisplayMode,
  packedColorToHex
} from '../../infra/config/displayModes'

const MODE_LABEL_KEYS: Record<DisplayMode, MessageKey> = {
  provinces: 'mapMode.provinces',
  type: 'mapMode.type',
  terrain: 'mapMode.terrain',
  coastal: 'mapMode.coastal',
  continent: 'mapMode.continent'
}

const MODE_ICONS: Record<DisplayMode, JSX.Element> = {
  provinces: <PuzzlePieceFilled />,
  type: <WaterFilled />,
  terrain: <TreeEvergreenFilled />,
  coastal: <BuildingLighthouseFilled />,
  continent: <EarthFilled />
}

type PanelTab = 'display' | 'overlay'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  tabs: {
    flexShrink: 0
  },
  section: {
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
  modeLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  modeLabelIcon: {
    fontSize: '20px',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
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
  },
  overlayList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
  },
  overlayCard: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2
  },
  overlayCardDragging: {
    opacity: 0.5
  },
  overlayCardDropTarget: {
    ...shorthands.borderColor(tokens.colorBrandStroke1)
  },
  overlayTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
    flex: 1
  },
  overlayName: {
    flex: 1,
    minWidth: 0
  },
  overlayControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  overlayDragButton: {
    cursor: 'grab'
  },
  overlayDialogField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  },
  overlayDialogMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS
  },
  overlayChip: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalXS,
    maxWidth: '360px',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase200
  },
  overlayChipValue: {
    display: 'inline-block',
    color: tokens.colorNeutralForeground1,
    fontFamily: 'monospace',
    lineHeight: tokens.lineHeightBase100,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'clip'
  },
  overlayStateIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  overlayStateAvailable: {
    color: tokens.colorPaletteGreenForeground1
  },
  overlayStateUnavailable: {
    color: tokens.colorPaletteRedForeground1
  },
  overlayDialogInput: {
    width: '96px'
  },
  overlayRuleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
  },
  overlayRuleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2
  },
  overlayRuleGroupField: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
    flex: 1
  },
  overlayRuleGroupTop: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0
  },
  overlayRuleAddButton: {
    width: '16px',
    minWidth: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusCircular,
    padding: 0,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  overlayRuleGroupSelect: {
    minWidth: '160px',
    maxWidth: '220px',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    '& select': {
      minHeight: '24px',
      paddingTop: '1px',
      paddingBottom: '1px',
      fontSize: tokens.fontSizeBase200,
      lineHeight: tokens.lineHeightBase200
    }
  },
  overlayRuleColorChips: {
    display: 'flex',
    alignItems: 'center',
    alignContent: 'flex-start',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    flex: 1,
    minWidth: 0,
    maxHeight: '28px'
  },
  overlayRuleColorChip: {
    width: '14px',
    height: '14px',
    minWidth: '14px',
    borderRadius: tokens.borderRadiusCircular,
    border: '1px solid rgba(255,255,255,0.35)'
  },
  overlayRuleColorChipButton: {
    position: 'relative',
    width: '14px',
    height: '14px',
    minWidth: '14px',
    borderRadius: tokens.borderRadiusCircular,
    border: '1px solid rgba(255,255,255,0.35)',
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer'
  },
  overlayRuleColorChipRemove: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: tokens.colorNeutralForegroundOnBrand,
    opacity: 0,
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'opacity',
    transitionTimingFunction: tokens.curveEasyEase
  },
  overlayRuleColorChipButtonHover: {
    ':hover > span': {
      opacity: 1
    }
  },
  overlayRuleColorChipAdd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    minWidth: '14px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: 0,
    cursor: 'pointer'
  },
  overlayRuleColorChipAddIcon: {
    fontSize: '12px',
    lineHeight: 1
  },
  overlayRuleColorChipOverflow: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    minWidth: '14px',
    height: '14px'
  },
  overlayRuleColorChipOverflowIcon: {
    fontSize: '12px',
    lineHeight: 1
  },
  overlayRuleToken: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    minHeight: '28px',
    padding: `5px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground3
  },
  overlayRuleTokenButton: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
      color: tokens.colorNeutralForeground2
    }
  },
  overlayRuleTokenActive: {
    color: tokens.colorNeutralForeground1,
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2
  },
  overlayRuleOverrideControl: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minHeight: '28px',
    padding: `5px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground3,
    minWidth: 0,
    maxWidth: '220px'
  },
  overlayRuleOverrideButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer'
  },
  overlayRuleOverrideSwatchWrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '12px',
    height: '12px'
  },
  overlayRuleOverrideHoverIcon: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: tokens.colorNeutralForegroundOnBrand,
    opacity: 0,
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'opacity',
    transitionTimingFunction: tokens.curveEasyEase,
    pointerEvents: 'none'
  },
  overlayRuleOverrideButtonHover: {
    ':hover > span > span': {
      opacity: 1
    }
  },
  overlayColorPopoverActions: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  overlayColorPopoverPrimaryAction: {
    minWidth: 0
  },
  overlayColorPopoverPrimaryButton: {
    width: '100%'
  },
  overlayColorPopoverSpacer: {
    width: '28px',
    height: '28px',
    flexShrink: 0
  },
  overlayRuleVisibilityPopover: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalXS,
    minWidth: '220px'
  },
  overlayRuleVisibilityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  overlayRuleVisibilitySlider: {
    flex: 1
  },
  overlayRuleVisibilityInput: {
    width: '72px'
  },
  overlayRuleTokenText: {
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100
  },
  overlayRuleColorSwatch: {
    width: '14px',
    height: '14px',
    borderRadius: tokens.borderRadiusCircular,
    border: '1px solid rgba(255,255,255,0.35)'
  },
  overlayRuleActions: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0
  },
  overlayColorPopoverContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalXS
  }
})

interface Props {
  mode: DisplayMode
  onModeChange: (mode: DisplayMode) => void
  valuesByMode: Partial<Record<ConfigurableDisplayMode, DisplayModeValueDescriptor[]>>
  overlays: OverlayPanelItem[]
  onOverlayMove: (draggedId: OverlayId, targetId: OverlayId) => void
  onOverlayVisibilityChange: (overlayId: OverlayId, visible: boolean) => void
  onOverlayOpacityChange: (overlayId: OverlayId, opacity: number) => void
  onOverlayFilterRulesChange: (overlayId: OverlayId, rules: OverlayFilterRule[]) => void
}

export function MapModePanel({
  mode,
  onModeChange,
  valuesByMode,
  overlays,
  onOverlayMove,
  onOverlayVisibilityChange,
  onOverlayOpacityChange,
  onOverlayFilterRulesChange
}: Props): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<PanelTab>('display')
  const [dialogMode, setDialogMode] = useState<ConfigurableDisplayMode | null>(null)
  const [overlayDialogId, setOverlayDialogId] = useState<OverlayId | null>(null)
  const [draggedOverlayId, setDraggedOverlayId] = useState<OverlayId | null>(null)
  const [dropTargetOverlayId, setDropTargetOverlayId] = useState<OverlayId | null>(null)
  const [initializedOverlayDefaults, setInitializedOverlayDefaults] = useState<OverlayId[]>([])

  const activeValues = dialogMode ? (valuesByMode[dialogMode] ?? []) : []
  const selectedOverlay = overlays.find((overlay) => overlay.id === overlayDialogId) ?? null

  function openOverlayDialog(overlay: OverlayPanelItem) {
    const hasDefaults = (overlay.configuration.defaultFilterRules?.length ?? 0) > 0
    const alreadyInitialized = initializedOverlayDefaults.includes(overlay.id)

    if (!alreadyInitialized) {
      setInitializedOverlayDefaults((current) => (
        current.includes(overlay.id) ? current : [...current, overlay.id]
      ))
    }

    if (!alreadyInitialized && overlay.filterRules.length === 0 && hasDefaults) {
      onOverlayFilterRulesChange(overlay.id, createOverlayFilterRulesFromTemplates(
        overlay.configuration.defaultFilterRules ?? []
      ))
    }

    setOverlayDialogId(overlay.id)
  }

  return (
    <>
      <div className={styles.root}>
        <TabList
          className={styles.tabs}
          selectedValue={activeTab}
          onTabSelect={(_, data) => setActiveTab(data.value as PanelTab)}
        >
          <Tab value="display">{t('mapMode.title')}</Tab>
          <Tab value="overlay">{t('overlay.title')}</Tab>
        </TabList>

        {activeTab === 'display' ? (
          <div className={styles.section}>
            <RadioGroup
              value={mode}
              layout="vertical"
              onChange={(_, data) => onModeChange(data.value as DisplayMode)}
            >
              <div className={styles.modeList}>
                {DISPLAY_MODES.map((entryMode) => {
                  const configurable = isConfigurableDisplayMode(entryMode)
                  const modeLabel = t(MODE_LABEL_KEYS[entryMode])
                  return (
                    <div key={entryMode} className={styles.modeRow}>
                      <Radio
                        className={styles.modeRadio}
                        value={entryMode}
                        label={(
                          <span className={styles.modeLabel}>
                            <span className={styles.modeLabelIcon}>
                              {MODE_ICONS[entryMode]}
                            </span>
                            <span>{modeLabel}</span>
                          </span>
                        )}
                      />
                      {configurable && (
                        <Button
                          className={styles.iconButton}
                          appearance="subtle"
                          size="small"
                          icon={<SettingsRegular />}
                          aria-label={t('mapMode.configureColors', { mode: modeLabel })}
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
        ) : (
          <div className={styles.section}>
            <div className={styles.overlayList}>
              {overlays.map((overlay) => {
                return (
                  <div
                    key={overlay.id}
                    className={mergeClasses(
                      styles.overlayCard,
                      draggedOverlayId === overlay.id && styles.overlayCardDragging,
                      dropTargetOverlayId === overlay.id && styles.overlayCardDropTarget
                    )}
                    onDragOver={(event) => {
                      if (!draggedOverlayId || draggedOverlayId === overlay.id) return
                      event.preventDefault()
                      setDropTargetOverlayId(overlay.id)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (draggedOverlayId && draggedOverlayId !== overlay.id) {
                        onOverlayMove(draggedOverlayId, overlay.id)
                      }
                      setDraggedOverlayId(null)
                      setDropTargetOverlayId(null)
                    }}
                  >
                    <div className={styles.overlayTitleRow}>
                      <Tooltip content={t('overlay.dragToReorder')} relationship="label">
                        <Button
                          draggable
                          appearance="subtle"
                          size="small"
                          className={styles.overlayDragButton}
                          icon={<ReOrderDotsVerticalRegular />}
                          aria-label={t('overlay.dragToReorder')}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move'
                            setDraggedOverlayId(overlay.id)
                            setDropTargetOverlayId(null)
                          }}
                          onDragEnd={() => {
                            setDraggedOverlayId(null)
                            setDropTargetOverlayId(null)
                          }}
                        />
                      </Tooltip>
                      <Text size={300} weight="semibold" className={styles.overlayName}>{t(overlay.labelKey)}</Text>
                    </div>
                    <div className={styles.overlayControls}>
                      <Tooltip content={overlay.visible ? t('overlay.hide') : t('overlay.show')} relationship="label">
                        <Button
                          appearance={overlay.visible ? 'primary' : 'subtle'}
                          size="small"
                          icon={overlay.visible ? <EyeRegular /> : <EyeOffRegular />}
                          aria-label={overlay.visible ? t('overlay.hide') : t('overlay.show')}
                          onClick={() => onOverlayVisibilityChange(overlay.id, !overlay.visible)}
                        />
                      </Tooltip>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<SettingsRegular />}
                        aria-label={t('overlay.options')}
                        onClick={() => openOverlayDialog(overlay)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ModeConfigDialog
        mode={dialogMode}
        values={activeValues}
        onClose={() => setDialogMode(null)}
      />

      <OverlayOptionsDialog
        overlay={selectedOverlay}
        onOverlayOpacityChange={onOverlayOpacityChange}
        onOverlayFilterRulesChange={onOverlayFilterRulesChange}
        onClose={() => setOverlayDialogId(null)}
      />
    </>
  )
}

interface OverlayOptionsDialogProps {
  overlay: OverlayPanelItem | null
  onOverlayOpacityChange: (overlayId: OverlayId, opacity: number) => void
  onOverlayFilterRulesChange: (overlayId: OverlayId, rules: OverlayFilterRule[]) => void
  onClose: () => void
}

function OverlayOptionsDialog({
  overlay,
  onOverlayOpacityChange,
  onOverlayFilterRulesChange,
  onClose
}: OverlayOptionsDialogProps): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  return (
    <Dialog open={overlay !== null} onOpenChange={(_, data) => { if (!data.open) onClose() }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {overlay ? t('overlay.optionsTitle', { overlay: t(overlay.labelKey) }) : t('overlay.options')}
          </DialogTitle>
          <DialogContent>
            <div className={styles.section}>
              {overlay && (
                <>
                  <div className={styles.overlayDialogMeta}>
                    <div className={styles.overlayChip}>
                      <Text size={100}>{t('overlay.configPathLabelShort')}</Text>
                      <span className={styles.overlayChipValue}>{formatPathChipValue(overlay.configPath)}</span>
                    </div>
                    <div className={styles.overlayChip}>
                      <Text size={100}>{t('overlay.resolvedPathLabelShort')}</Text>
                      <span className={styles.overlayChipValue}>
                        {overlay.resolvedPath ? formatPathChipValue(overlay.resolvedPath) : t('overlay.notResolved')}
                      </span>
                    </div>
                    <div className={styles.overlayChip}>
                      <span
                        className={mergeClasses(
                          styles.overlayStateIcon,
                          overlay.resolvedPath ? styles.overlayStateAvailable : styles.overlayStateUnavailable
                        )}
                      >
                        {overlay.resolvedPath ? <CheckmarkCircleRegular /> : <DismissRegular />}
                      </span>
                    </div>
                  </div>

                  <div className={styles.overlayDialogField}>
                    <Text size={100}>{t('overlay.opacity')}</Text>
                    <Input
                      size="small"
                      className={styles.overlayDialogInput}
                      value={String(overlay.opacity)}
                      contentAfter="%"
                      onChange={(_, data) => {
                        const digits = data.value.replace(/[^\d]/g, '').slice(0, 3)
                        if (digits === '') {
                          onOverlayOpacityChange(overlay.id, 0)
                          return
                        }
                        const parsed = Number.parseInt(digits, 10)
                        onOverlayOpacityChange(overlay.id, Math.max(0, Math.min(100, parsed)))
                      }}
                    />
                  </div>

                  <div className={styles.overlayDialogField}>
                    <div className={styles.overlayRuleGroupTop}>
                      <Text size={200} weight="semibold">{t('overlay.filterRules')}</Text>
                      <Button
                        size="small"
                        appearance="secondary"
                        className={styles.overlayRuleAddButton}
                        icon={<Add12Regular />}
                        aria-label={t('overlay.addRule')}
                        onClick={() => onOverlayFilterRulesChange(overlay.id, [
                          ...overlay.filterRules,
                          createDefaultOverlayFilterRule(overlay)
                        ])}
                      />
                    </div>
                    {overlay.filterRules.length === 0 ? (
                      <Text size={100}>{t('overlay.noRules')}</Text>
                    ) : (
                      <div className={styles.overlayRuleList}>
                        {overlay.filterRules.map((rule) => (
                          <div key={rule.id} className={styles.overlayRuleRow}>
                            <div className={styles.overlayRuleGroupField}>
                              <div className={styles.overlayRuleGroupTop}>
                                <Select
                                  className={styles.overlayRuleGroupSelect}
                                  value={rule.target.kind === 'group' ? rule.target.groupId : '__custom__'}
                                  onChange={(_, data) => {
                                    const value = data.value
                                    const nextTarget = value === '__custom__'
                                      ? { kind: 'custom' as const, colors: [] }
                                      : { kind: 'group' as const, groupId: value }
                                    onOverlayFilterRulesChange(
                                      overlay.id,
                                      overlay.filterRules.map((candidate) => (
                                        candidate.id === rule.id ? { ...candidate, target: nextTarget } : candidate
                                      ))
                                    )
                                  }}
                                >
                                  {overlay.configuration.groups.map((group) => (
                                    <option key={group.id} value={group.id}>{group.label}</option>
                                  ))}
                                  <option value="__custom__">{t('overlay.targetCustom')}</option>
                                </Select>
                                <RuleColorChips
                                  overlay={overlay}
                                  rule={rule}
                                  onChangeRules={(rules) => onOverlayFilterRulesChange(overlay.id, rules)}
                                />
                              </div>
                            </div>

                            <div className={styles.overlayRuleActions}>
                              <OverlayRuleColorOverrideControl
                                color={rule.color}
                                initialColor={getDefaultRuleOverrideColor(rule, overlay)}
                                onChangeColor={(color) => onOverlayFilterRulesChange(
                                  overlay.id,
                                  overlay.filterRules.map((candidate) => (
                                    candidate.id === rule.id ? { ...candidate, color } : candidate
                                  ))
                                )}
                                onClear={() => onOverlayFilterRulesChange(
                                  overlay.id,
                                  overlay.filterRules.map((candidate) => (
                                    candidate.id === rule.id ? { ...candidate, color: null } : candidate
                                  ))
                                )}
                              />
                              <OverlayRuleVisibilityControl
                                visible={rule.visible}
                                opacity={rule.opacity}
                                onChange={(next) => onOverlayFilterRulesChange(
                                  overlay.id,
                                  overlay.filterRules.map((candidate) => (
                                    candidate.id === rule.id ? { ...candidate, ...next } : candidate
                                  ))
                                )}
                              />
                              <Button
                                size="small"
                                appearance="subtle"
                                icon={<DismissRegular />}
                                aria-label={t('overlay.removeRule')}
                                onClick={() => onOverlayFilterRulesChange(
                                  overlay.id,
                                  overlay.filterRules.filter((candidate) => candidate.id !== rule.id)
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>{t('mapMode.close')}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

function createDefaultOverlayFilterRule(overlay: OverlayPanelItem): OverlayFilterRule {
  return {
    id: crypto.randomUUID(),
    target: {
      kind: 'group',
      groupId: overlay.configuration.groups[0]?.id ?? 'group'
    },
    visible: true,
    opacity: 100,
    color: null
  }
}

function createOverlayFilterRulesFromTemplates(templates: OverlayFilterRuleTemplate[]): OverlayFilterRule[] {
  return templates.map((template) => ({
    id: crypto.randomUUID(),
    target: template.target.kind === 'group'
      ? {
        kind: 'group',
        groupId: template.target.groupId
      }
      : {
        kind: 'custom',
        colors: [...template.target.colors]
      },
    visible: template.visible ?? true,
    opacity: template.opacity ?? 100,
    color: template.color ?? null
  }))
}

function formatPathChipValue(path: string): string {
  const separator = path.includes('\\') ? '\\' : '/'
  const rawSegments = path.split(/[\\/]+/).filter(Boolean)
  if (rawSegments.length <= 4) return path

  const hasWindowsDrive = /^[A-Za-z]:/.test(rawSegments[0] ?? '')
  const hasLeadingSlash = path.startsWith('/') || path.startsWith('\\')

  const head = hasWindowsDrive
    ? rawSegments[0]
    : hasLeadingSlash
      ? separator
      : rawSegments[0]
  const tailSegments = rawSegments.slice(-3)

  if (hasWindowsDrive) {
    return `${head}${separator}...${separator}${tailSegments.join(separator)}`
  }

  if (hasLeadingSlash) {
    return `${separator}...${separator}${tailSegments.join(separator)}`
  }

  return `${head}${separator}...${separator}${tailSegments.join(separator)}`
}

function RuleColorChips({
  overlay,
  rule,
  onChangeRules
}: {
  overlay: OverlayPanelItem
  rule: OverlayFilterRule
  onChangeRules: (rules: OverlayFilterRule[]) => void
}): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const colors = getRuleColors(rule, overlay)
  const [addPopoverOpen, setAddPopoverOpen] = useState(false)
  const visibleColors = colors.slice(0, 9)

  return (
    <div className={styles.overlayRuleColorChips}>
      {rule.target.kind === 'custom' && (
        <Popover open={addPopoverOpen} onOpenChange={(_, data) => setAddPopoverOpen(data.open)} positioning="below-start">
          <PopoverTrigger disableButtonEnhancement>
            <button type="button" className={styles.overlayRuleColorChipAdd} aria-label={t('overlay.addColor')}>
              <Add12Regular className={styles.overlayRuleColorChipAddIcon} />
            </button>
          </PopoverTrigger>
          <PopoverSurface>
            <CustomOverlayColorPopover
              onAddColor={(color) => onChangeRules(
                overlay.filterRules.map((candidate) => (
                  candidate.id === rule.id && candidate.target.kind === 'custom'
                    ? {
                      ...candidate,
                      target: {
                        kind: 'custom',
                        colors: candidate.target.colors.includes(color)
                          ? candidate.target.colors
                          : [...candidate.target.colors, color]
                      }
                    }
                    : candidate
                ))
              )}
              onDone={() => setAddPopoverOpen(false)}
            />
          </PopoverSurface>
        </Popover>
      )}

      {visibleColors.map((color) => (
        rule.target.kind === 'custom' ? (
          <button
            key={color}
            type="button"
            className={mergeClasses(styles.overlayRuleColorChipButton, styles.overlayRuleColorChipButtonHover)}
            style={{ backgroundColor: color }}
            onClick={() => onChangeRules(
              overlay.filterRules.map((candidate) => (
                candidate.id === rule.id && candidate.target.kind === 'custom'
                  ? {
                    ...candidate,
                    target: {
                      kind: 'custom',
                      colors: candidate.target.colors.filter((entry) => entry !== color)
                    }
                  }
                  : candidate
              ))
            )}
          >
            <span className={styles.overlayRuleColorChipRemove}>
              <DismissRegular fontSize={10} />
            </span>
          </button>
        ) : (
          <span key={color} className={styles.overlayRuleColorChip} style={{ backgroundColor: color }} />
        )
      ))}
      {colors.length > 9 && (
        <span className={styles.overlayRuleColorChipOverflow}>
          <MoreHorizontalRegular className={styles.overlayRuleColorChipOverflowIcon} />
        </span>
      )}
    </div>
  )
}

function getDefaultRuleOverrideColor(rule: OverlayFilterRule, overlay: OverlayPanelItem): string {
  return getRuleColors(rule, overlay)[0] ?? '#ffffff'
}

function getRuleColors(rule: OverlayFilterRule, overlay: OverlayPanelItem): string[] {
  if (rule.target.kind === 'custom') return rule.target.colors
  return overlay.configuration.groups.find((group) => group.id === rule.target.groupId)?.colors ?? []
}

function OverlayRuleColorOverrideControl({
  color,
  initialColor,
  onChangeColor,
  onClear
}: {
  color: string | null
  initialColor: string
  onChangeColor: (color: string) => void
  onClear: () => void
}): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [popoverOpen, setPopoverOpen] = useState(false)

  return (
    <div
      className={mergeClasses(
        styles.overlayRuleOverrideControl,
        color && styles.overlayRuleTokenActive
      )}
    >
      <Popover open={popoverOpen} onOpenChange={(_, data) => setPopoverOpen(data.open)} positioning="below-start">
        <PopoverTrigger disableButtonEnhancement>
          <button
            type="button"
            className={mergeClasses(styles.overlayRuleOverrideButton, color && styles.overlayRuleOverrideButtonHover)}
            aria-label={t('overlay.ruleColorOverride')}
          >
            <ColorRegular />
            {color && (
              <span className={styles.overlayRuleOverrideSwatchWrap}>
                <span className={styles.overlayRuleColorSwatch} style={{ backgroundColor: color }} />
                <span className={styles.overlayRuleOverrideHoverIcon}>
                  <EditRegular fontSize={10} />
                </span>
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverSurface>
          <CustomOverlayColorPopover
            initialColor={color ?? initialColor}
            actionLabel={color ? t('overlay.editColorOverride') : t('overlay.addColorOverride')}
            onAddColor={onChangeColor}
            onClear={color ? onClear : undefined}
            onDone={() => setPopoverOpen(false)}
          />
        </PopoverSurface>
      </Popover>
    </div>
  )
}

function OverlayRuleVisibilityControl({
  visible,
  opacity,
  onChange
}: {
  visible: boolean
  opacity: number
  onChange: (next: { visible: boolean; opacity: number }) => void
}): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const clampedOpacity = Math.max(0, Math.min(100, opacity))

  return (
    <Popover open={popoverOpen} onOpenChange={(_, data) => setPopoverOpen(data.open)} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <button
          type="button"
          className={mergeClasses(
            styles.overlayRuleToken,
            styles.overlayRuleTokenButton,
            (!visible || clampedOpacity !== 100) && styles.overlayRuleTokenActive
          )}
          aria-label={visible ? t('overlay.visible') : t('overlay.hidden')}
        >
          {visible ? <EyeRegular /> : <EyeOffRegular />}
          {visible && clampedOpacity !== 100 && (
            <span className={styles.overlayRuleTokenText}>{clampedOpacity}%</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverSurface>
        <div className={styles.overlayRuleVisibilityPopover}>
          <div className={styles.overlayRuleVisibilityRow}>
            <Button
              size="small"
              appearance={visible ? 'primary' : 'subtle'}
              icon={visible ? <EyeRegular /> : <EyeOffRegular />}
              aria-label={visible ? t('overlay.visible') : t('overlay.hidden')}
              onClick={() => onChange({ visible: !visible, opacity: clampedOpacity })}
            />
            {visible && (
              <>
                <Slider
                  className={styles.overlayRuleVisibilitySlider}
                  min={0}
                  max={100}
                  step={1}
                  value={clampedOpacity}
                  onChange={(_, data) => onChange({ visible: true, opacity: data.value })}
                />
                <Input
                  size="small"
                  className={styles.overlayRuleVisibilityInput}
                  value={String(clampedOpacity)}
                  contentAfter="%"
                  onChange={(_, data) => {
                    const digits = data.value.replace(/[^\d]/g, '').slice(0, 3)
                    if (digits === '') {
                      onChange({ visible: true, opacity: 0 })
                      return
                    }
                    const parsed = Number.parseInt(digits, 10)
                    onChange({ visible: true, opacity: Math.max(0, Math.min(100, parsed)) })
                  }}
                />
              </>
            )}
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  )
}

function CustomOverlayColorPopover({
  initialColor,
  actionLabel,
  onAddColor,
  onClear,
  onDone
}: {
  initialColor?: string
  actionLabel?: string
  onAddColor: (color: string) => void
  onClear?: () => void
  onDone: () => void
}): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const baseColor = normalizeHexCandidate(initialColor ?? '#ffffff') ?? '#ffffff'
  const [draft, setDraft] = useState(baseColor)
  const [pickerColor, setPickerColor] = useState<HsvColor>(() => hexToHsv(baseColor))

  useEffect(() => {
    const normalized = normalizeHexCandidate(initialColor ?? '#ffffff') ?? '#ffffff'
    setDraft(normalized)
    setPickerColor(hexToHsv(normalized))
  }, [initialColor])

  return (
    <div className={styles.overlayColorPopoverContent}>
      <ColorPicker
        color={pickerColor}
        onColorChange={(_, data) => {
          setPickerColor({ ...data.color, a: data.color.a ?? 1 })
          setDraft(hsvToHex(data.color))
        }}
      >
        <ColorArea className={styles.pickerArea} />
        <ColorSlider />
      </ColorPicker>
      <Input
        size="small"
        value={draft}
        onChange={(_, data) => {
          setDraft(data.value)
          const next = normalizeHexCandidate(data.value)
          if (next) setPickerColor(hexToHsv(next))
        }}
      />
      <div className={styles.overlayColorPopoverActions}>
        <div className={styles.overlayColorPopoverPrimaryAction}>
          <Button
            size="small"
            appearance="primary"
            className={styles.overlayColorPopoverPrimaryButton}
            onClick={() => {
              const normalized = normalizeHexCandidate(draft)
              if (normalized) {
                onAddColor(normalized)
                onDone()
              }
            }}
          >
            {actionLabel ?? t('overlay.addColor')}
          </Button>
        </div>
        <div>
          {onClear && (
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissRegular />}
              aria-label={t('overlay.hidden')}
              onClick={() => {
                onClear()
                onDone()
              }}
            />
          )}
          {!onClear && <div className={styles.overlayColorPopoverSpacer} />}
        </div>
      </div>
    </div>
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

type HsvColor = {
  h: number
  s: number
  v: number
  a?: number
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
