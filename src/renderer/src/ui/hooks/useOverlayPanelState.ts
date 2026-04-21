import { useState } from 'react'
import type { OverlayId } from '../../core/contracts/MapOverlay'
import type { OverlayPanelItem } from './useOverlayAssets'
import type { OverlayFilterRule } from '../../core/contracts/MapOverlay'
import type { OverlayFilterRuleTemplate } from '../contracts/OverlayConfiguration'

export interface OverlayPanelState {
  overlayDialogId: OverlayId | null
  draggedOverlayId: OverlayId | null
  dropTargetOverlayId: OverlayId | null
  setOverlayDialogId: (id: OverlayId | null) => void
  setDraggedOverlayId: (id: OverlayId | null) => void
  setDropTargetOverlayId: (id: OverlayId | null) => void
  openOverlayDialog: (overlay: OverlayPanelItem) => void
}

export function useOverlayPanelState(
  overlays: OverlayPanelItem[],
  onOverlayFilterRulesChange: (overlayId: OverlayId, rules: OverlayFilterRule[]) => void
): OverlayPanelState {
  const [overlayDialogId, setOverlayDialogId] = useState<OverlayId | null>(null)
  const [draggedOverlayId, setDraggedOverlayId] = useState<OverlayId | null>(null)
  const [dropTargetOverlayId, setDropTargetOverlayId] = useState<OverlayId | null>(null)
  const [initializedOverlayDefaults, setInitializedOverlayDefaults] = useState<OverlayId[]>([])

  function openOverlayDialog(overlay: OverlayPanelItem) {
    if (overlay.kind !== 'bitmap') {
      setOverlayDialogId(overlay.id)
      return
    }

    const hasDefaults = (overlay.configuration.defaultFilterRules?.length ?? 0) > 0
    const alreadyInitialized = initializedOverlayDefaults.includes(overlay.id)

    if (!alreadyInitialized) {
      setInitializedOverlayDefaults((current) =>
        current.includes(overlay.id) ? current : [...current, overlay.id]
      )
    }

    if (!alreadyInitialized && overlay.filterRules.length === 0 && hasDefaults) {
      onOverlayFilterRulesChange(
        overlay.id,
        createOverlayFilterRulesFromTemplates(overlay.configuration.defaultFilterRules ?? [])
      )
    }

    setOverlayDialogId(overlay.id)
  }

  return {
    overlayDialogId,
    draggedOverlayId,
    dropTargetOverlayId,
    setOverlayDialogId,
    setDraggedOverlayId,
    setDropTargetOverlayId,
    openOverlayDialog
  }
}

function createOverlayFilterRulesFromTemplates(templates: OverlayFilterRuleTemplate[]): OverlayFilterRule[] {
  return templates.map((template) => ({
    id: crypto.randomUUID(),
    target: template.target.kind === 'group'
      ? { kind: 'group' as const, groupId: template.target.groupId }
      : { kind: 'custom' as const, colors: [...template.target.colors] },
    visible: template.visible ?? true,
    opacity: template.opacity ?? 100,
    color: template.color ?? null
  }))
}
