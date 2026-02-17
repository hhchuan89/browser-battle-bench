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
import { useSystemStore } from './systemStore';
import { JudgeLogic } from '../services/warden/JudgeLogic';
import { saveRunHistoryEntry } from '@/lib/run-history';

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
  const battleStartedAt = ref<number | null>(null);

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
        durationMs
      };

      session.value.results.push(result);
      session.value.totalScore += result.score;

      // Brief pause between rounds for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Move to next
      session.value.currentIndex++;
      
      // Continue to next round
      isProcessingRound.value = false;
      await nextRound();

    } catch (error: any) {
      isProcessingRound.value = false;
      
      // Handle panic/warden violation
      if (error.message === 'WARDEN_VIOLATION' || systemStore.isPanic) {
        const result: RoundResult = {
          challengeId: challenge.id,
          passed: false,
          score: 0,
          rawOutput: systemStore.outputStream,
          failureReason: systemStore.panicReason || 'JSON Violation detected',
          durationMs: Date.now() - startTime
        };
        session.value.results.push(result);
        session.value.currentIndex++;
        
        // Continue to next round after panic
        await nextRound();
      } else {
        session.value.errorMessage = error.message;
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
        saveRunHistoryEntry({
          id: `gauntlet-${Date.now()}`,
          mode: 'gauntlet',
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
      } catch (error) {
        console.warn('Failed to persist battle run history', error);
      }
    }

    session.value.status = 'COMPLETE';
    isProcessingRound.value = false;
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
    battleStartedAt.value = null;
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
    resetBattle,
    finishBattle,
    getRoundResult,
    getChallengeResult
  };
});
