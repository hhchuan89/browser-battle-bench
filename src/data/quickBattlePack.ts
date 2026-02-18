import type { BattleScenario, Challenge } from '@/types/battle'

const jsonInstruction = `You must respond ONLY with a valid JSON object in this exact format:
{"reasoning": "your step-by-step thinking here", "answer": "your single letter answer here"}

Do not include any other text, markdown formatting, or explanations outside the JSON.`

const quickChallenges: Challenge[] = [
  {
    id: 'quick-001',
    prompt: `QUICK BATTLE #1\n\nWhat is 24 + 19?\nA) 41\nB) 43\nC) 45\nD) 47\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' },
      },
      required: ['reasoning', 'answer'],
    },
    expectedAnswer: 'B',
    type: 'control',
    category: 'arithmetic',
    description: 'Fast arithmetic check',
  },
  {
    id: 'quick-002',
    prompt: `QUICK BATTLE #2\n\nAll birds have wings.\nA penguin is a bird.\nWhich statement is logically valid?\nA) Penguins can fly\nB) Penguins have wings\nC) Penguins are mammals\nD) Penguins are fish\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' },
      },
      required: ['reasoning', 'answer'],
    },
    expectedAnswer: 'B',
    type: 'control',
    category: 'logic',
    description: 'Simple syllogism speed check',
  },
  {
    id: 'quick-003',
    prompt: `QUICK BATTLE #3\n\nA sign says: "All but 2 are red" among 7 balls.\nHow many are red?\nA) 2\nB) 3\nC) 5\nD) 7\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' },
      },
      required: ['reasoning', 'answer'],
    },
    expectedAnswer: 'C',
    type: 'trap',
    category: 'wordplay',
    description: 'Quick trap question',
  },
]

export const quickBattle30sScenario: BattleScenario = {
  id: 'quick-battle-30s',
  name: 'Quick Battle 30s',
  description: '3 fast rounds with a hard 30-second time limit.',
  challenges: quickChallenges,
  totalChallenges: quickChallenges.length,
  runMode: 'quick',
}
