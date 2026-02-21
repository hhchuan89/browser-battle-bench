export type ShareMode = 'arena' | 'quick' | 'gauntlet' | 'stress' | 'history'

export type ShareGrade = 'S' | 'A' | 'B' | 'C' | 'F'

export type ShareBadgeText = 'GLADIATOR' | 'SURVIVED' | 'WASTED'

export interface ShareScores {
  obedience: number
  intelligence: number
  stability: number
}

export interface ShareResultPayload {
  mode: ShareMode
  scenarioId: string
  scenarioName: string
  modelId: string
  grade: ShareGrade
  badgeText: ShareBadgeText
  scores: ShareScores
  hardwareLabel: string
  taunt: string
  runRef?: string | null
  shareUrl: string
  challengeUrl: string
  nextRoute?: string
}

