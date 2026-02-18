import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from '@/lib/persistence'
import { STORAGE_KEYS } from '@/lib/storage-keys'

const DEFAULT_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

export const getSelectedModelId = (): string =>
  loadJsonFromLocalStorage<string>(STORAGE_KEYS.selectedModel, DEFAULT_MODEL_ID)

export const setSelectedModelId = (modelId: string): boolean =>
  saveJsonToLocalStorage(STORAGE_KEYS.selectedModel, modelId)

export const getDefaultModelId = (): string => DEFAULT_MODEL_ID
