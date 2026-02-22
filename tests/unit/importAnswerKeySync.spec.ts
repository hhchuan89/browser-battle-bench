import { describe, expect, it } from 'vitest'
import { quickBattle30sScenario } from '@/data/quickBattlePack'
import { logicTrapsGrouped, logicTrapsLevel1 } from '@/data/traps'
import { getSupportedScenarioMap } from '../../api/_lib/import-scenario-map.js'

const toAnswerMap = (scenario: { challenges: Array<{ id: string; expectedAnswer: string }> }) =>
  Object.fromEntries(
    scenario.challenges.map((challenge) => [challenge.id, challenge.expectedAnswer])
  )

describe('import answer key sync', () => {
  it('keeps quick answer key in sync with frontend quick battle pack', () => {
    const map = getSupportedScenarioMap()
    expect(map['quick-battle-30s']?.answers).toEqual(toAnswerMap(quickBattle30sScenario))
  })

  it('keeps gauntlet answer key in sync with frontend traps data', () => {
    const map = getSupportedScenarioMap()
    const expected = toAnswerMap(logicTrapsLevel1)

    expect(map['logic-traps-l1']?.answers).toEqual(expected)
    expect(map['logic-traps-grouped']?.answers).toEqual(toAnswerMap(logicTrapsGrouped))
  })
})
