export const STORAGE_KEYS = {
  selectedModel: 'bbb:selectedModel',
  runHistory: 'bbb:run-history:v1',
  hardwareSnapshot: 'bbb:hardwareSnapshot',
  quickResults: 'bbb:quick-results:v1',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
