/**
 * Logic Traps Dataset
 * 
 * 5 Control Questions (straightforward logic)
 * 5 Trap Questions (misleading premises or tricky wording)
 * 
 * All questions require JSON output: {"reasoning": "...", "answer": "X"}
 */

import type { Challenge, BattleScenario } from '../types/battle';

const jsonInstruction = `You must respond ONLY with a valid JSON object in this exact format:
{"reasoning": "your step-by-step thinking here", "answer": "your single letter answer here"}

Do not include any other text, markdown formatting, or explanations outside the JSON.`;

// ========== CONTROL QUESTIONS (Straightforward Logic) ==========

const controlQuestions: Challenge[] = [
  {
    id: 'ctrl-001',
    prompt: `CONTROL QUESTION #1 - Syllogism\n\nAll mammals are animals.\nAll dogs are mammals.\nTherefore: All dogs are animals.\n\nIs this syllogism valid?\nA) Yes\nB) No\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'A',
    type: 'control',
    category: 'syllogism',
    description: 'Basic valid syllogism'
  },
  {
    id: 'ctrl-002',
    prompt: `CONTROL QUESTION #2 - Arithmetic\n\nWhat is 15 + 27?\nA) 42\nB) 32\nC) 52\nD) 38\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'A',
    type: 'control',
    category: 'arithmetic',
    description: 'Basic addition'
  },
  {
    id: 'ctrl-003',
    prompt: `CONTROL QUESTION #3 - Logic\n\nIf it rains, the ground gets wet.\nThe ground is wet.\nTherefore: It rained.\n\nIs this conclusion necessarily true?\nA) Yes\nB) No\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'B',
    type: 'control',
    category: 'logic',
    description: 'Affirming the consequent fallacy'
  },
  {
    id: 'ctrl-004',
    prompt: `CONTROL QUESTION #4 - Wordplay\n\nWhat has keys but no locks, space but no room, and you can enter but not go in?\nA) A keyboard\nB) A map\nC) A piano\nD) A spaceship\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'A',
    type: 'control',
    category: 'wordplay',
    description: 'Classic riddle'
  },
  {
    id: 'ctrl-005',
    prompt: `CONTROL QUESTION #5 - Logic\n\nAll roses are flowers.\nSome flowers fade quickly.\nTherefore: Some roses fade quickly.\n\nIs this conclusion valid?\nA) Yes\nB) No\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'B',
    type: 'control',
    category: 'logic',
    description: 'Undistributed middle fallacy'
  }
];

// ========== TRAP QUESTIONS (Misleading Premises) ==========

const trapQuestions: Challenge[] = [
  {
    id: 'trap-001',
    prompt: `LOGIC TRAP #1 - False Premise\n\nIf the sky is green, then grass is blue.\nThe sky is green.\nTherefore: Grass is blue.\n\nIs this reasoning logically valid?\nA) Yes\nB) No\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'A',
    type: 'trap',
    category: 'logic',
    description: 'Valid form despite false premise (modus ponens)'
  },
  {
    id: 'trap-002',
    prompt: `LOGIC TRAP #2 - Mathematical Trick\n\nIf 1=3, 2=3, 3=5, 4=4, 5=4, then what does 6 equal?\n(Hint: Count the letters in the English word)\nA) 3\nB) 4\nC) 5\nD) 6\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'A',
    type: 'trap',
    category: 'arithmetic',
    description: 'Letter count pattern (S-I-X = 3 letters)'
  },
  {
    id: 'trap-003',
    prompt: `LOGIC TRAP #3 - Temporal Confusion\n\nA farmer had 17 sheep. All but 9 died.\nHow many sheep does the farmer have now?\nA) 8\nB) 9\nC) 17\nD) 0\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'B',
    type: 'trap',
    category: 'wordplay',
    description: '"All but 9" means 9 survived'
  },
  {
    id: 'trap-004',
    prompt: `LOGIC TRAP #4 - Context Override\n\nIn a strange land:\n- Everyone who owns a cat is happy.\n- Everyone who is happy owns a dog.\n- Alice owns a cat.\n\nWhich MUST be true?\nA) Alice owns a dog\nB) Alice is happy\nC) Both A and B\nD) Neither\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'C',
    type: 'trap',
    category: 'logic',
    description: 'Chained implications'
  },
  {
    id: 'trap-005',
    prompt: `LOGIC TRAP #5 - The Liar's Paradox (Simplified)\n\nA sign says: "This statement is false."\n\nIf the statement is true, then it must be false.\nIf the statement is false, then it must be true.\n\nWhat is the nature of this statement?\nA) It is true\nB) It is false\nC) It is a paradox (self-contradictory)\nD) It is meaningless\n\n${jsonInstruction}`,
    expectedSchema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['reasoning', 'answer']
    },
    expectedAnswer: 'C',
    type: 'trap',
    category: 'logic',
    description: 'Classic liar paradox'
  }
];

// ========== EXPORT SCENARIOS ==========

/** Interleaved challenges: Control, Trap, Control, Trap... */
export const logicTrapsLevel1: BattleScenario = {
  id: 'logic-traps-l1',
  name: 'Logic Traps Level 1',
  description: '10 questions alternating between control questions and logic traps. Tests ability to handle misleading premises.',
  challenges: [
    controlQuestions[0], // ctrl-001
    trapQuestions[0],    // trap-001
    controlQuestions[1], // ctrl-002
    trapQuestions[1],    // trap-002
    controlQuestions[2], // ctrl-003
    trapQuestions[2],    // trap-003
    controlQuestions[3], // ctrl-004
    trapQuestions[3],    // trap-004
    controlQuestions[4], // ctrl-005
    trapQuestions[4],    // trap-005
  ],
  totalChallenges: 10
};

/** All control questions first, then all traps */
export const logicTrapsGrouped: BattleScenario = {
  id: 'logic-traps-grouped',
  name: 'Logic Traps - Grouped',
  description: 'All 5 control questions followed by all 5 trap questions.',
  challenges: [
    ...controlQuestions,
    ...trapQuestions
  ],
  totalChallenges: 10
};

/** Export all challenges individually for custom scenarios */
export { controlQuestions, trapQuestions };

/** All available scenarios */
export const availableScenarios: BattleScenario[] = [
  logicTrapsLevel1,
  logicTrapsGrouped
];
