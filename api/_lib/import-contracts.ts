import type { PublishReportInput } from './contracts.js'

export type ImportSupportedMode = 'quick' | 'gauntlet'

export interface ImportRawOutputEntry {
  test_id: string
  run: number
  model_id?: string
  output: string
  ttft_ms?: number | null
  total_time_ms?: number | null
  char_timestamps?: number[]
}

export interface ImportRawOutputsFile {
  raw_outputs: ImportRawOutputEntry[]
}

export interface ImportBbbReportModel {
  model_id: string
  model_name?: string
  total_score?: number
  phases?: Record<string, unknown>
}

export interface ImportBbbReportFile {
  version?: string
  timestamp?: string
  test_suite_version: string
  run_hash: string
  replay_hash?: string
  hardware?: Record<string, unknown>
  models_tested: ImportBbbReportModel[]
}

export interface ImportLocalRunRequestBody {
  gladiator_name: string
  github_username?: string | null
  device_id: string
  bbb_report: ImportBbbReportFile
  bbb_raw_outputs: ImportRawOutputsFile
}

export interface ImportValidatedInput extends ImportLocalRunRequestBody {
  github_username: string | null
}

export interface ImportScenarioInfo {
  mode: ImportSupportedMode
  scenario_id: string
  scenario_name: string
}

export interface ImportHashVerificationResult {
  run_hash: string
  replay_hash: string
  computed_run_hash: string
  computed_replay_hash: string
}

export interface ImportScoreResult {
  mode: ImportSupportedMode
  scenario_id: string
  scenario_name: string
  score: number
  grade: PublishReportInput['grade']
  pass_rate: number
  total_rounds: number
  passed_rounds: number
}
