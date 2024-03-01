import { type vec3 } from 'gl-matrix'
import { type WeaponType } from './components/weapon'
import { type EntityAction, EntityActionType, type EntityId, type SerializableComponents, type TransformAction, TransformActionType, type WeaponAction, WeaponActionType } from './types'

export const setAllEntities = (components: SerializableComponents): EntityAction => ({
  type: EntityActionType.setAll,
  payload: { components }
})
export const removeEntity: (entityId: EntityId) => EntityAction =
  (entityId) => ({
    type: EntityActionType.remove,
    payload: { entityId }
  })

export const moveEntityBy: (entityId: EntityId, vector: vec3) => TransformAction =
  (entityId, vector) => ({
    type: TransformActionType.moveBy,
    payload: { entityId, vector }
  })

export const moveEntityTo: (entityId: EntityId, location: vec3) => TransformAction =
  (entityId, location) => ({
    type: TransformActionType.moveTo,
    payload: { entityId, location }
  })

export const addTarget: (location: vec3) => EntityAction =
  (location) => ({
    type: EntityActionType.add,
    payload: { location, entityType: 'Target' }
  })

export const removeTarget: (entityId: EntityId) => EntityAction =
  (entityId) => ({
    type: EntityActionType.remove,
    payload: { entityId }
  })

export const syncTargets: (state: any) => EntityAction =
  (state) => ({
    type: EntityActionType.syncTargets,
    payload: { state }
  })

export const syncMap: (state: any, active: boolean, isToggle: boolean) => EntityAction =
  (state, active, isToggle) => ({
    type: EntityActionType.syncMap,
    payload: { state, active, isToggle }
  })

export const removeAllTargets: () => EntityAction =
  () => ({
    type: EntityActionType.removeAllTargets,
    payload: {}
  })

export const addWeapon: (location: vec3, weaponType: WeaponType) => EntityAction =
  (location, weaponType) => ({
    type: EntityActionType.add,
    payload: { location, entityType: 'Weapon' }
  })

export const setWeaponActive = (entityId: EntityId, newState: boolean): WeaponAction => ({
  type: WeaponActionType.setActive,
  payload: { entityId, newState }
})

export const toggleWeaponActive = (entityId: EntityId): WeaponAction => ({
  type: WeaponActionType.toggleActive,
  payload: { entityId }
})

export const pickActiveWeapon = (entityId: EntityId): WeaponAction => ({
  type: WeaponActionType.pickActive,
  payload: { entityId }
})

export const setWeaponHeightOverGround = (entityId: EntityId, newHeight: number): WeaponAction => ({
  type: WeaponActionType.setHeightOverGround,
  payload: { entityId, newHeight: newHeight * 100 }
})

export const addCamera = (location: vec3): EntityAction => ({
  type: EntityActionType.add,
  payload: { location, entityType: 'Camera' }
})
