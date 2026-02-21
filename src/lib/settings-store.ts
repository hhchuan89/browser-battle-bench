import {
  loadJsonFromLocalStorage,
  removeLocalStorageKey,
  saveJsonToLocalStorage,
} from '@/lib/persistence'
import { STORAGE_KEYS } from '@/lib/storage-keys'

const DEFAULT_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

export interface GistAuthState {
  accessToken: string
  tokenType: string
  scope: string
  createdAt: string
  expiresAt?: string
}

export type GistLeaderboardSource = {
  id: string
  label?: string
}

export const getSelectedModelId = (): string =>
  loadJsonFromLocalStorage<string>(STORAGE_KEYS.selectedModel, DEFAULT_MODEL_ID)

export const setSelectedModelId = (modelId: string): boolean =>
  saveJsonToLocalStorage(STORAGE_KEYS.selectedModel, modelId)

export const getDefaultModelId = (): string => DEFAULT_MODEL_ID

export const getGistAuth = (): GistAuthState | null =>
  loadJsonFromLocalStorage<GistAuthState | null>(STORAGE_KEYS.gistAuth, null)

export const setGistAuth = (auth: GistAuthState): boolean =>
  saveJsonToLocalStorage(STORAGE_KEYS.gistAuth, auth)

export const clearGistAuth = (): void => {
  removeLocalStorageKey(STORAGE_KEYS.gistAuth)
}

export const getGistLeaderboardSources = (): GistLeaderboardSource[] =>
  loadJsonFromLocalStorage<GistLeaderboardSource[]>(STORAGE_KEYS.gistLeaderboardSources, [])

export const setGistLeaderboardSources = (sources: GistLeaderboardSource[]): boolean =>
  saveJsonToLocalStorage(STORAGE_KEYS.gistLeaderboardSources, sources)
