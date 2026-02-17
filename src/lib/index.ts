export { detectWebGPU, isMobileDevice, getDeviceMemory } from './hardware-detect'
export { normalizeAnswer, extractNumber, stripNonNumeric, isValidJSON, safeJSONParse } from './answer-normalize'
export { getModelFingerprint, getModelFingerprintDetailed, isSameModelVersion } from './model-fingerprint'
export {
  createRunHashMaterial,
  serializeRunHashMaterial,
  generateRunHash,
  generateRunHashFromRawOutputs,
} from './run-hash'
export { createBBBReportBundle, serializeBBBReportBundle } from './report-contract'

// Placeholder for model cache utilities
// export { ModelCache } from './model-cache'
