import { useState, useMemo } from 'react'
import {
  Button,
  Combobox,
  Input,
  Option,
  Select,
  makeStyles,
  tokens,
  Text
} from '@fluentui/react-components'
import {
  AddRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  DismissRegular
} from '@fluentui/react-icons'
import { useI18n } from '../../i18n/I18nProvider'
import { useMapDataStore } from '../../../infra/store/mapDataStore'
import { applyStatePatch, type StateEditPatch } from '../../../infra/store/slices/stateEditSlice'
import type {
  DateHistory,
  GenericEffect,
  HistoryDef,
  ProvinceBuildingDefinition,
  StateBuildingDefinition,
  StateHistory,
  VictoryPoint
} from '../../../../../shared/mapDataTypes'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground2,
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`
  },
  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0
  },
  headerTitle: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2
  },
  headerPath: {
    flex: 1,
    color: tokens.colorNeutralForeground4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase100,
    direction: 'rtl',
    textAlign: 'left'
  },
  // Required fields area
  requiredFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0
  },
  fieldLabel: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    width: '72px'
  },
  fieldInput: {
    flex: 1,
    minWidth: 0
  },
  fieldSelect: {
    flex: 1,
    minWidth: 0
  },
  // Collapsible section
  sectionContainer: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    cursor: 'pointer',
    userSelect: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground3 }
  },
  sectionChevron: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  sectionTitle: {
    flex: 1,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: tokens.fontSizeBase100
  },
  sectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `0 ${tokens.spacingHorizontalS}`,
    paddingBottom: tokens.spacingVerticalXS
  },
  // Sub-section (nested history block)
  subSection: {
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    marginTop: tokens.spacingVerticalXXS
  },
  subSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    padding: `${tokens.spacingVerticalXXS} 0`,
    cursor: 'pointer',
    userSelect: 'none'
  },
  subSectionTitle: {
    flex: 1,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase100,
    fontFamily: 'monospace'
  },
  subSectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS
  },
  // Chips
  chipRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS
  },
  chipRowWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXS,
    alignItems: 'center',
    paddingBottom: tokens.spacingVerticalXXS
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `2px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    minWidth: 0
  },
  chipKey: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0
  },
  chipValue: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold
  },
  chipOwner: {
    borderColor: tokens.colorPaletteBlueBorder2,
    backgroundColor: tokens.colorPaletteBlueBackground2
  },
  chipCore: {
    borderColor: tokens.colorPaletteGreenBorder2,
    backgroundColor: tokens.colorPaletteGreenBackground2
  },
  chipEffect: {
    borderColor: tokens.colorPaletteYellowBorder2,
    backgroundColor: tokens.colorPaletteYellowBackground2
  },
  chipDismiss: {
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    fontSize: '10px',
    lineHeight: 1,
    ':hover': { color: tokens.colorNeutralForeground1 }
  },
  // List sub-sections within a history block
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  },
  historyListLabel: {
    color: tokens.colorNeutralForeground4,
    fontSize: tokens.fontSizeBase100,
    paddingTop: tokens.spacingVerticalXXS
  },
  historyListRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS
  },
  historyListKey: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  historyListInput: {
    width: '56px'
  },
  removeBtn: {
    flexShrink: 0
  },
  // Province chips
  provinceChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: `1px ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100
  },
  // Add forms
  addFormRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    paddingTop: tokens.spacingVerticalXXS
  },
  addFormInput: {
    flex: 1,
    minWidth: 0
  },
  emptyText: {
    color: tokens.colorNeutralForeground4,
    fontStyle: 'italic',
    fontSize: tokens.fontSizeBase100
  }
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AddFormKind =
  | { kind: 'resource'; type: string; amount: string }
  | { kind: 'province'; value: string }
  | { kind: 'chipAdd'; target: 'base' | number; key: string; value: string }
  | { kind: 'vp'; target: 'base' | number; province: string; value: string }
  | { kind: 'building'; target: 'base' | number; buildingType: string; province: string; amount: string }
  | { kind: 'dateEntry'; year: string; month: string; day: string }
  | null

const CHIP_SUGGESTIONS = ['owner', 'add_core_of', 'add_claim_by'] as const
const TAG_KEYS = new Set<string>(['owner', 'add_core_of', 'add_claim_by'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyHistoryDef(): HistoryDef {
  return { coreOf: [], buildings: [], victoryPoints: [], effects: [] }
}

function sortedChips(def: HistoryDef): Array<{ kind: 'owner'; tag: string } | { kind: 'core'; tag: string } | { kind: 'effect'; key: string; value: string }> {
  const chips: ReturnType<typeof sortedChips> = []
  if (def.owner) chips.push({ kind: 'owner', tag: def.owner })
  for (const tag of [...def.coreOf].sort()) chips.push({ kind: 'core', tag })
  for (const e of [...def.effects].sort((a, b) => a.key.localeCompare(b.key))) chips.push({ kind: 'effect', key: e.key, value: e.value })
  return chips
}

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
  id: string
  title: string
  expanded: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
  styles: ReturnType<typeof useStyles>
}

function CollapsibleSection({ id: _id, title, expanded, onToggle, action, children, styles }: CollapsibleSectionProps): JSX.Element {
  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader} onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}>
        {expanded
          ? <ChevronDownRegular fontSize={12} className={styles.sectionChevron} />
          : <ChevronRightRegular fontSize={12} className={styles.sectionChevron} />
        }
        <Text size={100} className={styles.sectionTitle}>{title}</Text>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
      </div>
      {expanded && (
        <div className={styles.sectionBody}>{children}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistoryBlock — renders one HistoryDef (base or date entry)
// ---------------------------------------------------------------------------

interface HistoryBlockProps {
  def: HistoryDef
  target: 'base' | number
  onChange: (next: HistoryDef) => void
  addForm: AddFormKind
  setAddForm: (f: AddFormKind) => void
  buildingTypeList: string[]
  styles: ReturnType<typeof useStyles>
  t: (key: string, params?: Record<string, unknown>) => string
}

function HistoryBlock({ def, target, onChange, addForm, setAddForm, buildingTypeList, styles, t }: HistoryBlockProps): JSX.Element {
  const [vpOpen, setVpOpen] = useState(false)
  const [buildingsOpen, setBuildingsOpen] = useState(false)

  const chips = sortedChips(def)
  const isTarget = addForm !== null && 'target' in addForm && addForm.target === target
  const isChipAddOpen = isTarget && addForm?.kind === 'chipAdd'
  const isVpAddOpen = isTarget && addForm?.kind === 'vp'
  const isBuildingAddOpen = isTarget && addForm?.kind === 'building'

  const setOwner = (owner: string | undefined) => onChange({ ...def, owner })
  const setCores = (coreOf: string[]) => onChange({ ...def, coreOf })
  const setVPs = (victoryPoints: VictoryPoint[]) => onChange({ ...def, victoryPoints })
  const setBuildings = (buildings: (StateBuildingDefinition | ProvinceBuildingDefinition)[]) => onChange({ ...def, buildings })
  const setEffects = (effects: GenericEffect[]) => onChange({ ...def, effects })

  const commitChipAdd = () => {
    if (!addForm || addForm.kind !== 'chipAdd' || addForm.target !== target) return
    const k = addForm.key.trim()
    const v = addForm.value.trim()
    if (!k) return
    if (k === 'owner') {
      setOwner(v.slice(0, 3).toUpperCase())
    } else if (k === 'add_core_of') {
      const tag = v.slice(0, 3).toUpperCase()
      if (tag && !def.coreOf.includes(tag)) setCores([...def.coreOf, tag])
    } else {
      setEffects([...def.effects.filter((e) => e.key !== k), { key: k, value: v }])
    }
    setAddForm(null)
  }

  const commitVp = () => {
    if (!addForm || addForm.kind !== 'vp' || addForm.target !== target) return
    const province = parseInt(addForm.province, 10)
    const value = parseInt(addForm.value, 10)
    if (isNaN(province) || isNaN(value)) return
    setVPs([...def.victoryPoints.filter((v) => v.province !== province), { province, value }])
    setAddForm(null)
  }

  const commitBuilding = () => {
    if (!addForm || addForm.kind !== 'building' || addForm.target !== target) return
    const amount = parseInt(addForm.amount, 10)
    if (!addForm.buildingType.trim() || isNaN(amount) || amount < 1) return
    const prov = addForm.province.trim() ? parseInt(addForm.province, 10) : undefined
    if (addForm.province.trim() && isNaN(prov!)) return
    const entry = prov !== undefined
      ? { type: addForm.buildingType.trim(), amount, province: prov } as ProvinceBuildingDefinition
      : { type: addForm.buildingType.trim(), amount } as StateBuildingDefinition
    setBuildings([...def.buildings, entry])
    setAddForm(null)
  }

  const valuePlaceholder = (isChipAddOpen && addForm?.kind === 'chipAdd' && TAG_KEYS.has(addForm.key))
    ? 'TAG' : t('statePanel.add.effectValue')

  return (
    <div>
      {/* Chip pool */}
      {chips.length > 0 && (
        <div className={styles.chipRow}>
          {chips.map((chip, i) => {
            if (chip.kind === 'owner') {
              return (
                <span key={`owner-${i}`} className={`${styles.chip} ${styles.chipOwner}`}>
                  <span className={styles.chipKey}>{t('statePanel.chip.owner')}:</span>
                  {def.owner !== undefined
                    ? <Input
                        size="small"
                        style={{ width: '36px', minWidth: 0, padding: 0, border: 'none', background: 'transparent', fontFamily: 'monospace', fontSize: 'inherit', fontWeight: tokens.fontWeightSemibold }}
                        value={def.owner}
                        maxLength={3}
                        onChange={(_, d) => setOwner(d.value.toUpperCase() || '')}
                      />
                    : null
                  }
                  <span role="button" tabIndex={0} className={styles.chipDismiss}
                    onClick={() => setOwner(undefined)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOwner(undefined) }}>×</span>
                </span>
              )
            }
            if (chip.kind === 'core') {
              return (
                <span key={`core-${chip.tag}`} className={`${styles.chip} ${styles.chipCore}`}>
                  <span className={styles.chipKey}>add_core_of:</span>
                  <span className={styles.chipValue}>{chip.tag}</span>
                  <span role="button" tabIndex={0} className={styles.chipDismiss}
                    onClick={() => setCores(def.coreOf.filter((c) => c !== chip.tag))}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCores(def.coreOf.filter((c) => c !== chip.tag)) }}>×</span>
                </span>
              )
            }
            return (
              <span key={`effect-${i}-${chip.key}`} className={`${styles.chip} ${styles.chipEffect}`}>
                <span className={styles.chipKey}>{chip.key}:</span>
                <span className={styles.chipValue}>{chip.value}</span>
                <span role="button" tabIndex={0} className={styles.chipDismiss}
                  onClick={() => { let removed = false; setEffects(def.effects.filter((e) => { if (!removed && e.key === chip.key && e.value === chip.value) { removed = true; return false } return true })) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { let removed = false; setEffects(def.effects.filter((ef) => { if (!removed && ef.key === chip.key && ef.value === chip.value) { removed = true; return false } return true })) } }}>×</span>
              </span>
            )
          })}
        </div>
      )}
      {chips.length === 0 && !isChipAddOpen && (
        <Text size={100} className={styles.emptyText}>{t('statePanel.section.noEffects')}</Text>
      )}

      {/* Unified chip add form (combobox + value) */}
      {isChipAddOpen && addForm?.kind === 'chipAdd' && (
        <div className={styles.addFormRow} style={{ paddingTop: tokens.spacingVerticalXXS }}>
          <Combobox
            size="small"
            freeform
            style={{ minWidth: 0, flex: 1 }}
            placeholder={t('statePanel.add.effectKey')}
            value={addForm.key}
            onChange={(e) => setAddForm({ ...addForm, key: e.target.value })}
            onOptionSelect={(_, d) => setAddForm({ ...addForm, key: d.optionText ?? '' })}
          >
            {CHIP_SUGGESTIONS.map((s) => <Option key={s} value={s}>{s}</Option>)}
          </Combobox>
          <Input
            size="small"
            style={{ flex: 1, minWidth: 0 }}
            placeholder={valuePlaceholder}
            value={addForm.value}
            maxLength={TAG_KEYS.has(addForm.key) ? 3 : undefined}
            autoFocus={false}
            onChange={(_, d) => setAddForm({ ...addForm, value: TAG_KEYS.has(addForm.key) ? d.value.toUpperCase() : d.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') commitChipAdd() }}
          />
          <Button size="small" appearance="primary" onClick={commitChipAdd}>{t('statePanel.add.confirm')}</Button>
          <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setAddForm(null)} />
        </div>
      )}
      <div style={{ paddingTop: tokens.spacingVerticalXXS }}>
        <Button size="small" appearance="subtle" icon={<AddRegular />}
          onClick={() => setAddForm(isChipAddOpen ? null : { kind: 'chipAdd', target, key: '', value: '' })}>
          {t('statePanel.add.effect')}
        </Button>
      </div>

      {/* Victory Points — collapsible sub-section */}
      <SubSection
        id={`vp-${String(target)}`}
        title={t('statePanel.section.victoryPoints')}
        expanded={vpOpen}
        onToggle={() => setVpOpen((v) => !v)}
        action={
          <Button size="small" appearance="subtle" icon={<AddRegular />}
            onClick={() => {
              if (isVpAddOpen) { setAddForm(null) } else {
                setVpOpen(true)
                setAddForm({ kind: 'vp', target, province: '', value: '1' })
              }
            }} />
        }
        styles={styles}
      >
        {def.victoryPoints.map((vp) => (
          <div key={vp.province} className={styles.historyListRow}>
            <Text size={100} className={styles.historyListKey}>{vp.province}</Text>
            <Input size="small" className={styles.historyListInput} type="number" value={String(vp.value)}
              onChange={(_, d) => {
                const n = parseInt(d.value, 10)
                if (!isNaN(n)) setVPs(def.victoryPoints.map((v) => v.province === vp.province ? { ...v, value: n } : v))
              }} />
            <Button size="small" appearance="subtle" icon={<DismissRegular />} className={styles.removeBtn}
              onClick={() => setVPs(def.victoryPoints.filter((v) => v.province !== vp.province))} />
          </div>
        ))}
        {isVpAddOpen && addForm?.kind === 'vp' && (
          <div className={styles.addFormRow}>
            <Input size="small" className={styles.addFormInput} type="number" placeholder={t('statePanel.add.vpProvince')}
              value={addForm.province} autoFocus
              onChange={(_, d) => setAddForm({ ...addForm, province: d.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') commitVp() }} />
            <Input size="small" style={{ width: '52px' }} type="number" placeholder={t('statePanel.add.vpValue')}
              value={addForm.value}
              onChange={(_, d) => setAddForm({ ...addForm, value: d.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') commitVp() }} />
            <Button size="small" appearance="primary" onClick={commitVp}>{t('statePanel.add.confirm')}</Button>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setAddForm(null)} />
          </div>
        )}
        {def.victoryPoints.length === 0 && !isVpAddOpen && (
          <Text size={100} className={styles.emptyText}>{t('statePanel.section.noVPs')}</Text>
        )}
      </SubSection>

      {/* Buildings — collapsible sub-section */}
      <SubSection
        id={`bldg-${String(target)}`}
        title={t('statePanel.section.buildings')}
        expanded={buildingsOpen}
        onToggle={() => setBuildingsOpen((v) => !v)}
        action={
          <Button size="small" appearance="subtle" icon={<AddRegular />}
            onClick={() => {
              if (isBuildingAddOpen) { setAddForm(null) } else {
                setBuildingsOpen(true)
                setAddForm({ kind: 'building', target, buildingType: buildingTypeList[0] ?? '', province: '', amount: '1' })
              }
            }} />
        }
        styles={styles}
      >
        {def.buildings.map((b, i) => {
          const isProvince = 'province' in b
          const pb = b as ProvinceBuildingDefinition
          const sb = b as StateBuildingDefinition
          const label = isProvince ? `${pb.province} › ${pb.type}` : sb.type
          return (
            <div key={i} className={styles.historyListRow}>
              <Text size={100} className={styles.historyListKey}>{label}</Text>
              <Input size="small" className={styles.historyListInput} type="number" value={String(b.amount)}
                onChange={(_, d) => {
                  const n = parseInt(d.value, 10)
                  if (!isNaN(n)) setBuildings(def.buildings.map((bld, j) => j === i ? { ...bld, amount: n } : bld))
                }} />
              <Button size="small" appearance="subtle" icon={<DismissRegular />} className={styles.removeBtn}
                onClick={() => setBuildings(def.buildings.filter((_, j) => j !== i))} />
            </div>
          )
        })}
        {isBuildingAddOpen && addForm?.kind === 'building' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, paddingTop: tokens.spacingVerticalXXS }}>
            <div className={styles.addFormRow}>
              {buildingTypeList.length > 0 ? (
                <Select size="small" className={styles.addFormInput} value={addForm.buildingType}
                  onChange={(_, d) => setAddForm({ ...addForm, buildingType: d.value })}>
                  {buildingTypeList.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                </Select>
              ) : (
                <Input size="small" className={styles.addFormInput} placeholder={t('statePanel.add.buildingType')}
                  value={addForm.buildingType}
                  onChange={(_, d) => setAddForm({ ...addForm, buildingType: d.value })} />
              )}
            </div>
            <div className={styles.addFormRow}>
              <Input size="small" className={styles.addFormInput} type="number"
                placeholder={t('statePanel.add.buildingProvince')} value={addForm.province}
                onChange={(_, d) => setAddForm({ ...addForm, province: d.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') commitBuilding() }} />
              <Input size="small" style={{ width: '52px' }} type="number" placeholder="1"
                value={addForm.amount}
                onChange={(_, d) => setAddForm({ ...addForm, amount: d.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') commitBuilding() }} />
              <Button size="small" appearance="primary" onClick={commitBuilding}>{t('statePanel.add.confirm')}</Button>
              <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setAddForm(null)} />
            </div>
          </div>
        )}
        {def.buildings.length === 0 && !isBuildingAddOpen && (
          <Text size={100} className={styles.emptyText}>{t('statePanel.section.noBuildings')}</Text>
        )}
      </SubSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StateDetailPanel(): JSX.Element {
  const styles = useStyles()
  const { t } = useI18n()

  const selectedStateId = useMapDataStore((s) => s.selectedStateId)
  const statesById = useMapDataStore((s) => s.statesById)
  const stateCategories = useMapDataStore((s) => s.stateCategories)
  const buildingsCatalog = useMapDataStore((s) => s.buildings)
  const pendingStateEdits = useMapDataStore((s) => s.pendingStateEdits)
  const editState = useMapDataStore((s) => s.editState)
  const revertStateEdit = useMapDataStore((s) => s.revertStateEdit)

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['resources', 'history', 'provinces']))
  const [addForm, setAddForm] = useState<AddFormKind>(null)

  const original = selectedStateId !== null ? statesById.get(selectedStateId) : undefined
  const patch = selectedStateId !== null ? (pendingStateEdits.get(selectedStateId) ?? {}) : {}
  const hasPatch = selectedStateId !== null && pendingStateEdits.has(selectedStateId)

  const effective = useMemo(
    () => original ? applyStatePatch(original, patch) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [original, pendingStateEdits, selectedStateId]
  )

  if (!original || !effective) {
    return (
      <div className={styles.root}>
        <Text size={200} className={styles.empty}>{t('statePanel.detail.noSelection')}</Text>
      </div>
    )
  }

  const dispatch = (p: StateEditPatch) => editState(original.id, p)
  const categoryList = [...stateCategories.keys()].sort()
  const buildingTypeList = [...buildingsCatalog.keys()].sort()

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  // Derive effective date history for mutation helpers
  const effectiveDateHistory = effective.history.dateHistory

  const updateDateEntry = (idx: number, next: HistoryDef) => {
    const updated: DateHistory[] = effectiveDateHistory.map((dh, i) =>
      i === idx ? { ...dh, ...next } : dh
    )
    dispatch({ dateHistory: updated })
  }

  const removeDateEntry = (idx: number) => {
    dispatch({ dateHistory: effectiveDateHistory.filter((_, i) => i !== idx) })
  }

  const resources = effective.resources ?? []

  // Source path display — show only the last 2 path segments
  const sourcePath = original.sourcePath ?? ''
  const pathParts = sourcePath.replace(/\\/g, '/').split('/')
  const pathDisplay = pathParts.slice(-3).join('/')

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Text size={200} className={styles.headerTitle}>
          {t('statePanel.detail.title', { id: original.id })}
        </Text>
        {sourcePath && (
          <Text size={100} className={styles.headerPath} title={sourcePath}>
            {pathDisplay}
          </Text>
        )}
        {hasPatch && (
          <Button
            size="small"
            appearance="subtle"
            icon={<DismissRegular />}
            title={t('statePanel.detail.revert')}
            onClick={() => { revertStateEdit(original.id); setAddForm(null) }}
          />
        )}
      </div>

      {/* Required fields */}
      <div className={styles.requiredFields}>
        <div className={styles.fieldRow}>
          <Text size={100} className={styles.fieldLabel}>{t('statePanel.detail.name')}</Text>
          <Input
            size="small"
            className={styles.fieldInput}
            value={effective.name}
            placeholder="—"
            onChange={(_, d) => dispatch({ name: d.value })}
          />
        </div>
        <div className={styles.fieldRow}>
          <Text size={100} className={styles.fieldLabel}>{t('statePanel.detail.category')}</Text>
          <Select
            size="small"
            className={styles.fieldSelect}
            value={effective.stateCategory}
            onChange={(_, d) => dispatch({ stateCategory: d.value })}
          >
            {!categoryList.includes(effective.stateCategory) && effective.stateCategory && (
              <option value={effective.stateCategory}>{effective.stateCategory} ⚠</option>
            )}
            {categoryList.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className={styles.fieldRow}>
          <Text size={100} className={styles.fieldLabel}>{t('statePanel.detail.manpower')}</Text>
          <Input
            size="small"
            className={styles.fieldInput}
            type="number"
            placeholder="—"
            value={effective.manpower !== undefined ? String(effective.manpower) : ''}
            onChange={(_, d) => {
              const n = parseInt(d.value, 10)
              if (!isNaN(n)) dispatch({ manpower: n })
            }}
          />
        </div>
      </div>

      {/* Resources */}
      <CollapsibleSection
        id="resources"
        title={t('statePanel.section.resources')}
        expanded={expanded.has('resources')}
        onToggle={() => toggle('resources')}
        action={
          <Button size="small" appearance="subtle" icon={<AddRegular />}
            onClick={() => setAddForm(addForm?.kind === 'resource' ? null : { kind: 'resource', type: '', amount: '0' })} />
        }
        styles={styles}
      >
        {resources.map((res) => (
          <div key={res.type} className={styles.fieldRow}>
            <Text size={100} className={styles.fieldLabel}>{res.type}</Text>
            <Input
              size="small"
              className={styles.fieldInput}
              type="number"
              value={String(res.amount)}
              onChange={(_, d) => {
                const n = parseInt(d.value, 10)
                if (!isNaN(n)) dispatch({ resources: resources.map((r) => r.type === res.type ? { ...r, amount: n } : r) })
              }}
            />
            <Button size="small" appearance="subtle" icon={<DismissRegular />} className={styles.removeBtn}
              onClick={() => dispatch({ resources: resources.filter((r) => r.type !== res.type) })} />
          </div>
        ))}
        {addForm?.kind === 'resource' && (
          <div className={styles.addFormRow}>
            <Input size="small" className={styles.addFormInput} placeholder={t('statePanel.add.resourceType')}
              value={addForm.type} autoFocus
              onChange={(_, d) => setAddForm({ ...addForm, type: d.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const amount = parseInt(addForm.amount, 10)
                  if (addForm.type.trim() && !isNaN(amount)) {
                    dispatch({ resources: [...resources.filter((r) => r.type !== addForm.type), { type: addForm.type.trim(), amount }] })
                    setAddForm(null)
                  }
                }
              }} />
            <Input size="small" style={{ width: '60px' }} type="number" placeholder="0"
              value={addForm.amount}
              onChange={(_, d) => setAddForm({ ...addForm, amount: d.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const amount = parseInt(addForm.amount, 10)
                  if (addForm.type.trim() && !isNaN(amount)) {
                    dispatch({ resources: [...resources.filter((r) => r.type !== addForm.type), { type: addForm.type.trim(), amount }] })
                    setAddForm(null)
                  }
                }
              }} />
            <Button size="small" appearance="primary" onClick={() => {
              const amount = parseInt(addForm.amount, 10)
              if (addForm.type.trim() && !isNaN(amount)) {
                dispatch({ resources: [...resources.filter((r) => r.type !== addForm.type), { type: addForm.type.trim(), amount }] })
                setAddForm(null)
              }
            }}>{t('statePanel.add.confirm')}</Button>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setAddForm(null)} />
          </div>
        )}
        {resources.length === 0 && !addForm && (
          <Text size={100} className={styles.emptyText}>{t('statePanel.section.noProps')}</Text>
        )}
      </CollapsibleSection>

      {/* History */}
      <CollapsibleSection
        id="history"
        title={t('statePanel.section.history')}
        expanded={expanded.has('history')}
        onToggle={() => toggle('history')}
        action={
          <Button size="small" appearance="subtle" icon={<AddRegular />}
            title={t('statePanel.add.dateEntry')}
            onClick={() => setAddForm(addForm?.kind === 'dateEntry' ? null : { kind: 'dateEntry', year: '', month: '1', day: '1' })} />
        }
        styles={styles}
      >
        {/* Date entry add form */}
        {addForm?.kind === 'dateEntry' && (
          <div className={styles.addFormRow}>
            <Input size="small" className={styles.addFormInput} type="number" placeholder={t('statePanel.date.year')}
              value={addForm.year} autoFocus
              onChange={(_, d) => setAddForm({ ...addForm, year: d.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') {
                const y = parseInt(addForm.year, 10); const m = parseInt(addForm.month, 10); const day = parseInt(addForm.day, 10)
                if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
                  dispatch({ dateHistory: [...effectiveDateHistory, { date: { year: y, month: m, day }, ...emptyHistoryDef() }] })
                  setAddForm(null)
                }
              }}} />
            <Input size="small" style={{ width: '44px' }} type="number" placeholder={t('statePanel.date.month')}
              value={addForm.month}
              onChange={(_, d) => setAddForm({ ...addForm, month: d.value })} />
            <Input size="small" style={{ width: '44px' }} type="number" placeholder={t('statePanel.date.day')}
              value={addForm.day}
              onChange={(_, d) => setAddForm({ ...addForm, day: d.value })} />
            <Button size="small" appearance="primary" onClick={() => {
              const y = parseInt(addForm.year, 10); const m = parseInt(addForm.month, 10); const day = parseInt(addForm.day, 10)
              if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
                dispatch({ dateHistory: [...effectiveDateHistory, { date: { year: y, month: m, day }, ...emptyHistoryDef() }] })
                setAddForm(null)
              }
            }}>{t('statePanel.add.confirm')}</Button>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setAddForm(null)} />
          </div>
        )}

        {/* Base history sub-section */}
        <CollapsibleSection
          id="hist-base"
          title={t('statePanel.section.base')}
          expanded={expanded.has('hist-base')}
          onToggle={() => toggle('hist-base')}
          styles={styles}
        >
          <HistoryBlock
            def={effective.history}
            target="base"
            onChange={(next) => {
              dispatch({
                owner: next.owner !== undefined ? next.owner : (effective.history.owner !== undefined ? null : undefined),
                coreOf: next.coreOf,
                victoryPoints: next.victoryPoints,
                buildings: next.buildings,
                historyEffects: next.effects
              })
            }}
            addForm={addForm}
            setAddForm={setAddForm}
            buildingTypeList={buildingTypeList}
            styles={styles}
            t={t}
          />
        </CollapsibleSection>

        {/* Date history entries */}
        {effectiveDateHistory.map((dh, idx) => {
          const { year, month, day } = dh.date
          const dateKey = `hist-date-${idx}`
          return (
            <CollapsibleSection
              key={dateKey}
              id={dateKey}
              title={`${year}.${month}.${day}`}
              expanded={expanded.has(dateKey)}
              onToggle={() => toggle(dateKey)}
              onRemove={() => removeDateEntry(idx)}
              styles={styles}
            >
              <HistoryBlock
                def={dh}
                target={idx}
                onChange={(next) => updateDateEntry(idx, next)}
                addForm={addForm}
                setAddForm={setAddForm}
                buildingTypeList={buildingTypeList}
                styles={styles}
                t={t}
              />
            </CollapsibleSection>
          )
        })}
      </CollapsibleSection>

      {/* Provinces */}
      <CollapsibleSection
        id="provinces"
        title={t('statePanel.section.provinces')}
        expanded={expanded.has('provinces')}
        onToggle={() => toggle('provinces')}
        action={
          <Button size="small" appearance="subtle" icon={<AddRegular />}
            onClick={() => setAddForm(addForm?.kind === 'province' ? null : { kind: 'province', value: '' })} />
        }
        styles={styles}
      >
        <div className={styles.chipRowWrap}>
          {effective.provinceIds.map((pid) => (
            <span key={pid} className={styles.provinceChip}>
              {pid}
              <span
                role="button"
                tabIndex={0}
                className={styles.chipDismiss}
                onClick={() => dispatch({ provinceIds: effective.provinceIds.filter((p) => p !== pid) })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch({ provinceIds: effective.provinceIds.filter((p) => p !== pid) }) }}
              >×</span>
            </span>
          ))}
          {effective.provinceIds.length === 0 && !addForm && (
            <Text size={100} className={styles.emptyText}>{t('statePanel.section.noProvinces')}</Text>
          )}
        </div>
        {addForm?.kind === 'province' && (
          <div className={styles.addFormRow}>
            <Input size="small" className={styles.addFormInput} type="number"
              placeholder={t('statePanel.add.provinceId')} value={addForm.value} autoFocus
              onChange={(_, d) => setAddForm({ ...addForm, value: d.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const id = parseInt(addForm.value, 10)
                  if (!isNaN(id) && !effective.provinceIds.includes(id)) {
                    dispatch({ provinceIds: [...effective.provinceIds, id] })
                    setAddForm(null)
                  }
                }
              }} />
            <Button size="small" appearance="primary" onClick={() => {
              const id = parseInt(addForm.value, 10)
              if (!isNaN(id) && !effective.provinceIds.includes(id)) {
                dispatch({ provinceIds: [...effective.provinceIds, id] })
                setAddForm(null)
              }
            }}>{t('statePanel.add.confirm')}</Button>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setAddForm(null)} />
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubSection — nested collapsible inside a section body
// ---------------------------------------------------------------------------

interface SubSectionProps {
  id: string
  title: string
  expanded: boolean
  onToggle: () => void
  action?: React.ReactNode
  onRemove?: () => void
  children: React.ReactNode
  styles: ReturnType<typeof useStyles>
}

function SubSection({ title, expanded, onToggle, action, onRemove, children, styles }: SubSectionProps): JSX.Element {
  return (
    <div className={styles.subSection}>
      <div className={styles.sectionHeader} onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}>
        {expanded
          ? <ChevronDownRegular fontSize={12} className={styles.sectionChevron} />
          : <ChevronRightRegular fontSize={12} className={styles.sectionChevron} />
        }
        <Text size={100} className={styles.sectionTitle}>{title}</Text>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
        {onRemove && (
          <span onClick={(e) => { e.stopPropagation(); onRemove() }}>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} />
          </span>
        )}
      </div>
      {expanded && (
        <div className={styles.subSectionBody}>{children}</div>
      )}
    </div>
  )
}
