import { type CombinedState, type StateFromReducersMapObject, type Store, applyMiddleware, combineReducers, compose, createStore } from 'redux'
import { type UIStateAction, type UserSettingsAction } from './ui/types'
import { uiState, userSettings } from './ui/reducer'
import { type MinimapAction } from './minimap/types'
import { minimap } from './minimap/reducer'
import { type ContourmapAction } from './contourmap/types'
import { contourmap } from './contourmap/reducer'
// const thunk = require('redux-thunk').default
import { type CameraAction } from './camera/types'
import { camera } from './camera/reducer'
import thunk, { type ThunkAction, type ThunkMiddleware } from 'redux-thunk'

import { world } from './world/reducer'
import { heightmap } from './heightmap/reducer'
import { type EntityAction, type TransformAction, type WeaponAction } from './world/types'

// https://github.com/reduxjs/redux-thunk/blob/master/test/typescript.ts
const reducerObject = {
  world,
  userSettings,
  uiState,
  minimap,
  contourmap,
  camera,
  counter: (state = 0, action: any) => (action.type === 'COUNTER_INCREMENT' ? state + 1 : state),
  // replication: replicationReducer,
  heightmap
}
// type StoreAction = ActionFromReducersMapObject<typeof reducerObject>
export type StoreAction
  = UserSettingsAction
  | UIStateAction
  | MinimapAction
  | ContourmapAction
  | CameraAction
  // | ReplicationAction
  | EntityAction
  | TransformAction
  | WeaponAction

export type ThunkResult<R> = ThunkAction<R, any, undefined, StoreAction>
export type StoreState = CombinedState<StateFromReducersMapObject<typeof reducerObject>>
export type Store0 = Store<StoreState, StoreAction>

export const dispatch = (store: Store0, action: StoreAction | ThunkResult<any>) => store.dispatch(action as any)
const reducer = combineReducers(reducerObject)
const w = window as any

export const newStore =
  () => {
    const devTools = process.env.NODE_ENV === 'development' ? [w.__REDUX_DEVTOOLS_EXTENSION__?.({ serialize: true } /* needed to see content of Maps */)] : []
    process.env.NODE_ENV === 'development' ? console.log('NODE_ENV ', process.env.NODE_ENV) : null
    return createStore(
      reducer,
      compose(
        applyMiddleware(
          thunk as ThunkMiddleware<any, StoreAction>),
        ...devTools
      )
    )
  }
