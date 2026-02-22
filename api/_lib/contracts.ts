export type PublishMode = 'arena' | 'quick' | 'gauntlet' | 'stress'
export type ShareGrade = 'S' | 'A' | 'B' | 'C' | 'F'
export type IngestSource = 'live' | 'import_local'
export type IntegrityStatus = 'hash_verified' | 'legacy'

export interface PublishReportInput {
  mode: PublishMode
  scenario_id: string
  scenario_name: string
  model_id: string
  score: number
  grade: ShareGrade
  tier: string
  pass_rate?: number | null
  total_rounds?: number | null
  passed_rounds?: number | null
  run_hash?: string | null
  replay_hash?: string | null
  source_run_ref?: string | null
  gladiator_name: string
  github_username?: string | null
  device_id: string
  canonical_model_id?: string | null
  model_family?: string | null
  param_size?: string | null
  quantization?: string | null
  gpu_name?: string | null
  gpu_vendor?: string | null
  gpu_raw?: string | null
  os_name?: string | null
  browser_name?: string | null
  vram_gb?: number | null
  ingest_source?: IngestSource | null
  integrity_status?: IntegrityStatus | null
  report_summary: Record<string, unknown>
  bbb_report?: Record<string, unknown>
}

export interface StoredReportRow {
  id: string
  mode?: string | null
  scenario_id?: string | null
  scenario_name?: string | null
  model_id?: string | null
  score?: number | string | null
  grade?: string | null
  tier?: string | null
  pass_rate?: number | string | null
  total_rounds?: number | null
  passed_rounds?: number | null
  run_hash?: string | null
  replay_hash?: string | null
  source_run_ref?: string | null
  gladiator_name?: string | null
  github_username?: string | null
  device_id?: string | null
  canonical_model_id?: string | null
  model_family?: string | null
  param_size?: string | null
  quantization?: string | null
  gpu_name?: string | null
  gpu_vendor?: string | null
  gpu_raw?: string | null
  os_name?: string | null
  browser_name?: string | null
  vram_gb?: number | string | null
  ingest_source?: string | null
  integrity_status?: string | null
  report_summary?: Record<string, unknown> | null
  raw_json?: Record<string, unknown> | null
  created_at?: string | null
}

export interface PublicReportRecord {
  id: string
  mode: PublishMode
  scenario_id: string
  scenario_name: string
  model_id: string
  score: number
  grade: ShareGrade
  tier: string
  pass_rate?: number | null
  total_rounds?: number | null
  passed_rounds?: number | null
  run_hash?: string | null
  replay_hash?: string | null
  source_run_ref?: string | null
  gladiator_name: string
  github_username?: string | null
  device_id: string
  canonical_model_id?: string | null
  model_family?: string | null
  param_size?: string | null
  quantization?: string | null
  gpu_name?: string | null
  gpu_vendor?: string | null
  gpu_raw?: string | null
  os_name?: string | null
  browser_name?: string | null
  vram_gb?: number | null
  ingest_source: IngestSource
  integrity_status: IntegrityStatus
  report_summary: Record<string, unknown>
  created_at: string
}
