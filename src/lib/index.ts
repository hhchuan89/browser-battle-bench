export { detectHardwareProfile } from './hardware-detect'
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
export { getSelectedModelId, setSelectedModelId, getDefaultModelId } from './settings-store'
export {
  loadQuickResults,
  saveQuickResultEntry,
  clearQuickResults,
  getLatestQuickResult,
} from './quick-results'
export { STORAGE_KEYS } from './storage-keys'

// Placeholder for model cache utilities
// export { ModelCache } from './model-cache'
export {
  loadJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeLocalStorageKey,
} from './persistence'
