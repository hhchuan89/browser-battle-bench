import { describe, expect, it } from 'vitest'
import { usePersistence } from '@/composables/usePersistence'
import { STORAGE_KEYS } from '@/lib/storage-keys'

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

describe('usePersistence', () => {
  it('loads fallback when storage is empty', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const modelPreference = usePersistence<string>(
      STORAGE_KEYS.selectedModel,
      'default-model',
      { autoSave: false }
    )

    expect(modelPreference.state.value).toBe('default-model')
  })

  it('saves provided value and reloads it', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const modelPreference = usePersistence<string>(
      STORAGE_KEYS.selectedModel,
      'default-model',
      { autoSave: false }
    )

    const ok = modelPreference.save('new-model')
    expect(ok).toBe(true)
    expect(modelPreference.load()).toBe('new-model')
  })

  it('resets state and clears key', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const modelPreference = usePersistence<string>(
      STORAGE_KEYS.selectedModel,
      'default-model',
      { autoSave: false }
    )

    modelPreference.save('new-model')
    modelPreference.reset()

    expect(modelPreference.state.value).toBe('default-model')
    expect(storage.getItem(STORAGE_KEYS.selectedModel)).toBeNull()
  })
})
