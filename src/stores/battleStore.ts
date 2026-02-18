/**
 * Battle Store - The Battle Engine
 * 
 * Manages the battle queue, round execution, and scoring.
 * Works with systemStore for LLM inference.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  Challenge, 
  BattleScenario, 
  BattleSession, 
  RoundResult
} from '../types/battle';
import type { BBBReportBundle } from '@/types/report';
import { useSystemStore } from './systemStore';
import { JudgeLogic } from '../services/warden/JudgeLogic';
import { saveRunHistoryEntry } from '@/lib/run-history';
import { saveQuickResultEntry } from '@/lib/quick-results';
import { TEST_SUITE_VERSION } from '@/data/suite-version';
import { createBBBReportBundle, serializeBBBReportBundle } from '@/lib/report-contract';
import { loadHardwareSnapshot } from '@/lib/hardware-snapshot';
import { getSelectedModelId } from '@/lib/settings-store';

export const useBattleStore = defineStore('battle', () => {
  // ========== STATE ==========
  
  const session = ref<BattleSession>({
    scenarioId: null,
    currentIndex: 0,
    results: [],
    status: 'IDLE',
    totalScore: 0,
    maxPossibleScore: 0
  });

  const currentScenario = ref<BattleScenario | null>(null);
  const isProcessingRound = ref(false);
  const stopRequested = ref(false);
  const battleStartedAt = ref<number | null>(null);
  const latestReportBundle = ref<BBBReportBundle | null>(null);

  // ========== GETTERS ==========
  
  const currentChallenge = computed<Challenge | null>(() => {
    if (!currentScenario.value || session.value.currentIndex >= currentScenario.value.challenges.length) {
      return null;
    }
    return currentScenario.value.challenges[session.value.currentIndex];
  });

  const progress = computed(() => {
    if (!currentScenario.value) return { current: 0, total: 0, percentage: 0 };
    const current = session.value.currentIndex;
    const total = currentScenario.value.totalChallenges;
    return {
      current,
      total,
      percentage: Math.round((current / total) * 100)
    };
  });

  const isComplete = computed(() => session.value.status === 'COMPLETE');
  
  const canStart = computed(() => {
    const systemStore = useSystemStore();
    return systemStore.isModelReady && session.value.status === 'IDLE';
  });

  const getMedian = (scores: number[]): number => {
    if (scores.length === 0) return 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  };

  const getVariance = (scores: number[]): number => {
    if (scores.length === 0) return 0;
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const squaredDiff = scores.map((score) => (score - mean) ** 2);
    return squaredDiff.reduce((sum, diff) => sum + diff, 0) / scores.length;
  };

  const resolveSelectedModelId = (): string => getSelectedModelId();

  const createBattleRawOutputs = (): Array<{
    test_id: string;
    run: number;
    model_id: string;
    output: string;
    ttft_ms: number | null;
    total_time_ms: number;
    char_timestamps: number[];
    event_log: Array<Record<string, unknown>>;
  }> => {
    const modelId = resolveSelectedModelId();
    return session.value.results.map((result, index) => ({
      test_id: result.challengeId,
      run: index + 1,
      model_id: modelId,
      output: result.rawOutput,
      ttft_ms: result.ttftMs ?? null,
      total_time_ms: result.totalTimeMs ?? result.durationMs,
      char_timestamps: result.charTimestamps ?? [],
      event_log: [
        {
          type: 'round_complete',
          passed: result.passed,
          failure_reason: result.failureReason || null,
        },
      ],
    }));
  };

  const generateReportBundle = async (): Promise<BBBReportBundle | null> => {
    if (!currentScenario.value || session.value.results.length === 0) {
      latestReportBundle.value = null;
      return null;
    }

    const hardwareSnapshot = loadHardwareSnapshot();
    const modelId = resolveSelectedModelId();
    const scores = session.value.results.map((result) => result.score);
    const totalRounds = currentScenario.value.totalChallenges;
    const passedRounds = session.value.results.filter((result) => result.passed).length;
    const passRate = totalRounds > 0 ? (passedRounds / totalRounds) * 100 : 0;
    const totalScorePct = session.value.maxPossibleScore > 0
      ? (session.value.totalScore / session.value.maxPossibleScore) * 100
      : 0;

    latestReportBundle.value = await createBBBReportBundle({
      modelId,
      modelName: modelId,
      testSuiteVersion: TEST_SUITE_VERSION,
      totalScore: Math.round(totalScorePct * 100) / 100,
      rawOutputs: createBattleRawOutputs(),
      phases: {
        logic_traps: {
          runs: scores.length,
          scores,
          median: Math.round(getMedian(scores) * 100) / 100,
          variance: Math.round(getVariance(scores) * 100) / 100,
          details: {
            scenario_id: currentScenario.value.id,
            scenario_name: currentScenario.value.name,
            passed_rounds: passedRounds,
            total_rounds: totalRounds,
            pass_rate: Math.round(passRate * 100) / 100,
          },
        },
      },
      isMobile: hardwareSnapshot?.is_mobile ?? (typeof navigator !== 'undefined'
        ? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        : false),
      hardware: hardwareSnapshot ? {
        tier: hardwareSnapshot.tier,
        gpu: hardwareSnapshot.gpu,
        estimated_vram_gb: hardwareSnapshot.estimated_vram_gb,
      } : undefined,
    });

    return latestReportBundle.value;
  };

  const exportLatestReportBundle = (): {
    reportJson: string;
    rawOutputsJson: string;
  } | null => {
    if (!latestReportBundle.value) return null;
    return serializeBBBReportBundle(latestReportBundle.value);
  };

  // ========== ACTIONS ==========

  /**
   * Start a new battle with the given scenario
   */
  async function startBattle(scenario: BattleScenario) {
    const systemStore = useSystemStore();
    
    if (!systemStore.isModelReady) {
      session.value.errorMessage = 'Model not ready. Please initialize first.';
      return;
    }

    // Reset session
    currentScenario.value = scenario;
    stopRequested.value = false;
    session.value = {
      scenarioId: scenario.id,
      currentIndex: 0,
      results: [],
      status: 'FIGHTING',
      totalScore: 0,
      maxPossibleScore: scenario.totalChallenges * 100
    };
    battleStartedAt.value = Date.now();

    // Start first round
    await nextRound();
  }

  /**
   * Execute the next round in the queue
   */
  async function nextRound() {
    if (!currentScenario.value) return;
    if (isProcessingRound.value) return;
    if (stopRequested.value) {
      finishBattle();
      return;
    }

    // Check if battle is complete
    if (session.value.currentIndex >= currentScenario.value.challenges.length) {
      finishBattle();
      return;
    }

    isProcessingRound.value = true;
    const challenge = currentChallenge.value;
    if (!challenge) {
      finishBattle();
      return;
    }

    const systemStore = useSystemStore();
    const startTime = Date.now();

    try {
      // Run inference
      await systemStore.runInference(challenge.prompt);
      
      const rawOutput = systemStore.outputStream;
      const durationMs = Date.now() - startTime;
      const timing = systemStore.lastInferenceTimings;
      const totalTimeMs = timing.totalTimeMs ?? durationMs;

      // Judge the result
      const judge = new JudgeLogic();
      const judgment = judge.evaluate(rawOutput, challenge.expectedAnswer, {
        answerType: challenge.answerType,
        tolerance: challenge.tolerance
      });

      // Record result
      const result: RoundResult = {
        challengeId: challenge.id,
        passed: judgment.pass,
        score: judgment.pass ? 100 : 0,
        rawOutput,
        parsedAnswer: judgment.parsedAnswer,
        failureReason: judgment.reason,
        durationMs,
        ttftMs: timing.ttftMs ?? null,
        totalTimeMs,
        charTimestamps: timing.charTimestamps ?? [],
      };

      session.value.results.push(result);
      session.value.totalScore += result.score;

      // Brief pause between rounds for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Move to next
      session.value.currentIndex++;
      
      // Continue to next round
      isProcessingRound.value = false;
      if (stopRequested.value) {
        finishBattle();
        return;
      }
      await nextRound();

    } catch (error: any) {
      isProcessingRound.value = false;
      
      // Handle panic/warden violation
      if (error.message === 'WARDEN_VIOLATION' || systemStore.isPanic) {
        const timing = systemStore.lastInferenceTimings;
        const durationMs = Date.now() - startTime;
        const totalTimeMs = timing.totalTimeMs ?? durationMs;
        const result: RoundResult = {
          challengeId: challenge.id,
          passed: false,
          score: 0,
          rawOutput: systemStore.outputStream,
          failureReason: systemStore.panicReason || 'JSON Violation detected',
          durationMs,
          ttftMs: timing.ttftMs ?? null,
          totalTimeMs,
          charTimestamps: timing.charTimestamps ?? [],
        };
        session.value.results.push(result);
        session.value.currentIndex++;
        
        // Continue to next round after panic
        if (stopRequested.value) {
          finishBattle();
          return;
        }
        await nextRound();
      } else {
        session.value.errorMessage = error.message;
        stopRequested.value = true;
        session.value.status = 'COMPLETE';
      }
    }
  }

  /**
   * Mark battle as complete
   */
  function finishBattle() {
    if (currentScenario.value) {
      const totalRounds = currentScenario.value.totalChallenges;
      const passedRounds = session.value.results.filter(r => r.passed).length;
      const passRate = totalRounds > 0 ? (passedRounds / totalRounds) * 100 : 0;
      const scorePct = session.value.maxPossibleScore > 0
        ? (session.value.totalScore / session.value.maxPossibleScore) * 100
        : 0;
      const durationMs = session.value.results.reduce((sum, result) => sum + result.durationMs, 0);
      const completedAt = new Date().toISOString();

      try {
        const mode = currentScenario.value.runMode ?? 'gauntlet';
        saveRunHistoryEntry({
          id: `${mode}-${Date.now()}`,
          mode,
          scenarioId: currentScenario.value.id,
          scenarioName: currentScenario.value.name,
          startedAt: battleStartedAt.value ? new Date(battleStartedAt.value).toISOString() : completedAt,
          completedAt,
          durationMs,
          passRate: Math.round(passRate * 100) / 100,
          totalRounds,
          passedRounds,
          scorePct: Math.round(scorePct * 100) / 100
        });

        if (mode === 'quick') {
          saveQuickResultEntry({
            id: `quick-result-${Date.now()}`,
            scenarioId: currentScenario.value.id,
            scenarioName: currentScenario.value.name,
            completedAt,
            durationMs,
            passRate: Math.round(passRate * 100) / 100,
            totalRounds,
            passedRounds,
            scorePct: Math.round(scorePct * 100) / 100,
          });
        }
      } catch (error) {
        console.warn('Failed to persist battle run history', error);
      }

      void generateReportBundle();
    }

    stopRequested.value = false;
    session.value.status = 'COMPLETE';
    isProcessingRound.value = false;
  }

  /**
   * Request a graceful stop. If a round is running, it will stop after the round settles.
   */
  function stopBattle(reason?: string) {
    if (reason) {
      session.value.errorMessage = reason;
    }
    stopRequested.value = true;
    if (!isProcessingRound.value) {
      finishBattle();
    }
  }

  /**
   * Reset the battle session
   */
  function resetBattle() {
    session.value = {
      scenarioId: null,
      currentIndex: 0,
      results: [],
      status: 'IDLE',
      totalScore: 0,
      maxPossibleScore: 0
    };
    currentScenario.value = null;
    isProcessingRound.value = false;
    stopRequested.value = false;
    battleStartedAt.value = null;
    latestReportBundle.value = null;
  }

  /**
   * Get results for a specific round
   */
  function getRoundResult(roundIndex: number): RoundResult | undefined {
    return session.value.results[roundIndex];
  }

  /**
   * Get pass/fail status for a challenge by ID
   */
  function getChallengeResult(challengeId: string): RoundResult | undefined {
    return session.value.results.find(r => r.challengeId === challengeId);
  }

  return {
    // State
    session,
    currentScenario,
    isProcessingRound,
    
    // Getters
    currentChallenge,
    progress,
    isComplete,
    canStart,
    
    // Actions
    startBattle,
    nextRound,
    stopBattle,
    resetBattle,
    finishBattle,
    generateReportBundle,
    exportLatestReportBundle,
    latestReportBundle,
    getRoundResult,
    getChallengeResult
  };
});
