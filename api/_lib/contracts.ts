export type PublishMode = 'arena' | 'quick' | 'gauntlet' | 'stress'
export type ShareGrade = 'S' | 'A' | 'B' | 'C' | 'F'

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
  report_summary: Record<string, unknown>
  created_at: string
}
