import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapQueryApi } from '../../bridge/MapQueryProvider'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import {
  getDisplayModeSampleColor,
  isEditableDisplayMode,
  sampleDisplayModeValue,
  type DisplayMode,
  type DisplayModeContext,
  type DisplayModeSample
} from '../../infra/config/displayModes'
import type { ProvinceDraftTarget } from '../../../../shared/provinceEditing'
import { useI18n } from '../i18n/I18nProvider'
import { packColor } from '../../../../shared/mapDataTypes'
import { useProvinceEditTargets } from './useProvinceEditTargets'
import { useMapDisplayMode } from './useMapDisplayMode'
import { useProvinceHighlights } from './useProvinceHighlights'

interface HoveredProvince {
  color: number
  x: number
  y: number
}

export function useMapViewportState() {
  const { t } = useI18n()
  const query = useMapQueryApi()

  // — Derived edit state (single computation shared by display mode + highlights) —
  const { draftTargetMaps, effectiveCatalog } = useProvinceEditTargets()

  // — Display mode + color data —
  const {
    displayMode,
    displayModeContext,
    displayModeOverrides,
    colorMap,
    modeValuesByMode,
    setDisplayMode: dispatchDisplayMode,
  } = useMapDisplayMode(draftTargetMaps.byColor)

  // — Canvas highlight colors —
  const { highlightColors, validationHighlightColors } = useProvinceHighlights(effectiveCatalog)

  // — Tool state —
  const [activeTool, setActiveTool] = useState<'select' | 'eyedrop' | 'bucket' | 'brush' | 'select-color'>('select')
  const [sampledValue, setSampledValue] = useState<DisplayModeSample | null>(null)
  const previousDisplayModeRef = useRef<typeof displayMode | null>(null)

  // Reset tool when editor mode changes (e.g. switching from paint to provinces)
  useEffect(() => {
    if (previousEditorModeRef.current === editorMode) return
    previousEditorModeRef.current = editorMode
    setActiveTool(editorMode === 'paint' ? 'brush' : 'select')
  }, [editorMode])

  // Reset tool when display mode changes externally (e.g. overlay panel)
  useEffect(() => {
    if (previousDisplayModeRef.current === displayMode) return
    previousDisplayModeRef.current = displayMode
    setSampledValue(null)
    setActiveTool('select')
  }, [displayMode])

  // — Selection actions —
  const setSelection = useMapDataStore((s) => s.setSelection)
  const extendSelection = useMapDataStore((s) => s.extendSelection)
  const setSelectedBmpGuids = useMapDataStore((s) => s.setSelectedBmpGuids)
  const toggleBmpGuid = useMapDataStore((s) => s.toggleBmpGuid)
  const editProvince = useMapDataStore((s) => s.editProvince)
  const editBmpOnlyProvince = useMapDataStore((s) => s.editBmpOnlyProvince)
  const editorMode = useMapDataStore((s) => s.editorMode)
  const previousEditorModeRef = useRef(editorMode)
  const setSelectedStateId = useMapDataStore((s) => s.setSelectedStateId)
  const stateProvinceToStateId = useMapDataStore((s) => s.stateProvinceToStateId)
  const setSelectedStrategicRegionId = useMapDataStore((s) => s.setSelectedStrategicRegionId)
  const strategicRegionProvinceToRegionId = useMapDataStore((s) => s.strategicRegionProvinceToRegionId)

  // — Paint tool state —
  const paintProvinceColor = useMapDataStore((s) => s.paintProvinceColor)
  const setPaintProvinceColor = useMapDataStore((s) => s.setPaintProvinceColor)
  const brushRadius = useMapDataStore((s) => s.brushRadius)
  const paintSelection = useMapDataStore((s) => s.paintSelection)
  const togglePaintSelectionColor = useMapDataStore((s) => s.togglePaintSelectionColor)
  const clearPaintSelection = useMapDataStore((s) => s.clearPaintSelection)

  // — Hover state —
  const [hoveredProvince, setHoveredProvince] = useState<HoveredProvince | null>(null)

  const provincesImageB64 = useMapDataStore((s) => s.provincesImageB64)

  // — Derived tool props —
  const eyedropEnabled = isEditableDisplayMode(displayMode)
  const bucketEnabled = eyedropEnabled && sampledValue !== null && sampledValue.mode === displayMode

  const sampledValuePresentation = useMemo(() => {
    if (!sampledValue || sampledValue.mode !== displayMode || !isEditableDisplayMode(displayMode)) return null
    const label = sampledValue.mode === 'coastal'
      ? sampledValue.value === undefined
        ? t('mapValue.none')
        : t(sampledValue.value ? 'mapValue.coastal' : 'mapValue.inland')
      : sampledValue.value || t('mapValue.none')
    return {
      label,
      color: `#${getDisplayModeSampleColor(sampledValue, displayModeOverrides, displayModeContext).toString(16).padStart(6, '0')}`
    }
  }, [displayMode, displayModeContext, displayModeOverrides, sampledValue, t])

  // — Hover tooltip —
  const hoverTooltip = useMemo(() => {
    if (!hoveredProvince) return null
    return resolveHoverTooltip(
      displayMode,
      query.getDraftProvinceByColor(hoveredProvince.color),
      displayModeContext,
      t as (key: string) => string
    )
  }, [displayMode, displayModeContext, hoveredProvince, query, t])

  // — Event handlers —
  const onDisplayModeChange = useCallback((mode: typeof displayMode) => {
    setSampledValue(null)
    setActiveTool('select')
    dispatchDisplayMode(mode)
  }, [dispatchDisplayMode])

  const onActiveToolChange = useCallback((tool: typeof activeTool) => {
    if (tool === 'eyedrop' && !eyedropEnabled && editorMode !== 'paint') return
    if (tool === 'bucket' && !bucketEnabled) return
    setActiveTool(tool)
  }, [eyedropEnabled, bucketEnabled, editorMode])

  const onMapClick = useCallback((r: number, g: number, b: number, additive: boolean) => {
    const draft = query.getDraftProvinceByColor(packColor(r, g, b))
    if (!draft) return

    if (editorMode === 'paint') {
      if (activeTool === 'eyedrop') {
        setPaintProvinceColor(packColor(r, g, b))
        setActiveTool('brush')
      } else if (activeTool === 'select-color') {
        togglePaintSelectionColor(packColor(r, g, b))
      }
      return
    }

    if (editorMode === 'states') {
      if (draft.provinceId !== null) {
        const stateId = stateProvinceToStateId.get(draft.provinceId) ?? null
        setSelectedStateId(stateId)
      }
      return
    }

    if (editorMode === 'strategicRegions') {
      if (draft.provinceId !== null) {
        const regionId = strategicRegionProvinceToRegionId.get(draft.provinceId) ?? null
        setSelectedStrategicRegionId(regionId)
      }
      return
    }

    if (activeTool === 'eyedrop') {
      if (!isEditableDisplayMode(displayMode)) return
      const sample = sampleDisplayModeValue(displayMode, draft)
      if (!sample) return
      if (sample.mode === 'continent') {
        if (!sample.value) return
      } else if (sample.value === undefined) {
        return
      }
      setSampledValue(sample)
      setActiveTool('bucket')
      return
    }

    if (activeTool === 'bucket') {
      if (!sampledValue || sampledValue.mode !== displayMode || !isEditableDisplayMode(displayMode)) return
      if (draft.provinceId !== null) {
        if (sampledValue.mode === 'type') editProvince(draft.provinceId, { type: sampledValue.value })
        if (sampledValue.mode === 'terrain') editProvince(draft.provinceId, { terrain: sampledValue.value })
        if (sampledValue.mode === 'coastal') editProvince(draft.provinceId, { isCoastal: sampledValue.value })
        if (sampledValue.mode === 'continent') editProvince(draft.provinceId, { continent: sampledValue.value })
      } else if (draft.bmpGuid) {
        if (sampledValue.mode === 'type') editBmpOnlyProvince(draft.bmpGuid, { type: sampledValue.value })
        if (sampledValue.mode === 'terrain') editBmpOnlyProvince(draft.bmpGuid, { terrain: sampledValue.value })
        if (sampledValue.mode === 'coastal') editBmpOnlyProvince(draft.bmpGuid, { isCoastal: sampledValue.value })
        if (sampledValue.mode === 'continent') editBmpOnlyProvince(draft.bmpGuid, { continent: sampledValue.value })
      }
      return
    }

    if (draft.provinceId !== null) {
      if (additive) extendSelection([draft.provinceId])
      else setSelection([draft.provinceId])
      return
    }

    if (draft.bmpGuid === null) return
    if (additive) toggleBmpGuid(draft.bmpGuid)
    else setSelectedBmpGuids([draft.bmpGuid])
  }, [
    activeTool,
    displayMode,
    editBmpOnlyProvince,
    editProvince,
    editorMode,
    extendSelection,
    query,
    sampledValue,
    setSelectedBmpGuids,
    setSelectedStateId,
    setSelectedStrategicRegionId,
    setSelection,
    setPaintProvinceColor,
    togglePaintSelectionColor,
    stateProvinceToStateId,
    strategicRegionProvinceToRegionId,
    toggleBmpGuid,
  ])

  const onHoverColorChange = useCallback(
    (color: { r: number; g: number; b: number; x: number; y: number } | null) => {
      if (!color) { setHoveredProvince(null); return }
      const draft = query.getDraftProvinceByColor(packColor(color.r, color.g, color.b))
      if (!draft) { setHoveredProvince(null); return }
      setHoveredProvince({ color: packColor(color.r, color.g, color.b), x: color.x, y: color.y })
    },
    [query]
  )

  const brushPaintConfig = paintProvinceColor !== null
    ? {
        radius: brushRadius,
        r: (paintProvinceColor >> 16) & 0xff,
        g: (paintProvinceColor >> 8) & 0xff,
        b: paintProvinceColor & 0xff,
        selectionColors: paintSelection.size > 0 ? paintSelection : null,
      }
    : null

  const highlightColorsForCanvas = editorMode === 'paint'
    ? Array.from(paintSelection)
    : highlightColors

  return {
    src: provincesImageB64 ? `data:image/bmp;base64,${provincesImageB64}` : null,
    colorMap,
    highlightColors: highlightColorsForCanvas,
    validationWarningColors: validationHighlightColors.warningColors,
    validationErrorColors: validationHighlightColors.errorColors,
    activeTool,
    eyedropEnabled,
    bucketEnabled,
    sampledValueColor: sampledValuePresentation?.color ?? null,
    sampledValueLabel: sampledValuePresentation?.label ?? null,
    displayMode,
    modeValuesByMode,
    onActiveToolChange,
    onMapClick,
    hoverTooltipPosition: hoveredProvince ? { x: hoveredProvince.x, y: hoveredProvince.y } : null,
    hoverTooltip,
    onHoverColorChange,
    onDisplayModeChange,
    paintProvinceColor,
    brushRadius,
    brushPaintConfig,
    paintSelection,
    clearPaintSelection,
  }
}

