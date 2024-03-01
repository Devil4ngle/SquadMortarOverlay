import { type UserSettings } from './types'

const USER_SETTINGS_KEY = 'USER_SETTINGS_LOCAL_STORAGE_KEY'
export const saveUserSettings: (s: UserSettings) => void =
  (settings) => {
    const value = JSON.stringify(settings)
    window.localStorage.setItem(USER_SETTINGS_KEY, value)
  }

export const loadUserSettings: () => Partial<UserSettings> =
  () => {
    const jsonValue = window.localStorage.getItem(USER_SETTINGS_KEY)
    if (jsonValue !== null && jsonValue !== undefined) {
      return JSON.parse(jsonValue)
    }
    return {}
  }
