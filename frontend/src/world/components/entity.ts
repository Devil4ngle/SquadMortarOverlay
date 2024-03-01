import { type StoreAction } from '../../store'
import { type EntityId } from '../types'
import { type SetAction } from './types'

export const newEntity = (action: SetAction): EntityComponent => ({ entityType: action.payload.entityType, entityId: action.payload.entityId })

export type EntityType = 'Camera' | 'Weapon' | 'Target'
export interface EntityComponent { entityType: EntityType, entityId: EntityId }

type State = Map<EntityId, EntityComponent>
export const entityReducer = (state: State, action: StoreAction) => {
  if (state === undefined) {
    return new Map()
  }
  return state
}
