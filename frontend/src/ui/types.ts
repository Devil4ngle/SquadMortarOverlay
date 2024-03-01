import { type Maybe, type WriteAction } from '../common/types'
import { type vec3 } from 'gl-matrix'
import { type EntityId } from '../world/types'
import { type WeaponType } from '../world/components/weapon'

export enum UserActionType {
  removeAllTargets = 'USER_REMOVE_ALL_TARGETS',
}
export enum UserSettingsActionType {
  write = 'USER_SETTINGS_WRITE'
}
export type UserSettingsAction = WriteAction<UserSettingsActionType.write, UserSettings, keyof UserSettings>
export interface UserSettings {
  mapId: string
  mapGrid: boolean
  contourmap: boolean

  weaponType: WeaponType
  weaponPlacementHelper: boolean
  weaponPlacementLabel: boolean

  fontSize: number
  targetSpread: boolean
  targetSplash: boolean
  targetGrid: boolean
  targetDistance: boolean
  targetCompactMode: boolean
  targetPlacementHelper: boolean
  targetPlacementLabel: boolean

  extraButtonsAlwaysShown: boolean
  deleteMode: boolean

  leftPanelCollapsed: boolean
}

export enum UIStateActionType {
  write = 'UI_STATE_WRITE',
  updateTouch = 'UI_STATE_UPDATE_TOUCH',
  removeTouch = 'UI_STATE_REMOVE_TOUCH',
}
export type UIStateAction =
    WriteAction<UIStateActionType.write, UIState, keyof UIState>
    | { type: UIStateActionType.updateTouch, payload: TouchInfo }
    | { type: UIStateActionType.removeTouch, payload: any }

export interface UIState {
  dragEntityId: Maybe<EntityId>
  dragStartPosition: vec3
  mousePosition: vec3
  mouseDown: boolean
  touches: Map<any, TouchInfo>
  weaponCreationMode: boolean
}

export interface TouchInfo {
  identifier: any
  location: vec3
}
