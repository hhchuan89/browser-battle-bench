export interface BBBRawOutputEntry {
  test_id: string
  run: number
  model_id: string
  output: string
  ttft_ms?: number | null
  total_time_ms?: number | null
  tokens_generated?: number | null
  char_timestamps?: number[]
  event_log?: Array<Record<string, unknown>>
}

export interface BBBRawOutputsFile {
  raw_outputs: BBBRawOutputEntry[]
}

export interface BBBPhaseSummary {
  runs: number
  scores: number[]
  median: number
  variance: number
  details?: Record<string, unknown>
}

export interface BBBModelReport {
  model_id: string
  model_name: string
  model_weight_fingerprint?: string
  webllm_version: string
  phases: Record<string, BBBPhaseSummary>
  total_score: number
}

export interface BBBHardwareReport {
  tier: string
  gpu: string
  browser: string
  os: string
  estimated_vram_gb: number
}

export interface BBBReportJson {
  version: string
  timestamp: string
  app_version: string
  test_suite_version: string
  run_hash: string
  replay_hash?: string
  is_mobile: boolean
  hardware: BBBHardwareReport
  models_tested: BBBModelReport[]
  ollama_baseline: Record<string, unknown> | null
}

export interface BBBReportBundle {
  report: BBBReportJson
  rawOutputs: BBBRawOutputsFile
}
