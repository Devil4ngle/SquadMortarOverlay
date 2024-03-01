import { type mat4, type vec3 } from 'gl-matrix'
import { type EntityComponent, type EntityType } from './components/entity'
import { type WeaponComponent, type WeaponType } from './components/weapon'

export interface HasEntityId { entityId: EntityId }
export interface HasTransform { transform: Transform }
export type Transform = mat4 // HasLocation & HasRotation & HasScale;

export interface HasLocation { location: vec3 }
export interface HasRotation { rotation: vec3 }
export interface HasScale { scale: vec3 }
export interface WorldArea {

}

export enum EntityActionType {
  add = 'ENTITY_ADD',
  set = 'ENTITY_SET',
  setAll = 'ENTITY_SET_ALL',
  remove = 'ENTITY_REMOVE',
  removeAllTargets = 'ENTITY_REMOVE_ALL_TARGETS',
  syncTargets = 'SYNC_TARGETS',
  syncMap = 'SYNC_MAP',
}

export type EntityAction =
  { type: EntityActionType.add, payload: HasLocation & { entityType: EntityType } }
  | { type: EntityActionType.set, payload: HasLocation & { entityType: EntityType, entityId: EntityId } }
  | { type: EntityActionType.setAll, payload: { components: SerializableComponents } }
  | { type: EntityActionType.remove, payload: HasEntityId }
  | { type: EntityActionType.removeAllTargets, payload: {} }
  | { type: EntityActionType.syncTargets, payload: { state: any } }
  | {
    type: EntityActionType.syncMap, payload: {
      active: boolean
      state: any
      isToggle: boolean
    }
  }

export enum TransformActionType {
  moveTo = 'TRANSFORM_MOVE_TO',
  moveBy = 'TRANSFORM_MOVE_BY'
}

export type TransformAction =
  { type: TransformActionType.moveTo, payload: { entityId: EntityId, location: vec3 } }
  | { type: TransformActionType.moveBy, payload: { entityId: EntityId, vector: vec3 } }

export type Component =
  HasTransform
  | WeaponComponent
  | EntityComponent

export enum WeaponActionType {
  setActive = 'WEAPON_SET_ACTIVE',
  toggleActive = 'WEAPON_TOGGLE_ACTIVE',
  pickActive = 'WEAPON_PICK_ACTIVE',
  setHeightOverGround = 'WEAPON_SET_HEIGHT_OVER_GROUND',
  setWeaponType = 'WEAPON_SET_TYPE',
}

export type WeaponAction =
  { type: WeaponActionType.setActive, payload: { entityId: EntityId, newState: boolean } }
  | { type: WeaponActionType.toggleActive, payload: { entityId: EntityId } }
  | { type: WeaponActionType.pickActive, payload: { entityId: EntityId } }
  | { type: WeaponActionType.setHeightOverGround, payload: { entityId: EntityId, newHeight: number } }
  | { type: WeaponActionType.setWeaponType, payload: { entityId: EntityId, newType: WeaponType } }

export type ComponentDefinition
  = { componentKey: 'transform' } & HasTransform

export interface Components {
  transform: Map<EntityId, HasTransform>
  weapon: Map<EntityId, WeaponComponent>
  entity: Map<EntityId, EntityComponent>
}
export type ComponentKey = keyof Components
export type ComponentKeySet = Set<ComponentKey>

export type EntityId = number
export interface World {
  nextId: EntityId
  components: Components
}

export type Target = EntityComponent & HasTransform
export type Weapon = EntityComponent & WeaponComponent & HasTransform

export type SerializableComponents = { [k in ComponentKey]: Array<[EntityId, Component]> }
