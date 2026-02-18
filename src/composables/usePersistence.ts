import { ref, watch, type Ref } from 'vue'
import {
  loadJsonFromLocalStorage,
  removeLocalStorageKey,
  saveJsonToLocalStorage,
} from '@/lib/persistence'

export interface UsePersistenceReturn<T> {
  state: Ref<T>
  load: () => T
  save: (nextValue?: T) => boolean
  reset: () => boolean
}

export interface UsePersistenceOptions {
  autoSave?: boolean
}

export function usePersistence<T>(
  key: string,
  fallback: T,
  options: UsePersistenceOptions = {}
): UsePersistenceReturn<T> {
  const state = ref(loadJsonFromLocalStorage<T>(key, fallback)) as Ref<T>
  const autoSave = options.autoSave ?? true

  const load = (): T => {
    const loaded = loadJsonFromLocalStorage<T>(key, fallback)
    state.value = loaded
    return loaded
  }

  const save = (nextValue?: T): boolean => {
    const valueToSave = nextValue ?? state.value
    if (nextValue !== undefined) {
      state.value = nextValue
    }
    return saveJsonToLocalStorage(key, valueToSave)
  }

  const reset = (): boolean => {
    state.value = fallback
    removeLocalStorageKey(key)
    return true
  }

  if (autoSave) {
    watch(
      state,
      (next) => {
        saveJsonToLocalStorage(key, next)
      },
      { deep: true }
    )
  }

  return {
    state,
    load,
    save,
    reset,
  }
}
