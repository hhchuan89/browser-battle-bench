import type { BattleScenario } from '@/types/battle'

type ArenaMode = 'gauntlet' | 'quick'

type ScenarioRef = Pick<BattleScenario, 'id' | 'runMode'> | null | undefined

export function resolveScenarioMode(scenario: ScenarioRef): ArenaMode {
  return scenario?.runMode ?? 'gauntlet'
}

export function isScenarioCompatibleForArenaView(
  scenario: ScenarioRef,
  viewMode: ArenaMode,
  allowedScenarioIds: string[],
): boolean {
  if (!scenario) return true
  if (!allowedScenarioIds.includes(scenario.id)) return false
  return resolveScenarioMode(scenario) === viewMode
}
