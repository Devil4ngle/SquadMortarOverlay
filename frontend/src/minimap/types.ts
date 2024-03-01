import { type HasTransform } from '../world/types'
import { type HasTexture } from '../render/types'
import { type maps } from '../common/mapData'
import { type vec3 } from 'gl-matrix'

export enum MinimapActionType {
  set = 'MINIMAP_SET'
}
export interface MinimapAction { type: MinimapActionType.set, payload: keyof (typeof maps) }
export type Minimap = HasTexture & HasTransform & { size: vec3 }
