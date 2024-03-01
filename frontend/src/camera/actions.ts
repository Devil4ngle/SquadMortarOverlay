import { type CameraAction, CameraActionType } from './types'
import { type mat4, type vec3 } from 'gl-matrix'

export const changeZoom: (location: vec3, zoom: number) => CameraAction =
  (location, zoom) => ({ type: CameraActionType.changeZoom, payload: { location, zoom } })

export const moveCamera: (vector: vec3) => CameraAction =
  (vector) => ({ type: CameraActionType.move, payload: vector })

export const setTransform: (transform: mat4) => CameraAction =
  (transform) => ({ type: CameraActionType.setTransform, payload: transform })
