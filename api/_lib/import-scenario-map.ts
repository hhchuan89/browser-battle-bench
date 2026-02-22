import type { ImportBbbReportFile, ImportScenarioInfo, ImportSupportedMode } from './import-contracts.js'

export interface ScenarioAnswerKey {
  mode: ImportSupportedMode
  scenario_id: string
  scenario_name: string
  answers: Record<string, string>
}

const QUICK_ANSWER_KEY: Record<string, string> = {
  'quick-001': 'B',
  'quick-002': 'B',
  'quick-003': 'C',
}

const GAUNTLET_ANSWER_KEY: Record<string, string> = {
  'ctrl-001': 'A',
  'trap-001': 'A',
  'ctrl-002': 'A',
  'trap-002': 'A',
  'ctrl-003': 'B',
  'trap-003': 'B',
  'ctrl-004': 'A',
  'trap-004': 'C',
  'ctrl-005': 'B',
  'trap-005': 'C',
}

const SCENARIO_MAP: Record<string, ScenarioAnswerKey> = {
  'quick-battle-30s': {
    mode: 'quick',
    scenario_id: 'quick-battle-30s',
    scenario_name: 'Quick Battle 30s',
    answers: QUICK_ANSWER_KEY,
  },
  'logic-traps-l1': {
    mode: 'gauntlet',
    scenario_id: 'logic-traps-l1',
    scenario_name: 'Logic Traps Level 1',
    answers: GAUNTLET_ANSWER_KEY,
  },
  'logic-traps-grouped': {
    mode: 'gauntlet',
    scenario_id: 'logic-traps-grouped',
    scenario_name: 'Logic Traps - Grouped',
    answers: GAUNTLET_ANSWER_KEY,
  },
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const getSupportedScenarioMap = (): Record<string, ScenarioAnswerKey> => SCENARIO_MAP

export const resolveImportScenario = (report: ImportBbbReportFile): ImportScenarioInfo => {
  const firstModel = report.models_tested[0]
  const phases = isRecord(firstModel.phases) ? firstModel.phases : null
  const logicTraps = phases && isRecord(phases.logic_traps) ? phases.logic_traps : null
  const details = logicTraps && isRecord(logicTraps.details) ? logicTraps.details : null

  const scenarioIdRaw =
    (details?.scenario_id && String(details.scenario_id).trim()) || ''
  if (!scenarioIdRaw) {
    throw new Error('bbb_report missing phases.logic_traps.details.scenario_id')
  }

  const mapped = SCENARIO_MAP[scenarioIdRaw]
  if (!mapped) {
    throw new Error(`Unsupported scenario_id for import: ${scenarioIdRaw}`)
  }

  const scenarioNameRaw =
    (details?.scenario_name && String(details.scenario_name).trim()) || ''

  return {
    mode: mapped.mode,
    scenario_id: mapped.scenario_id,
    scenario_name: scenarioNameRaw || mapped.scenario_name,
  }
}
