export const SHADER_FALLBACK_MODEL_IDS = [
  'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Llama-3.1-8B-Instruct-q4f16_1-MLC',
] as const

export const isShaderModuleErrorMessage = (message?: string | null): boolean => {
  const normalized = String(message || '').toLowerCase()
  if (!normalized) return false
  return (
    normalized.includes('invalid shadermodule') ||
    normalized.includes('shadermodule') ||
    normalized.includes('copy_single_page_kernel') ||
    normalized.includes('while validating compute stage')
  )
}

export const pickAlternateModel = (
  currentModelId: string,
  candidates: readonly string[] = SHADER_FALLBACK_MODEL_IDS
): string | null => {
  const preferred = candidates.find((modelId) => modelId !== currentModelId)
  return preferred || null
}

export const clearWebLlmCaches = async (): Promise<void> => {
  if (typeof window === 'undefined') return
  const hints = ['webllm', 'mlc', 'bbb-model-cache']

  if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
    try {
      const keys = await caches.keys()
      const targetKeys = keys.filter((key) =>
        hints.some((hint) => key.toLowerCase().includes(hint))
      )
      await Promise.all(targetKeys.map((key) => caches.delete(key)))
    } catch {
      // ignore cache storage failures
    }
  }

  if (typeof indexedDB === 'undefined') return
  const candidates = new Set<string>(['bbb-model-cache', 'webllm', 'webllm-model-cache'])
  const databases = (
    indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }
  ).databases
  if (typeof databases === 'function') {
    try {
      const discovered = await databases.call(indexedDB)
      for (const entry of discovered || []) {
        const name = (entry?.name || '').trim()
        if (!name) continue
        if (hints.some((hint) => name.toLowerCase().includes(hint))) {
          candidates.add(name)
        }
      }
    } catch {
      // ignore unsupported browser API failures
    }
  }

  await Promise.all(
    Array.from(candidates).map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const request = indexedDB.deleteDatabase(name)
            request.onsuccess = () => resolve()
            request.onerror = () => resolve()
            request.onblocked = () => resolve()
          } catch {
            resolve()
          }
        })
    )
  )
}
