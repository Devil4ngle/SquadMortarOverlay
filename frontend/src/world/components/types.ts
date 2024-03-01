import { type EntityAction, type EntityActionType } from '../types'

export type SetAction = Extract<EntityAction, { type: EntityActionType.set }>
