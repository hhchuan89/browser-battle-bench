export { detectWebGPU, isMobileDevice, getDeviceMemory } from './hardware-detect'
export { normalizeAnswer, extractNumber, stripNonNumeric, isValidJSON, safeJSONParse } from './answer-normalize'
export { getModelFingerprint, getModelFingerprintDetailed, isSameModelVersion } from './model-fingerprint'
export {
  createRunHashMaterial,
  serializeRunHashMaterial,
  generateRunHash,
  generateRunHashFromRawOutputs,
} from './run-hash'
export {
  createReplayHashMaterial,
  serializeReplayHashMaterial,
  generateReplayHash,
  generateReplayHashFromRawOutputs,
} from './replay-hash'
export { createBBBReportBundle, serializeBBBReportBundle } from './report-contract'
export { analyzeRunDrift } from './drift-analysis'

// Placeholder for model cache utilities
// export { ModelCache } from './model-cache'
export {
  loadJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeLocalStorageKey,
} from './persistence'
