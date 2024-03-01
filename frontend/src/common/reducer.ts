import produce from 'immer'
import { type Action } from 'redux'

export const newSingleActionReducer = <T, S, K extends keyof S & string>(
  actionType: T,
  init: () => S,
  transition: ((state: S, payload: { key: K, value: S[K] }) => S)
) => (
    state: S,
    action: { type: T, payload: { key: K, value: S[K] } }
  ): S => {
    if (state === undefined) {
      return init()
    }
    if (action.type !== actionType) {
      return state
    }
    return transition(state, action.payload)
  }

export const immerUpdateTransition = <S, K extends keyof S & string>(state: S, payload: { key: K, value: S[K] }): S => {
  const { key, value } = payload
  return produce(state, (draft: S) => {
    if (draft[key] !== undefined) {
      draft[key] = value
    } else {
      console.warn('trying to update nonexistent key in reducer')
    }
  })
}

export const basicReducer: <S, A extends Action>(init: () => S, transition: (state: S, action: A) => S) => (state: S, action: A) => S =
  // this is mostly a reminder what redux reducers need to do...
  (init, transition) => (state, action) => {
    if (state === undefined) {
      return init()
    }
    // if (actionTypeCheck(action.type)){
    return transition(state, action)
    // } else {
    //  return state;
    // }
  }
