import { type vec3 } from 'gl-matrix'
import { type HasTexture } from '../render/types'
import { type HasTransform } from '../world/types'

export type Heightmap = HasTexture & HasTransform & {
  size: vec3
  canvas: HTMLCanvasElement
}
