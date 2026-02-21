export type Stage = 'arena' | 'quick' | 'gauntlet' | 'stress' | 'leaderboard'

export interface NextStageOptions {
  stressBlocked?: boolean
}

export const getNextStage = (
  current: Stage,
  options: NextStageOptions = {}
): Stage => {
  switch (current) {
    case 'arena':
      return 'quick'
    case 'quick':
      return 'gauntlet'
    case 'gauntlet':
      return options.stressBlocked ? 'leaderboard' : 'stress'
    case 'stress':
      return 'leaderboard'
    case 'leaderboard':
      return 'leaderboard'
    default:
      return 'leaderboard'
  }
}

export const getNextRoute = (
  current: Stage,
  options: NextStageOptions = {}
): string => `/${getNextStage(current, options)}`

