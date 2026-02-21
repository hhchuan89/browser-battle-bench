import type { BBBReportJson } from '@/types/report'
import type { RunHistoryEntry, RunMode } from '@/lib/run-history'
import { fetchGistReport } from '@/lib/gist-client'
import { getGistLeaderboardSources } from '@/lib/settings-store'

export interface RemoteRunEntry extends RunHistoryEntry {
  source: string
}

export const normalizeGistId = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[a-f0-9]{20,40}$/i.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.hostname !== 'gist.github.com') return null
    const parts = url.pathname.split('/').filter(Boolean)
    return parts.length >= 2 ? parts[1] : null
  } catch {
    return null
  }
}

const mapReportToRunEntry = (report: BBBReportJson, source: string): RemoteRunEntry | null => {
  const model = report.models_tested?.[0]
  if (!model) return null

  const phase = model.phases?.logic_traps
  const details = phase?.details as {
    scenario_id?: string
    scenario_name?: string
    pass_rate?: number
    total_rounds?: number
    passed_rounds?: number
  } | undefined

  const scenarioId = details?.scenario_id ?? 'logic-traps'
  const scenarioName = details?.scenario_name ?? 'Logic Traps'
  const passRate = typeof details?.pass_rate === 'number' ? details.pass_rate : 0
  const totalRounds = typeof details?.total_rounds === 'number' ? details.total_rounds : 0
  const passedRounds = typeof details?.passed_rounds === 'number' ? details.passed_rounds : 0

  return {
    id: `${source}:${report.run_hash}`,
    mode: (details?.scenario_id ? 'gauntlet' : 'gauntlet') as RunMode,
    scenarioId,
    scenarioName,
    completedAt: report.timestamp,
    durationMs: 0,
    passRate,
    totalRounds,
    passedRounds,
    scorePct: model.total_score,
    source,
  }
}

export const loadRemoteLeaderboardEntries = async (
  gistIds: string[],
  token?: string
): Promise<RemoteRunEntry[]> => {
  const entries: RemoteRunEntry[] = []
  for (const id of gistIds) {
    try {
      const report = await fetchGistReport(id, token)
      if (!report) continue
      const entry = mapReportToRunEntry(report.report, id)
      if (entry) entries.push(entry)
    } catch {
      // ignore individual fetch failures to keep the board resilient
    }
  }
  return entries
}

export const loadRemoteSourcesFromSettings = (): string[] =>
  getGistLeaderboardSources().map((source) => source.id)

export const parseGistSourceInput = (value: string): string[] => {
  const parts = value
    .split(/[,\\n]+/g)
    .map((part) => normalizeGistId(part))
    .filter((id): id is string => Boolean(id))
  return Array.from(new Set(parts))
}
