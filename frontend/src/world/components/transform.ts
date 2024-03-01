import { mat4, type vec3 } from 'gl-matrix'
import produce from 'immer'
import { type EntityId, type HasTransform, type TransformAction, TransformActionType } from '../types'
import { type SetAction } from './types'
import * as Transformation from '../transformations'

export const newTransform = (location: vec3): HasTransform =>
  ({ transform: mat4.fromTranslation(mat4.create(), location) })

export const tryNewTransform = (action: SetAction): HasTransform | null =>
  newTransform(action.payload.location)

type State = Map<EntityId, HasTransform>

export const transformReducer = (state: State, action: TransformAction): State => {
  if (state === undefined) {
    return new Map()
  }
  switch (action.type) {
    case TransformActionType.moveBy:
      return produce(state, (s: State): State => {
        const key = action.payload.entityId
        const maybeComponent = s.get(key)
        if (maybeComponent) {
          maybeComponent.transform = Transformation.moveBy(action.payload.vector)(maybeComponent.transform)
          s.set(key, maybeComponent)
        }
        return s
      })
    case TransformActionType.moveTo:
      return produce(state, (s: State): State => {
        const key = action.payload.entityId
        const maybeComponent = s.get(key)
        if (maybeComponent) {
          maybeComponent.transform = Transformation.moveTo(action.payload.location)(maybeComponent.transform)
          s.set(key, maybeComponent)
        }
        return s
      })
    default:
      return state
  }
}
