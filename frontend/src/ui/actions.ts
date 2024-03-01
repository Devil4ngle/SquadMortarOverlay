import { type UIState, type UIStateAction, UIStateActionType, type UserSettings, UserSettingsActionType } from './types'
import { type WriteAction } from '../common/types'
import { vec3 } from 'gl-matrix'
import { saveUserSettings } from './persistence'
import { $contourmap } from '../elements'
import { maps } from '../common/mapData'
import { type EntityId } from '../world/types'

export const newUserSettingsWriteAction: <K extends keyof UserSettings>(k: K, v: UserSettings[K]) => (dispatch: any, getState: any) => Promise<any> =
  (k, v) => async (dispatch, getState) => {
    dispatch(({ type: UserSettingsActionType.write, payload: { key: k, value: v } }))
    return await new Promise((resolve, reject) => {
      // console.log("saving settings: ", getState().userSettings.toJS());
      saveUserSettings(getState().userSettings)
      resolve(null)
    })
  }

export const newUIStateWriteAction = <K extends keyof UIState>(k: K, v: UIState[K]): WriteAction<UIStateActionType.write, UIState, keyof UIState> =>
  ({ type: UIStateActionType.write, payload: { key: k, value: v } })

export const newMousePosition: (x: number, y: number) => UIStateAction =
  (x, y) => ({ type: UIStateActionType.write, payload: { key: 'mousePosition', value: vec3.fromValues(x, y, 0) } })

export const setMouseDown: (isDown: boolean) => (dispatch: any, getState: any) => void =
  (isDown) => (dispatch, getState) => {
    const state = getState()
    dispatch(({ type: UIStateActionType.write, payload: { key: 'mouseDown', value: isDown } }))
  }

export const setDragEntity = (entityId: EntityId): UIStateAction =>
  ({ type: UIStateActionType.write, payload: { key: 'dragEntityId', value: entityId } })

export const setDragStartPosition = (position: vec3): UIStateAction =>
  ({ type: UIStateActionType.write, payload: { key: 'dragStartPosition', value: position } })

export const settingsToActions: (settings: Partial<UserSettings>) => UIStateAction[] =
  settings => {
    return Object.entries(settings).map(kv => ({ type: UserSettingsActionType.write, payload: { key: kv[0], value: kv[1] } })) as any // typescript best language
  }

export const changeMap = (new_map_id: keyof (typeof maps)) => (dispatch: any, getState: any) => {
  const contourmap_active = getState().userSettings.contourmap
  return dispatch(newUserSettingsWriteAction('mapId', new_map_id)).then(
    () => contourmap_active ? $contourmap.set_image_source((maps[new_map_id] as any)?.contourmap_image_src || '') : null
  )
}

export const updateTouch = (id: number, loc_x: number, loc_y: number): UIStateAction => ({
  type: UIStateActionType.updateTouch,
  payload: { identifier: id, location: vec3.fromValues(loc_x, loc_y, 0) }
})

export const removeTouch = (id: number): UIStateAction => ({
  type: UIStateActionType.removeTouch,
  payload: { identifier: id }
})
