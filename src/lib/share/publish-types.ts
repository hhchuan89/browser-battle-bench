import type { EnduranceReport } from '@/types/endurance'
import type { BBBReportJson } from '@/types/report'
import type { ShareGrade, ShareMode, ShareResultPayload } from '@/types/share'
import type { ScoredResponse } from '@/composables/useScorer'
import type { HardwareSnapshot } from '@/lib/hardware-snapshot'
import type { GladiatorIdentity } from '@/composables/useGladiatorIdentity'

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
  gladiator_name: string
  github_username?: string | null
  device_id: string
  canonical_model_id: string
  model_family: string
  param_size: string
  quantization: string
  gpu_name?: string | null
  gpu_vendor?: string | null
  gpu_raw?: string | null
  os_name?: string | null
  browser_name?: string | null
  vram_gb?: number | null
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
  identity: GladiatorIdentity
  hardware?: HardwareSnapshot | null
}

export interface BuildBattlePublishInput {
  payload: ShareResultPayload
  report: BBBReportJson
  tier?: string
  identity: GladiatorIdentity
  hardware?: HardwareSnapshot | null
}

export interface BuildStressPublishInput {
  payload: ShareResultPayload
  report: EnduranceReport
  tier?: string
  identity: GladiatorIdentity
  hardware?: HardwareSnapshot | null
}
