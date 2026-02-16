<script setup lang="ts">
import { useSystemStore } from '../stores/systemStore';

const store = useSystemStore();

/**
 * Handles the "Initialize Gauntlet" button click.
 */
const handleInit = async () => {
  await store.initializeEngine();
};

const handleTest = async () => {
  await store.runInference("Hello! Are you ready for battle?");
};
</script>

<template>
  <div class="border border-green-800 p-4 rounded bg-gray-900 bg-opacity-50">
    <h2 class="text-xl font-bold mb-4 border-b border-green-800 pb-2">OPERATIONS</h2>
    
    <div class="text-center py-4 space-y-4">
      <div v-if="!store.isModelReady">
        <button 
          class="btn btn-outline btn-success btn-wide uppercase tracking-widest"
          @click="handleInit"
          :disabled="store.status.webLlmEngine === 'LOADING'"
        >
          {{ store.status.webLlmEngine === 'LOADING' ? 'INITIALIZING...' : 'Initialize Gauntlet' }}
        </button>
        
        <div v-if="store.status.webLlmEngine === 'LOADING'" class="mt-4">
            <progress class="progress progress-success w-full" :value="store.modelLoadingProgress * 100" max="100"></progress>
            <div class="text-xs text-green-400 mt-2 truncate max-w-xs mx-auto">{{ store.loadingText }}</div>
        </div>
      </div>

      <div v-else>
         <button 
          class="btn btn-outline btn-warning btn-wide uppercase tracking-widest"
          @click="handleTest"
        >
          Test Run
        </button>
        <div class="text-xs text-green-400 mt-2">ENGINE ONLINE</div>
      </div>
    </div>
    
    <div v-if="store.battle.isRunning" class="mt-4 text-center text-xs text-yellow-500 animate-pulse">
        PHASE {{ store.battle.currentPhase }} / {{ store.battle.totalPhases }} IN PROGRESS
    </div>
  </div>
</template>
