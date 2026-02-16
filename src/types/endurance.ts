/**
 * Endurance Types - Stress testing data structures
 */

export interface MemorySnapshot {
  /** Round number */
  round: number;
  /** Used heap in MB (if available) */
  heapUsed: number | null;
  /** Total heap in MB (if available) */
  heapTotal: number | null;
  /** Timestamp */
  timestamp: number;
}

export interface LatencyRecord {
  /** Round number */
  round: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Duration in ms */
  durationMs: number;
}

export interface ConcurrentResult {
  /** Request ID */
  requestId: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Duration in ms */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Raw output */
  rawOutput?: string;
  /** Error message if failed */
  error?: string;
}

export interface EnduranceScenario {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Test type */
  type: 'sequential' | 'concurrent' | 'mixed';
  /** Number of rounds */
  rounds: number;
  /** Concurrent requests (for concurrent/mixed types) */
  concurrency?: number;
  /** Test prompt */
  prompt: string;
  /** Expected answer for validation */
  expectedAnswer: string;
  /** Description */
  description: string;
}

export type EnduranceStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE' | 'ERROR';

export interface EnduranceSession {
  /** Current scenario ID */
  scenarioId: string | null;
  /** Current round */
  currentRound: number;
  /** Total rounds */
  totalRounds: number;
  /** Session status */
  status: EnduranceStatus;
  /** Memory snapshots */
  memorySnapshots: MemorySnapshot[];
  /** Latency records */
  latencyLog: LatencyRecord[];
  /** Concurrent results (for concurrent tests) */
  concurrentResults: ConcurrentResult[];
  /** Peak memory observed */
  peakMemory: number;
  /** Baseline memory at start */
  baselineMemory: number;
  /** Average latency */
  averageLatency: number;
  /** Error message */
  errorMessage?: string;
  /** Test start time */
  startTime?: number;
  /** Test end time */
  endTime?: number;
}

export interface EnduranceReport {
  /** Scenario name */
  scenarioName: string;
  /** Total time in ms */
  totalTimeMs: number;
  /** Peak memory in MB */
  peakMemoryMB: number;
  /** Baseline memory in MB */
  baselineMemoryMB: number;
  /** Memory leak rate (MB per round) */
  leakRateMBPerRound: number;
  /** Average latency in ms */
  averageLatencyMs: number;
  /** Pass rate percentage */
  passRate: number;
  /** Total rounds */
  totalRounds: number;
  /** Passed rounds */
  passedRounds: number;
  /** Verdict */
  verdict: 'STABLE' | 'MEMORY_LEAK' | 'CONCURRENCY_ISSUES' | 'UNSTABLE';
  /** Timestamp */
  timestamp: string;
}
