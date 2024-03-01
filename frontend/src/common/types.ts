export type Get<T extends { [key in keyof T]: any }, K extends keyof T> = T[K]

export type ActionPayload<S extends { type: T, payload: any }, T> = Extract<S, { type: T }>['payload']

export interface WriteAction<T, S, K extends keyof S> { type: T, payload: { key: K, value: Get<S, K> } }
export interface UpdateAction<T, S, K extends keyof S> { type: T, payload: { key: K, updater: (old: Get<S, K>) => Get<S, K> } }

export type Maybe<T> = T | null
