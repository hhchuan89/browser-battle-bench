import { describe, expect, it } from 'vitest'
import {
  loadJsonFromLocalStorage,
  removeLocalStorageKey,
  saveJsonToLocalStorage,
} from '@/lib/persistence'

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('persistence helpers', () => {
  it('loads fallback when key does not exist', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    expect(loadJsonFromLocalStorage('missing:key', { ok: true })).toEqual({
      ok: true,
    })
  })

  it('saves and loads JSON payloads', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const saved = saveJsonToLocalStorage('bbb:test', { count: 2 })
    expect(saved).toBe(true)
    expect(loadJsonFromLocalStorage('bbb:test', { count: 0 })).toEqual({
      count: 2,
    })
  })

  it('removes stored keys', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    saveJsonToLocalStorage('bbb:test', { x: 1 })
    removeLocalStorageKey('bbb:test')

    expect(loadJsonFromLocalStorage('bbb:test', null)).toBeNull()
  })

  it('falls back when localStorage contains invalid JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem('bbb:invalid', '{not-valid-json')

    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    expect(loadJsonFromLocalStorage('bbb:invalid', { safe: true })).toEqual({
      safe: true,
    })
  })
})
