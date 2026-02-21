import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { loadJsonFromLocalStorage } from '@/lib/persistence'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { RunHistoryEntry } from '@/lib/run-history'
import type { QuickResultEntry } from '@/lib/quick-results'
import type { GistAuthState, GistLeaderboardSource } from '@/lib/settings-store'

interface BBBCoreDb extends DBSchema {
  battles: {
    key: string
    value: RunHistoryEntry
  }
  crash_reports: {
    key: string
    value: Record<string, unknown>
  }
  settings: {
    key: string
    value: unknown
  }
  gist_cache: {
    key: string
    value: Record<string, unknown>
  }
  quick_results: {
    key: string
    value: QuickResultEntry
  }
}

const DB_NAME = 'bbb-core'
const DB_VERSION = 1
const MIGRATION_KEY = 'migration:legacy-v1'

let dbPromise: Promise<IDBPDatabase<BBBCoreDb>> | null = null

export const openCoreDb = (): Promise<IDBPDatabase<BBBCoreDb>> => {
  if (!dbPromise) {
    dbPromise = openDB<BBBCoreDb>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('battles')) {
          database.createObjectStore('battles', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('crash_reports')) {
          database.createObjectStore('crash_reports', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings')
        }
        if (!database.objectStoreNames.contains('gist_cache')) {
          database.createObjectStore('gist_cache')
        }
        if (!database.objectStoreNames.contains('quick_results')) {
          database.createObjectStore('quick_results', { keyPath: 'id' })
        }
      },
    })
  }

  return dbPromise
}

const setSettingValue = async (key: string, value: unknown): Promise<void> => {
  const db = await openCoreDb()
  await db.put('settings', value, key)
}

const getSettingValue = async <T>(key: string): Promise<T | null> => {
  const db = await openCoreDb()
  const value = await db.get('settings', key)
  return (value ?? null) as T | null
}

export const migrateLegacyStorage = async (): Promise<void> => {
  const db = await openCoreDb()
  const migrated = await getSettingValue<boolean>(MIGRATION_KEY)
  if (migrated) return

  const runHistory = loadJsonFromLocalStorage<RunHistoryEntry[]>(
    STORAGE_KEYS.runHistory,
    []
  )
  const quickResults = loadJsonFromLocalStorage<QuickResultEntry[]>(
    STORAGE_KEYS.quickResults,
    []
  )
  const selectedModel = loadJsonFromLocalStorage<string | null>(
    STORAGE_KEYS.selectedModel,
    null
  )
  const gistAuth = loadJsonFromLocalStorage<GistAuthState | null>(
    STORAGE_KEYS.gistAuth,
    null
  )
  const gistSources = loadJsonFromLocalStorage<GistLeaderboardSource[]>(
    STORAGE_KEYS.gistLeaderboardSources,
    []
  )

  const battleTx = db.transaction('battles', 'readwrite')
  for (const entry of runHistory) {
    await battleTx.store.put(entry)
  }
  await battleTx.done

  const quickTx = db.transaction('quick_results', 'readwrite')
  for (const entry of quickResults) {
    await quickTx.store.put(entry)
  }
  await quickTx.done

  if (selectedModel) {
    await setSettingValue('selectedModel', selectedModel)
  }
  if (gistAuth) {
    await setSettingValue('gistAuth', gistAuth)
  }
  if (gistSources.length > 0) {
    await setSettingValue('gistLeaderboardSources', gistSources)
  }

  await setSettingValue(MIGRATION_KEY, true)
}
