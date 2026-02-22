import { describe, expect, it } from 'vitest'
import {
  getOrCreateDeviceId,
  loadGladiatorIdentity,
  saveGladiatorIdentity,
} from '@/composables/useGladiatorIdentity'
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

describe('useGladiatorIdentity helpers', () => {
  it('creates and persists a device id', () => {
    const storage = createMemoryStorage()
    const id = getOrCreateDeviceId(storage)
    const second = getOrCreateDeviceId(storage)

    expect(id).toBe(second)
    expect(storage.getItem(STORAGE_KEYS.deviceId)).toBe(id)
  })

  it('loads default identity when none exists', () => {
    const storage = createMemoryStorage()
    const identity = loadGladiatorIdentity(storage)

    expect(identity.gladiator_name).toBe('')
    expect(identity.github_username).toBeNull()
    expect(identity.device_id).toBeTruthy()
  })

  it('saves and normalizes identity values', () => {
    const storage = createMemoryStorage()
    const saved = saveGladiatorIdentity(
      {
        gladiatorName: '  ArenaChampion  ',
        githubUsername: '@hhchuan89',
      },
      storage
    )

    expect(saved.gladiator_name).toBe('ArenaChampion')
    expect(saved.github_username).toBe('hhchuan89')

    const loaded = loadGladiatorIdentity(storage)
    expect(loaded.gladiator_name).toBe('ArenaChampion')
    expect(loaded.github_username).toBe('hhchuan89')
  })
})
