const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const loadJsonFromLocalStorage = <T>(key: string, fallback: T): T => {
  if (!canUseLocalStorage()) return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const saveJsonToLocalStorage = <T>(key: string, value: T): boolean => {
  if (!canUseLocalStorage()) return false

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const removeLocalStorageKey = (key: string): void => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(key)
}
