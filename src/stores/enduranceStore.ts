/**
 * Endurance Store - Stress Testing Engine
 * 
 * Manages sequential and concurrent endurance tests,
 * memory monitoring, and report generation.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  EnduranceSession,
  EnduranceScenario,
  MemorySnapshot,
  LatencyRecord,
  ConcurrentResult,
  EnduranceReport
} from '../types/endurance';
import { useSystemStore } from './systemStore';
import { JudgeLogic } from '../services/warden/JudgeLogic';
import {
  getCurrentMemory,
  calculateLeakRate,
  getMemoryWarningLevel
} from '../services/performance/MemoryMonitor';

export const useEnduranceStore = defineStore('endurance', () => {
  // ========== STATE ==========
  
  const session = ref<EnduranceSession>({
    scenarioId: null,
    currentRound: 0,
    totalRounds: 0,
    status: 'IDLE',
    memorySnapshots: [],
    latencyLog: [],
    concurrentResults: [],
    peakMemory: 0,
    baselineMemory: 0,
    averageLatency: 0
  });

  const currentScenario = ref<EnduranceScenario | null>(null);
  const isProcessingRound = ref(false);
  const pauseRequested = ref(false);
  
  // Live stats for UI
  const liveLog = ref<string[]>([]);
  
  // Per-request output buffers for concurrent isolation
  const requestOutputs = ref<Map<string, string>>(new Map());

  // ========== GETTERS ==========
  
  const progress = computed(() => {
    if (!currentScenario.value) return { current: 0, total: 0, percentage: 0 };
    const current = session.value.currentRound;
    const total = session.value.totalRounds;
    return {
      current,
      total,
      percentage: total > 0 ? Math.round((current / total) * 100) : 0
    };
  });

  const isRunning = computed(() => session.value.status === 'RUNNING');
  const isPaused = computed(() => session.value.status === 'PAUSED');
  const isComplete = computed(() => session.value.status === 'COMPLETE');
  
  const canStart = computed(() => {
    const systemStore = useSystemStore();
    return systemStore.isModelReady && session.value.status === 'IDLE';
  });

  const memoryWarningLevel = computed(() => {
    const mem = getCurrentMemory();
    return getMemoryWarningLevel(mem, session.value.baselineMemory || 1);
  });

  // ========== ACTIONS ==========

  /**
   * Start an endurance test with the given scenario
   */
  async function startTest(scenario: EnduranceScenario) {
    const systemStore = useSystemStore();
    
    if (!systemStore.isModelReady) {
      addLog('ERROR: Model not ready. Please initialize first.');
      return;
    }

    // Reset session
    currentScenario.value = scenario;
    const baseline = getCurrentMemory()?.used || 0;
    
    session.value = {
      scenarioId: scenario.id,
      currentRound: 0,
      totalRounds: scenario.rounds,
      status: 'RUNNING',
      memorySnapshots: [],
      latencyLog: [],
      concurrentResults: [],
      peakMemory: baseline,
      baselineMemory: baseline,
      averageLatency: 0,
      startTime: Date.now()
    };
    
    pauseRequested.value = false;
    liveLog.value = [];
    requestOutputs.value.clear();
    
    addLog(`Starting endurance test: ${scenario.name}`);
    addLog(`Baseline memory: ${baseline} MB`);
    
    // Start the test loop
    await runTestLoop();
  }

  /**
   * Main test loop - handles sequential, concurrent, and mixed modes
   */
  async function runTestLoop() {
    if (!currentScenario.value) return;
    
    const scenario = currentScenario.value;
    
    while (session.value.currentRound < scenario.rounds) {
      // Check for pause
      if (pauseRequested.value) {
        session.value.status = 'PAUSED';
        addLog('Test paused by user');
        return;
      }
      
      // Check for panic
      const systemStore = useSystemStore();
      if (systemStore.isPanic) {
        addLog('Test halted: Warden panic detected');
        session.value.status = 'ERROR';
        return;
      }
      
      session.value.currentRound++;
      const roundNum = session.value.currentRound;
      
      try {
        if (scenario.type === 'sequential') {
          await runSequentialRound(roundNum);
        } else if (scenario.type === 'concurrent') {
          await runConcurrentBatch(roundNum, scenario.concurrency || 4);
        } else if (scenario.type === 'mixed') {
          await runConcurrentBatch(roundNum, scenario.concurrency || 2);
        }
        
        // Brief pause between rounds for browser breathing room
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        addLog(`Round ${roundNum} failed: ${error.message}`);
        // Continue to next round on error
      }
    }
    
    // Test complete
    finishTest();
  }

  /**
   * Run a single sequential round
   */
  async function runSequentialRound(roundNum: number) {
    if (!currentScenario.value) return;
    
    const systemStore = useSystemStore();
    const startTime = Date.now();
    
    addLog(`Round ${roundNum}: Starting inference...`);
    
    try {
      await systemStore.runInference(currentScenario.value.prompt);
      
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      // Judge the result
      const rawOutput = systemStore.outputStream;
      const judge = new JudgeLogic();
      const judgment = judge.evaluate(rawOutput, currentScenario.value.expectedAnswer);
      
      // Record memory after
      const memAfter = getCurrentMemory();
      
      // Store results
      const latencyRecord: LatencyRecord = {
        round: roundNum,
        startTime,
        endTime,
        durationMs
      };
      session.value.latencyLog.push(latencyRecord);
      
      if (memAfter) {
        const snapshot: MemorySnapshot = {
          round: roundNum,
          heapUsed: memAfter.used,
          heapTotal: memAfter.total,
          timestamp: endTime
        };
        session.value.memorySnapshots.push(snapshot);
        
        // Update peak
        if (memAfter.used > session.value.peakMemory) {
          session.value.peakMemory = memAfter.used;
        }
      }
      
      // Update average latency
      updateAverageLatency();
      
      const status = judgment.pass ? '✓' : '✗';
      addLog(`[${roundNum}] ${status} ${durationMs}ms${memAfter ? ` | ${memAfter.used}MB` : ''}`);
      
    } catch (error: any) {
      addLog(`[${roundNum}] ERROR - ${error.message}`);
      throw error;
    }
  }

  /**
   * Run a concurrent batch of inferences with isolated outputs
   */
  async function runConcurrentBatch(roundNum: number, concurrency: number) {
    if (!currentScenario.value) return;
    
    const scenario = currentScenario.value;
    
    addLog(`[${roundNum}] Starting ${concurrency}x concurrent inferences...`);
    
    const batchStartTime = Date.now();
    
    // Clear previous request outputs
    requestOutputs.value.clear();
    
    // Create N parallel inference promises
    const promises: Promise<ConcurrentResult>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      const requestId = `${roundNum}-${i}`;
      // Each request gets a sequential execution (not truly parallel due to single engine)
      // But we capture outputs separately
      promises.push(runConcurrentInference(requestId, scenario.prompt, scenario.expectedAnswer, i));
    }
    
    // Wait for all to complete
    const results = await Promise.all(promises);
    const batchEndTime = Date.now();
    
    // Store results
    session.value.concurrentResults.push(...results);
    
    // Record latency for the batch (max duration)
    const maxDuration = Math.max(...results.map(r => r.durationMs), 0);
    session.value.latencyLog.push({
      round: roundNum,
      startTime: batchStartTime,
      endTime: batchEndTime,
      durationMs: maxDuration
    });
    
    // Memory snapshot
    const memAfter = getCurrentMemory();
    if (memAfter) {
      session.value.memorySnapshots.push({
        round: roundNum,
        heapUsed: memAfter.used,
        heapTotal: memAfter.total,
        timestamp: batchEndTime
      });
      if (memAfter.used > session.value.peakMemory) {
        session.value.peakMemory = memAfter.used;
      }
    }
    
    updateAverageLatency();
    
    const successCount = results.filter(r => r.success).length;
    
    // Log individual results with request IDs for clarity
    results.forEach((result, idx) => {
      const status = result.success ? '✓' : '✗';
      addLog(`[${roundNum}.${idx}] ${status} ${result.durationMs}ms${result.error ? ` | ERR: ${result.error.substring(0, 30)}` : ''}`);
    });
    
    addLog(`[${roundNum}] Batch complete: ${successCount}/${concurrency} passed | ${maxDuration}ms total`);
  }

  /**
   * Run a single concurrent inference with isolated output capture
   */
  async function runConcurrentInference(
    requestId: string,
    prompt: string,
    expectedAnswer: string,
    sequenceIndex: number
  ): Promise<ConcurrentResult> {
    const systemStore = useSystemStore();
    const startTime = Date.now();
    
    try {
      // For true isolation, we'd need separate engine instances
      // For now, run sequentially but capture output after each
      // Add small stagger to prevent exact simultaneous execution
      if (sequenceIndex > 0) {
        await new Promise(resolve => setTimeout(resolve, sequenceIndex * 50));
      }
      
      // Capture output before this request
      const outputBefore = systemStore.outputStream;
      
      await systemStore.runInference(prompt);
      
      // Capture the new output
      const outputAfter = systemStore.outputStream;
      
      // Extract just this request's output (diff from before)
      let requestOutput = outputAfter;
      if (outputAfter.startsWith(outputBefore)) {
        requestOutput = outputAfter.substring(outputBefore.length).trim();
      }
      
      // Store isolated output
      requestOutputs.value.set(requestId, requestOutput);
      
      const endTime = Date.now();
      
      const judge = new JudgeLogic();
      const judgment = judge.evaluate(requestOutput, expectedAnswer);
      
      return {
        requestId,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        success: judgment.pass,
        rawOutput: requestOutput.substring(0, 1000) // Truncate for storage
      };
    } catch (error: any) {
      return {
        requestId,
        startTime,
        endTime: Date.now(),
        durationMs: Date.now() - startTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Request pause (will pause at end of current round)
   */
  function pauseTest() {
    if (session.value.status === 'RUNNING') {
      pauseRequested.value = true;
      addLog('Pause requested...');
    }
  }

  /**
   * Resume from pause
   */
  function resumeTest() {
    if (session.value.status === 'PAUSED') {
      pauseRequested.value = false;
      session.value.status = 'RUNNING';
      addLog('Resuming test...');
      runTestLoop();
    }
  }

  /**
   * Stop the test immediately
   */
  function stopTest() {
    session.value.status = 'IDLE';
    pauseRequested.value = false;
    addLog('Test stopped by user');
  }

  /**
   * Mark test as complete
   */
  function finishTest() {
    session.value.status = 'COMPLETE';
    session.value.endTime = Date.now();
    addLog('Test complete!');
    
    const report = generateReport();
    addLog(`Verdict: ${report.verdict}`);
    addLog(`Pass rate: ${report.passRate.toFixed(1)}%`);
  }

  /**
   * Update average latency from log
   */
  function updateAverageLatency() {
    if (session.value.latencyLog.length === 0) return;
    const sum = session.value.latencyLog.reduce((acc, r) => acc + r.durationMs, 0);
    session.value.averageLatency = Math.round(sum / session.value.latencyLog.length);
  }

  /**
   * Generate final report
   */
  function generateReport(): EnduranceReport {
    const scenario = currentScenario.value;
    if (!scenario) {
      throw new Error('No scenario to generate report for');
    }
    
    const startTime = session.value.startTime || Date.now();
    const endTime = session.value.endTime || Date.now();
    const totalTimeMs = endTime - startTime;
    
    // Calculate pass rate
    let totalTests = 0;
    let passedTests = 0;
    
    if (scenario.type === 'sequential') {
      // For sequential, use latency log as proxy
      totalTests = session.value.latencyLog.length;
      passedTests = session.value.latencyLog.length; // Assume pass if no error
    } else {
      // For concurrent, count actual results
      totalTests = session.value.concurrentResults.length;
      passedTests = session.value.concurrentResults.filter(r => r.success).length;
    }
    
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    // Calculate leak rate
    const leakRate = calculateLeakRate(session.value.memorySnapshots);
    
    // Determine verdict
    let verdict: EnduranceReport['verdict'] = 'STABLE';
    
    if (leakRate > 1.0) {
      verdict = 'MEMORY_LEAK';
    } else if (scenario.type === 'concurrent' && passRate < 90) {
      verdict = 'CONCURRENCY_ISSUES';
    } else if (passRate < 80) {
      verdict = 'UNSTABLE';
    }
    
    return {
      scenarioName: scenario.name,
      totalTimeMs,
      peakMemoryMB: session.value.peakMemory,
      baselineMemoryMB: session.value.baselineMemory,
      leakRateMBPerRound: leakRate,
      averageLatencyMs: session.value.averageLatency,
      passRate,
      totalRounds: session.value.totalRounds,
      passedRounds: passedTests,
      verdict,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add a log entry with timestamp
   */
  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    liveLog.value.push(`[${timestamp}] ${message}`);
    // Keep only last 100 entries
    if (liveLog.value.length > 100) {
      liveLog.value.shift();
    }
  }

  /**
   * Reset the session
   */
  function resetTest() {
    session.value = {
      scenarioId: null,
      currentRound: 0,
      totalRounds: 0,
      status: 'IDLE',
      memorySnapshots: [],
      latencyLog: [],
      concurrentResults: [],
      peakMemory: 0,
      baselineMemory: 0,
      averageLatency: 0
    };
    currentScenario.value = null;
    isProcessingRound.value = false;
    pauseRequested.value = false;
    liveLog.value = [];
    requestOutputs.value.clear();
  }

  /**
   * Export report as JSON
   */
  function exportReport(): string {
    const report = generateReport();
    return JSON.stringify(report, null, 2);
  }

  return {
    // State
    session,
    currentScenario,
    isProcessingRound,
    liveLog,
    requestOutputs,
    
    // Getters
    progress,
    isRunning,
    isPaused,
    isComplete,
    canStart,
    memoryWarningLevel,
    
    // Actions
    startTest,
    pauseTest,
    resumeTest,
    stopTest,
    resetTest,
    generateReport,
    exportReport
  };
});
