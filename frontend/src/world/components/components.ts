import produce from 'immer'
import { combineReducers } from 'redux'
import { type StoreAction } from '../../store'
import { type Component, type ComponentKey, type Components, type EntityId, type HasTransform, type SerializableComponents } from '../types'
import { type EntityComponent, entityReducer, newEntity } from './entity'
import { transformReducer, tryNewTransform } from './transform'
import { type SetAction } from './types'
import { type WeaponComponent, tryNewWeaponComponent, weaponReducer } from './weapon'

export const newComponents = (): Components => ({
  transform: new Map<EntityId, HasTransform>(),
  weapon: new Map<EntityId, WeaponComponent>(),
  entity: new Map<EntityId, EntityComponent>()
})

// register new components here as well
const tryComponentConstructor = (components: Components, type: ComponentKey, action: SetAction): Component | null => {
  switch (type) {
    case 'transform': return tryNewTransform(action)
    case 'weapon': return tryNewWeaponComponent(components, action)
    case 'entity': return newEntity(action)
  }
}
// queries
export const getFilteredEntityIds = (components: Components, predicate: (e: EntityComponent) => boolean): EntityId[] => {
  const out: EntityId[] = []
  components.entity.forEach((v: EntityComponent, k: EntityId) => {
    if (predicate(v)) {
      out.push(k)
    }
  })
  return out
}

/// / quasi reducers
/*
// this throws an immer error, no idea why
export const setComponentsFromAction = (components: Components, entityId: EntityId, action: SetAction): Components => {
  const newComponentKeys = Object.keys(components) as Array<keyof Components>;
  const newState = produce(components, (oldState: Components) => {
    newComponentKeys.forEach((componentKey: ComponentKey) => {
      let maybeComponent = tryComponentConstructor(components, componentKey, action)
      if (maybeComponent !== null){
        oldState[componentKey].set(entityId, maybeComponent as any)
      }
    })
  })

  return newState
}
*/
export const setComponentsFromActionMut = (components: Components, entityId: EntityId, action: SetAction): Components => {
  const newComponentKeys = Object.keys(components) as Array<keyof Components>
  const newState = components
  newComponentKeys.forEach((componentKey: ComponentKey) => {
    const maybeComponent = tryComponentConstructor(components, componentKey, action)
    if (maybeComponent !== null) {
      newState[componentKey].set(entityId, maybeComponent as any)
    }
  })
  return newState
}

export const removeComponents = (components: Components, entityId: EntityId): Components => {
  const newState = produce(components, (oldState: Components) => {
    removeComponentsMut(components, entityId)
  })
  return newState
}

export const removeComponentsMut = (components: Components, entityId: EntityId): void => {
  const componentKeys = Object.keys(components) as Array<keyof Components>
  componentKeys.forEach((componentKey: ComponentKey) => {
    components[componentKey].delete(entityId)
  })
}

export const componentsReducer: (state: Components, action: StoreAction) => Components =
  combineReducers({
    transform: transformReducer,
    weapon: weaponReducer,
    entity: entityReducer
  }) as any

export const serializableComponents = (components: Components): { [k in ComponentKey]: Array<[EntityId, Component]> } => {
  const out: any = {};
  (Object.keys(components) as ComponentKey[]).forEach((componentKey: ComponentKey) => {
    /* let obj: any = {};
    components[key].forEach((value: unknown, key: number) => {
      obj[key] = value;
    }) */
    const array: any = []
    components[componentKey].forEach((value: unknown, entityId: number) => {
      array.push([entityId, value])
    })
    out[componentKey] = array
  })
  return out
}

export const insertComponentsBulkMut = (components: Components, newComponents: SerializableComponents): Components => {
  (Object.keys(components) as ComponentKey[]).forEach((componentKey: ComponentKey) => {
    newComponents[componentKey].forEach((kv_pair) => {
      const [entityId, value] = kv_pair
      components[componentKey].set(entityId, value as any)
    })
  })
  return components
}

export const maxEntityId = (components: SerializableComponents): EntityId => {
  let curMax = 0;
  (Object.keys(components) as ComponentKey[]).forEach((componentKey: ComponentKey) => {
    curMax = Math.max(curMax, ...components[componentKey].map(kv => kv[0]))
  })
  return curMax
}
