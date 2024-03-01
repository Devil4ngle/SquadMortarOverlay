import { type HasTransform } from '../world/types'
import { type mat4, type vec3 } from 'gl-matrix'
export type Camera = {
  // zoom: number;
} & HasTransform

export enum CameraActionType {
  changeZoom = 'CAMERA_CHANGE_ZOOM',
  move = 'CAMERA_MOVE',
  setTransform = 'CAMERA_SET_TRANSFORM'
}

export type CameraAction
  = { type: CameraActionType.changeZoom, payload: { location: vec3, zoom: number } }
  | { type: CameraActionType.move, payload: vec3 }
  | { type: CameraActionType.setTransform, payload: mat4 }
