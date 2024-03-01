import { type Transform } from './types'
import { mat4, vec3 } from 'gl-matrix'
import { type Camera } from '../camera/types'
import { type Heightmap } from '../heightmap/types'
import { type Minimap } from '../minimap/types'

export const moveTo = (newLocation: vec3) => (transform: mat4) => {
  const currentLocation = mat4.getTranslation(vec3.create(), transform)
  const offset = vec3.subtract(vec3.create(), newLocation, currentLocation)
  return moveBy(offset)(transform)
}

export const moveBy = (offset: vec3) => (tMat: mat4): mat4 =>
  mat4.translate(mat4.create(), tMat, offset)

export const emptyTransform: () => Transform = () => mat4.create()
export const newTranslation: (x: number, y: number, z: number) => mat4 =
  (x, y, z) => mat4.fromTranslation(mat4.create(), vec3.fromValues(x, y, z))
export const getTranslation: (transform: mat4) => vec3 =
  (transform) => mat4.getTranslation(vec3.create(), transform)

export const applyTransform = (ctx: CanvasRenderingContext2D, transform: Transform) => {
  // const rotation = mat4.getRotation(quat.create(), transform)
  /* [
     0,  4,  -, 12,
     1,  5,  -, 13,
     -,  -,  -,  -,
     3,  7,  -, 15   // this row is implied in canvas api
  ] */
  const canvasTransform: [number, number, number, number, number, number] = [0, 1, 4, 5, 12, 13].map(i => transform[i]) as any
  ctx.transform(...canvasTransform)
}

export const applyInverseTransform: (ctx: CanvasRenderingContext2D, transform: Transform) => void =
  (ctx, transform) => {
    applyTransform(ctx, mat4.invert(mat4.create(), transform))
  }

export const event2canvas: (event: MouseEvent | WheelEvent | { target: any, clientX: number, clientY: number }) => vec3 =
(event) => {
  const rc = (event.target as HTMLCanvasElement).getBoundingClientRect()
  const canvas_x = event.clientX - rc.left
  const canvas_y = event.clientY - rc.top
  return vec3.fromValues(canvas_x, canvas_y, 0)
}

export const canvas2world: (camera: Camera, location: vec3) => vec3 =
(camera, location) => {
  const inverted = mat4.invert(mat4.create(), camera.transform)
  return vec3.transformMat4(vec3.create(), location, inverted)
}

export const world2canvas: (camera: Camera, location: vec3) => vec3 =
(camera, location) => {
  return vec3.transformMat4(vec3.create(), location, camera.transform)
}

export const canvas2worldScale: (camera: Camera, vec: vec3) => vec3 =
(camera, vec) => {
  const scale = mat4.getScaling(vec3.create(), camera.transform)
  return vec3.divide(scale, vec, scale)
}

export const world2heightmap: (heightmap: Heightmap, location: vec3) => vec3 =
(heightmap, location) => {
  const out = vec3.create()
  const mult = mat4.mul(mat4.create(), heightmap.transform, heightmap.texture.transform)
  const inverted = mat4.invert(mat4.create(), mult)
  vec3.transformMat4(out, location, inverted)
  return out
}

export const world2keypadStrings: (minimap: Minimap, location: vec3) => string[] =
(minimap, location) => {
  const kp = world2keypad(minimap, location)
  if (kp[0] < 0 || kp[0] > 23 || kp[1] < 0) {
    return ['--', '-', '-']
  }
  return [`${String.fromCharCode(65 + kp[0])}${1 + kp[1]}`, kp[2].toString(), kp[3].toString()]
}

export const standardFormatKeypad = (keypad: string[]): string => `${keypad[0]}-${keypad[1]}-${keypad[2]}`

export const world2keypad: (minimap: Minimap, location: vec3) => number[] =
(minimap, location) => {
  const topleft = mat4.getTranslation(vec3.create(), minimap.transform)
  const x = location[0] - topleft[0]
  const y = location[1] - topleft[1]
  const quadrantX = Math.floor(x / 30000)
  const quadrantY = Math.floor(y / 30000)
  const KP1 = 7 + Math.floor((x % 30000) / 10000) - 3 * Math.floor((y % 30000) / 10000)
  const KP2 = 7 + Math.floor((x % 10000) / 3334) - 3 * Math.floor((y % 10000) / 3334)
  if (quadrantX < 0 || quadrantX > 23 || quadrantY < 0) {
    return [-1, -1, -1, -1]
  }
  return [quadrantX, quadrantY, KP1, KP2]
}
