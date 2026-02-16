import { ref } from 'vue'
import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface ModelCacheInfo {
  modelId: string
  size: number
  lastUsed: number
  cached: boolean
}

export interface ModelLoaderProgress {
  modelId: string
  progress: number
  downloaded: number
  total: number
  speed: number // bytes per second
  eta: number // seconds remaining
}

interface BBBDB extends DBSchema {
  models: {
    key: string
    value: {
      id: string
      size: number
      lastUsed: number
      data?: ArrayBuffer
    }
  }
}

export interface UseModelLoaderReturn {
  loadWithProgress: (
    modelId: string,
    onProgress?: (progress: ModelLoaderProgress) => void
  ) => Promise<void>
  getCacheStatus: (modelId: string) => Promise<ModelCacheInfo | null>
  clearCache: (modelId?: string) => Promise<void>
  getCachedModels: () => Promise<ModelCacheInfo[]>
}

/**
 * useModelLoader Composable
 * Core responsibilities:
 * - Parse WebLLM progress callbacks
 * - Calculate ETA and download speed
 * - Manage model cache status
 */
export function useModelLoader(): UseModelLoaderReturn {
  const db = ref<IDBPDatabase<BBBDB> | null>(null)
  const downloadStartTime = ref<number>(0)
  const downloadedBytes = ref<number>(0)
  const totalBytes = ref<number>(0)

  const initDB = async (): Promise<IDBPDatabase<BBBDB>> => {
    if (db.value) return db.value
    
    db.value = await openDB<BBBDB>('bbb-model-cache', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('models')) {
          database.createObjectStore('models', { keyPath: 'id' })
        }
      }
    })
    
    return db.value
  }

  /**
   * Load model with progress tracking
   * Note: Actual WebLLM loading is handled by useWebLLM
   * This tracks cache status and download metrics
   */
  const loadWithProgress = async (
    modelId: string,
    onProgress?: (progress: ModelLoaderProgress) => void
  ): Promise<void> => {
    downloadStartTime.value = Date.now()
    downloadedBytes.value = 0
    
    // Simulate progress for demo purposes
    // In production, this would integrate with WebLLM's progress callback
    const simulateProgress = async () => {
      const steps = 10
      for (let i = 1; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        downloadedBytes.value = (i / steps) * 100000000 // 100MB estimate
        totalBytes.value = 100000000
        
        const elapsed = (Date.now() - downloadStartTime.value) / 1000
        const speed = downloadedBytes.value / elapsed
        const remaining = (totalBytes.value - downloadedBytes.value) / speed
        
        onProgress?.({
          modelId,
          progress: (i / steps) * 100,
          downloaded: downloadedBytes.value,
          total: totalBytes.value,
          speed,
          eta: remaining
        })
      }
    }
    
    await simulateProgress()
    
    // Store cache info
    const database = await initDB()
    await database.put('models', {
      id: modelId,
      size: totalBytes.value,
      lastUsed: Date.now()
    })
  }

  /**
   * Check if a model is cached
   */
  const getCacheStatus = async (modelId: string): Promise<ModelCacheInfo | null> => {
    const database = await initDB()
    const record = await database.get('models', modelId)
    
    if (!record) {
      return null
    }
    
    return {
      modelId: record.id,
      size: record.size,
      lastUsed: record.lastUsed,
      cached: true
    }
  }

  /**
   * Clear model cache
   */
  const clearCache = async (modelId?: string): Promise<void> => {
    const database = await initDB()
    
    if (modelId) {
      await database.delete('models', modelId)
    } else {
      await database.clear('models')
    }
  }

  /**
   * Get all cached models
   */
  const getCachedModels = async (): Promise<ModelCacheInfo[]> => {
    const database = await initDB()
    const records = await database.getAll('models')
    
    return records.map(record => ({
      modelId: record.id,
      size: record.size,
      lastUsed: record.lastUsed,
      cached: true
    }))
  }

  return {
    loadWithProgress,
    getCacheStatus,
    clearCache,
    getCachedModels
  }
}
