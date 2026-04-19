import type { OverlayId } from '../../core/contracts/MapOverlay'
import type { OverlayConfiguration } from '../contracts/OverlayConfiguration'
import type { MessageKey } from '../i18n/messages/en'

export interface OverlayMeta {
  labelKey: MessageKey
  configPath: string
  configuration: OverlayConfiguration
}

export const OVERLAY_META: Record<OverlayId, OverlayMeta> = {
  rivers: {
    labelKey: 'overlay.rivers',
    configPath: '/map/rivers.bmp',
    configuration: {
      overlayId: 'rivers',
      groups: [
        { id: 'sea', label: 'Sea', colors: ['#7a7a7a'] },
        { id: 'land', label: 'Land', colors: ['#ffffff'] },
        {
          id: 'river',
          label: 'River',
          colors: ['#00ff00', '#ff0000', '#fffc00', '#00e1ff', '#00c8ff', '#0096ff', '#0064ff', '#0000ff', '#0000e1', '#0000c8', '#000096', '#000064']
        }
      ],
      defaultFilterRules: [
        {
          target: {
            kind: 'group',
            groupId: 'sea'
          },
          visible: false
        },
        {
          target: {
            kind: 'group',
            groupId: 'land'
          },
          visible: false
        },
        {
          target: {
            kind: 'group',
            groupId: 'river'
          },
          color: '#ffffff'
        }
      ]
    }
  }
}
