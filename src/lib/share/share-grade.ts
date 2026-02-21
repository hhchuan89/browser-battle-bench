import type { ShareBadgeText, ShareGrade } from '@/types/share'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const normalizeScore = (score: number): number =>
  Math.round(clamp(Number.isFinite(score) ? score : 0, 0, 100) * 100) / 100

export const gradeFromScore = (score: number): ShareGrade => {
  const safeScore = normalizeScore(score)
  if (safeScore >= 90) return 'S'
  if (safeScore >= 75) return 'A'
  if (safeScore >= 60) return 'B'
  if (safeScore >= 45) return 'C'
  return 'F'
}

export const badgeFromGrade = (grade: ShareGrade): ShareBadgeText =>
  grade === 'S' ? 'GLADIATOR' : grade === 'F' ? 'WASTED' : 'SURVIVED'

export const tauntFromGrade = (grade: ShareGrade): string => {
  switch (grade) {
    case 'S':
      return 'Arena conquered. Challenger status: legendary.'
    case 'A':
      return 'Survived with style. Barely any cracks.'
    case 'B':
      return 'Survived, but barely. Improvements needed.'
    case 'C':
      return "Didn't collapse, but the armor is cracking."
    case 'F':
      return "Didn't even make it to Phase 2."
    default:
      return 'Battle complete.'
  }
}

