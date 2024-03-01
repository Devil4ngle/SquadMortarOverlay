import { type Camera, CameraActionType } from './types'

import { mat4, vec3 } from 'gl-matrix'
import { changeZoom, moveToWorldLocation } from './camera'
import { UserSettingsActionType } from '../ui/types'
import { maps } from '../common/mapData'
import { MAPSCALE } from '../world/constants'
import { type Reducer } from 'redux'
import { type StoreAction } from '../store'

const defaultCamera = () => ({
  transform: mat4.fromScaling(mat4.create(), vec3.fromValues(0.4 * MAPSCALE, 0.4 * MAPSCALE, 1))
})
export const camera: Reducer<Camera, StoreAction> = (state, action) => {
  if (state === undefined) {
    return defaultCamera()
  }
  switch (action.type) {
    case CameraActionType.move:
      const movedTransform = mat4.clone(state.transform)
      mat4.translate(movedTransform, movedTransform, action.payload)
      return {
        ...state,
        transform: movedTransform
      }
    case CameraActionType.changeZoom:
      return changeZoom(state, action.payload.zoom, action.payload.location)
    case CameraActionType.setTransform:
      return {
        ...state,
        transform: action.payload
      }
    case UserSettingsActionType.write:
      if (action.payload.key !== 'mapId') { return state }
      // @ts-expect-error // cba...
      const mapData = maps[action.payload.value]
      const topLeft = vec3.fromValues(
        Math.min(mapData.mapTextureCorner0.loc_x, mapData.mapTextureCorner1.loc_x),
        Math.min(mapData.mapTextureCorner0.loc_y, mapData.mapTextureCorner1.loc_y),
        0
      )
      return moveToWorldLocation(state, topLeft)
    default:
      return state
  }
}

/* basicReducer(CameraActionType.changeZoom, defaultCamera, (state, action) => {
      //const oldZoom = state.transform.scale.x / MAPSCALE; // easier to read....
      //const delta = oldZoom < 1 ? 0.1 : oldZoom < 2 ? 0.2 : 0.5;
      //const newZoom = action.payload.zoomOut ? Math.max(0.2, oldZoom - delta) : Math.min(8, oldZoom + delta);
      return {
        ...state,
        transform: state.transform
      }
});
*/
