/**
 * model-fingerprint.ts
 * 
 * Calculates SHA-256 fingerprint of the first 1MB of model weights
 * for Ghost Battle compatibility (v3.3).
 * 
 * This fingerprint helps identify specific model versions and enables
 * reproducible benchmarking across sessions.
 */

export interface ModelFingerprintResult {
  fingerprint: string
  modelId: string
  timestamp: number
}

/**
 * Get SHA-256 fingerprint of first 1MB of model weights
 * 
 * @param modelId - The model identifier (e.g., 'Llama-3.2-1B-Instruct-q4f16_1-MLC')
 * @returns 16-character hex fingerprint string
 */
export async function getModelFingerprint(modelId: string): Promise<string> {
  try {
    // Try to access WebLLM cache
    const cache = await caches.open('webllm/model')
    
    // Try common shard filenames
    const shardFiles = [
      modelId + '/params_shard_0',
      modelId + '/ndarray-shard0',
      'params_shard_0'
    ]
    
    for (const shardFile of shardFiles) {
      const response = await cache.match(shardFile)
      if (response) {
        const buffer = await response.arrayBuffer()
        // Sample first 1MB
        const sampleSize = Math.min(1024 * 1024, buffer.byteLength)
        const sample = buffer.slice(0, sampleSize)
        
        // Calculate SHA-256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', sample)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        
        // Return first 16 chars as fingerprint
        return hashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 16)
      }
    }
    
    return 'unknown'
  } catch (error) {
    console.warn('Failed to calculate model fingerprint:', error)
    return 'unknown'
  }
}

/**
 * Get detailed fingerprint result with metadata
 */
export async function getModelFingerprintDetailed(
  modelId: string
): Promise<ModelFingerprintResult> {
  const fingerprint = await getModelFingerprint(modelId)
  
  return {
    fingerprint,
    modelId,
    timestamp: Date.now()
  }
}

/**
 * Compare two model fingerprints to check if they're the same version
 */
export function isSameModelVersion(fingerprint1: string, fingerprint2: string): boolean {
  return fingerprint1 === fingerprint2 && fingerprint1 !== 'unknown'
}
