import { type vec3 } from 'gl-matrix'
import { type Transform } from '../world/types'

export default function log (s: string) {
  console.log(s)
}

export interface Drawable {
  draw: (c: CanvasRenderingContext2D) => any
}
export interface HasTexture { texture: Texture }
export interface Texture {
  transform: Transform
  source: string
  size: vec3
  image: HTMLImageElement
}

export interface Renderable { type: 'texture', texture: Texture }
// |

export interface RenderNode {
  transform: Transform
  renderable: Renderable
  children: RenderNode[]
}
