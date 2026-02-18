import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SystemStatus, BattleState } from '../types';
import { LLMEngine } from '../services/llm/engine';
import { StreamGuillotine } from '../services/warden/guillotine';
import type { InitProgressReport } from '@mlc-ai/web-llm';
import { getSelectedModelId } from '@/lib/settings-store';

/**
 * Manages the global system status and battle state.
 */
export const useSystemStore = defineStore('system', () => {
  const status = ref<SystemStatus>({
    coreIntegrity: 'ONLINE',
    webLlmEngine: 'STANDBY',
    judgeAi: 'OFFLINE',
  });

  const battle = ref<BattleState>({
    isRunning: false,
    currentPhase: 0,
    totalPhases: 4,
  });

  // LLM State
  const modelLoadingProgress = ref(0);
  const loadingText = ref('');
  const isModelReady = ref(false);
  const outputStream = ref('');
  const lastInferenceTimings = ref<{
    ttftMs: number | null;
    totalTimeMs: number | null;
    charTimestamps: number[];
  }>({
    ttftMs: null,
    totalTimeMs: null,
    charTimestamps: [],
  });

  // Warden State
  const isPanic = ref(false);
  const panicReason = ref<string | null>(null);

  const resolveSelectedModelId = (): string => getSelectedModelId();

  /**
   * Updates the status of a specific system component.
   * @param component - The key of the component to update.
   * @param newState - The new state.
   */
  function updateStatus(component: keyof SystemStatus, newState: SystemStatus[keyof SystemStatus]) {
    status.value[component] = newState;
  }

  /**
   * Triggers the panic state.
   * @param reason - The reason for the panic.
   */
  function triggerPanic(reason: string) {
    isPanic.value = true;
    panicReason.value = reason;
    battle.value.isRunning = false; // Stop battle if running
  }

  /**
   * Dismisses the panic state.
   */
  function dismissPanic() {
    isPanic.value = false;
    panicReason.value = null;
    outputStream.value = ''; // Optional: clear output on dismiss
  }

  /**
   * Starts the battle sequence.
   */
  function startBattle() {
    battle.value.isRunning = true;
    battle.value.currentPhase = 1;
    // Todo: Trigger actual logic
  }

  /**
   * Initializes the LLM Engine
   */
  async function initializeEngine() {
    if (isModelReady.value) return;

    status.value.webLlmEngine = 'LOADING';
    loadingText.value = "Initializing Engine...";

    const engine = LLMEngine.getInstance();
    const selectedModelId = resolveSelectedModelId();
    
    try {
      await engine.initialize((report: InitProgressReport) => {
        modelLoadingProgress.value = report.progress;
        loadingText.value = report.text;
      }, selectedModelId);
      
      status.value.webLlmEngine = 'ONLINE';
      isModelReady.value = true;
      loadingText.value = "Engine Ready";
    } catch (e) {
      status.value.webLlmEngine = 'ERROR';
      loadingText.value = "Initialization Failed";
      console.error(e);
    }
  }

  /**
   * Runs a test inference
   */
  async function runInference(prompt: string) {
    if (!isModelReady.value) return;
    if (isPanic.value) return; // Don't run if panicked
    
    outputStream.value = ""; // Reset
    const engine = LLMEngine.getInstance();
    const guillotine = new StreamGuillotine();
    const now = () =>
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const startTime = now();
    let firstChunkAt: number | null = null;
    let totalChars = 0;
    const charTimestamps: number[] = [];
    lastInferenceTimings.value = {
      ttftMs: null,
      totalTimeMs: null,
      charTimestamps: [],
    };
    
    try {
      await engine.generate(prompt, (chunk) => {
        // Feed to Warden
        const fullText = outputStream.value + chunk;
        const check = guillotine.check(fullText);
        
        if (!check.valid) {
          triggerPanic(check.reason || "Unknown Violation");
          engine.interruptGenerate();
          throw new Error("WARDEN_VIOLATION"); // Abort generation
        }
        const chunkTime = now();
        if (firstChunkAt === null) {
          firstChunkAt = chunkTime;
        }
        outputStream.value += chunk;
        for (let i = 0; i < chunk.length; i++) {
          totalChars += 1;
          if (totalChars % 50 === 0) {
            charTimestamps.push(Math.round(chunkTime));
          }
        }
      });
    } catch (e: any) {
      if (e.message === "WARDEN_VIOLATION") {
        console.warn("Inference aborted by Warden.");
      } else {
        outputStream.value += "\n[ERROR] Generation failed.";
        console.error(e);
      }
    } finally {
      const endTime = now();
      lastInferenceTimings.value = {
        ttftMs: firstChunkAt === null ? null : Math.round(firstChunkAt - startTime),
        totalTimeMs: Math.round(endTime - startTime),
        charTimestamps,
      };
    }
  }

  return {
    status,
    battle,
    modelLoadingProgress,
    loadingText,
    isModelReady,
    outputStream,
    lastInferenceTimings,
    isPanic,
    panicReason,
    updateStatus,
    startBattle,
    initializeEngine,
    runInference,
    triggerPanic,
    dismissPanic
  };
});