function resolveHoverTooltip(
  displayMode: DisplayMode,
  province: ProvinceDraftTarget | undefined,
  context: DisplayModeContext,
  t: (key: string) => string
): { label: string; value: string } | null {
  if (!province) return null
  if (displayMode === 'provinces') {
    return province.provinceId !== null
      ? { label: t('map.hover.provinceId'), value: province.provinceId.toString() }
      : { label: t('map.hover.unregisteredProvince'), value: province.bmpGuid ?? t('mapValue.none') }
  }
  if (displayMode === 'type') return { label: t('map.hover.type'), value: province.type ?? t('mapValue.none') }
  if (displayMode === 'terrain') return { label: t('map.hover.terrain'), value: province.terrain ?? t('mapValue.none') }
  if (displayMode === 'coastal') {
    return {
      label: t('map.hover.coastal'),
      value: province.isCoastal === undefined ? t('mapValue.none') : t(province.isCoastal ? 'mapValue.coastal' : 'mapValue.inland')
    }
  }
  if (displayMode === 'state') {
    return {
      label: t('map.hover.state'),
      value: province.provinceId !== null
        ? (context.stateProvinceToStateId.get(province.provinceId)?.toString() ?? t('mapValue.none'))
        : t('mapValue.none')
    }
  }
  if (displayMode === 'strategicRegion') {
    return {
      label: t('map.hover.strategicRegion'),
      value: province.provinceId !== null
        ? (context.strategicRegionProvinceToRegionId.get(province.provinceId)?.toString() ?? t('mapValue.none'))
        : t('mapValue.none')
    }
  }
  return { label: t('map.hover.continent'), value: province.continent ? province.continent : t('mapValue.none') }
}
