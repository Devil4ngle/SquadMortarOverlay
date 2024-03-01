import { type HasTransform } from '../world/types'
import { type HasTexture } from '../render/types'
import { type maps } from '../common/mapData'
import { type vec3 } from 'gl-matrix'

export enum ContourmapActionType {
  set = 'MINIMAP_SET'
}
export interface ContourmapAction { type: ContourmapActionType.set, payload: keyof (typeof maps) }
export type Contourmap = HasTexture & HasTransform & { size: vec3 }
