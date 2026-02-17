import type { AnswerType } from './judge';

/**
 * Battle Types - Core data structures for the Logic Traps battle system
 */

export interface Challenge {
  /** Unique identifier for the challenge */
  id: string;
  /** The prompt text to send to the model */
  prompt: string;
  /** Expected JSON schema for validation */
  expectedSchema: {
    type: 'object';
    properties: {
      reasoning: { type: 'string' };
      answer: { type: 'string' };
    };
    required: string[];
  };
  /** The correct answer (A, B, C, D, or specific value) */
  expectedAnswer: string;
  /** Answer comparison mode */
  answerType?: AnswerType;
  /** Numeric tolerance (when answerType = numeric_tolerance) */
  tolerance?: number;
  /** Whether this is a control question or a trap */
  type: 'control' | 'trap';
  /** Category of the challenge */
  category: 'syllogism' | 'arithmetic' | 'logic' | 'wordplay';
  /** Brief description for UI display */
  description: string;
}

export interface BattleScenario {
  /** Unique identifier for the scenario */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Ordered array of challenges */
  challenges: Challenge[];
  /** Total number of challenges */
  totalChallenges: number;
}

export interface RoundResult {
  /** The challenge that was executed */
  challengeId: string;
  /** Whether the model answered correctly */
  passed: boolean;
  /** Score for this round (0 or 100) */
  score: number;
  /** The model's raw output */
  rawOutput: string;
  /** Parsed answer from the model */
  parsedAnswer?: string;
  /** Reason for failure (if any) */
  failureReason?: string;
  /** Time taken for this round (ms) */
  durationMs: number;
}

export type BattleStatus = 'IDLE' | 'LOADING' | 'FIGHTING' | 'ROUND_COMPLETE' | 'COMPLETE';

export interface BattleSession {
  /** Current scenario being executed */
  scenarioId: string | null;
  /** Current index in the queue */
  currentIndex: number;
  /** Array of results for completed rounds */
  results: RoundResult[];
  /** Current status of the battle */
  status: BattleStatus;
  /** Total score accumulated */
  totalScore: number;
  /** Maximum possible score */
  maxPossibleScore: number;
  /** Error message if battle failed */
  errorMessage?: string;
}
