import type { EnduranceReport } from '@/types/endurance'
import type { BBBReportJson } from '@/types/report'
import type { ShareGrade, ShareMode, ShareResultPayload } from '@/types/share'
import type { ScoredResponse } from '@/composables/useScorer'

export type PublishMode = Exclude<ShareMode, 'history'>

export interface PublishReportRequest {
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

export interface PublishedShareLinks {
  id: string
  share_url: string
  canonical_url: string
  og_image_url: string
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

export interface PublicReportResponse extends PublicReportRecord {
  share_url: string
  canonical_url: string
  og_image_url: string
}

export interface GlobalLeaderboardRow extends PublicReportRecord {}

export interface GlobalLeaderboardResponse {
  rows: GlobalLeaderboardRow[]
  total: number
}

export interface BuildArenaPublishInput {
  payload: ShareResultPayload
  score: ScoredResponse
  tier?: string
}

export interface BuildBattlePublishInput {
  payload: ShareResultPayload
  report: BBBReportJson
  tier?: string
}

export interface BuildStressPublishInput {
  payload: ShareResultPayload
  report: EnduranceReport
  tier?: string
}
