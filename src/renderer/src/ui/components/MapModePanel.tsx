import { useEffect, useState } from 'react'
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
  Input,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Select,
  Slider,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
  shorthands
} from '@fluentui/react-components'
import {
  Add12Regular,
  CheckmarkCircleRegular,
  ColorRegular,
  DismissRegular,
  EditRegular,
  EyeOffRegular,
  EyeRegular,
  MoreHorizontalRegular,
  ReOrderDotsVerticalRegular,
  SettingsRegular
} from '@fluentui/react-icons'
import { useI18n } from '../i18n/I18nProvider'
import type { OverlayFilterRule, OverlayId } from '../../core/contracts/MapOverlay'
import { type HsvColor, normalizeHexCandidate, hexToHsv, hsvToHex } from '../lib/colorUtils'
import { useOverlayPanelState } from '../hooks/useOverlayPanelState'
import { usePanelOverlays } from '../hooks/useOverlayAssets'
import { useCoreStore } from '../../infra/store/coreStore'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  title: {
    color: tokens.colorNeutralForeground2
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

export function MapModePanel(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()
  const overlays = usePanelOverlays()
  const onOverlayMove = useCoreStore((s) => s.moveOverlay)
  const onOverlayVisibilityChange = useCoreStore((s) => s.setOverlayVisibility)
  const onOverlayOpacityChange = useCoreStore((s) => s.setOverlayOpacity)
  const onOverlayFilterRulesChange = useCoreStore((s) => s.setOverlayFilterRules)
  const onOverlayLineColorChange = useCoreStore((s) => s.setOverlayLineColor)
  const {
    overlayDialogId,
    draggedOverlayId,
    dropTargetOverlayId,
    setOverlayDialogId,
    setDraggedOverlayId,
    setDropTargetOverlayId,
    openOverlayDialog
  } = useOverlayPanelState(overlays, onOverlayFilterRulesChange)

  const selectedOverlay = overlays.find((overlay) => overlay.id === overlayDialogId) ?? null

  return (
    <>
      <div className={styles.root}>
        <div className={styles.section}>
          <Text size={300} weight="semibold" className={styles.title}>{t('overlay.title')}</Text>
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
      </div>

      <OverlayOptionsDialog
        overlay={selectedOverlay}
        onOverlayOpacityChange={onOverlayOpacityChange}
        onOverlayFilterRulesChange={onOverlayFilterRulesChange}
        onOverlayLineColorChange={onOverlayLineColorChange}
        onClose={() => setOverlayDialogId(null)}
      />
    </>
  )
}

interface OverlayOptionsDialogProps {
  overlay: OverlayPanelItem | null
  onOverlayOpacityChange: (overlayId: OverlayId, opacity: number) => void
  onOverlayFilterRulesChange: (overlayId: OverlayId, rules: OverlayFilterRule[]) => void
  onOverlayLineColorChange: (overlayId: OverlayId, lineColor: string) => void
  onClose: () => void
}

function OverlayOptionsDialog({
  overlay,
  onOverlayOpacityChange,
  onOverlayFilterRulesChange,
  onOverlayLineColorChange,
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
                  {overlay.kind === 'bitmap' && (
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
                  )}

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

                  {overlay.kind === 'bitmap' ? (
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
                  ) : (
                    <div className={styles.overlayDialogField}>
                      <Text size={200} weight="semibold">{t('overlay.lineColor')}</Text>
                      <OverlayRuleColorOverrideControl
                        color={overlay.lineColor}
                        initialColor={overlay.lineColor}
                        onChangeColor={(color) => onOverlayLineColorChange(overlay.id, color)}
                      />
                    </div>
                  )}
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

function createDefaultOverlayFilterRule(overlay: Extract<OverlayPanelItem, { kind: 'bitmap' }>): OverlayFilterRule {
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
  overlay: Extract<OverlayPanelItem, { kind: 'bitmap' }>
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

function getDefaultRuleOverrideColor(
  rule: OverlayFilterRule,
  overlay: Extract<OverlayPanelItem, { kind: 'bitmap' }>
): string {
  return getRuleColors(rule, overlay)[0] ?? '#ffffff'
}

function getRuleColors(rule: OverlayFilterRule, overlay: Extract<OverlayPanelItem, { kind: 'bitmap' }>): string[] {
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

