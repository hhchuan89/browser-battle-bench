<script setup lang="ts">
import { useSystemStore } from '../stores/systemStore';

const store = useSystemStore();
</script>

<template>
  <div v-if="store.isPanic" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-900/95 text-white backdrop-blur-sm transition-opacity duration-300">
    <div class="max-w-2xl p-8 text-center border-4 border-red-500 rounded-lg bg-black/30 shadow-2xl">
      <h1 class="text-6xl font-black tracking-widest text-red-500 mb-6 animate-pulse">VIOLATION DETECTED</h1>
      
      <div class="mb-8 p-4 bg-black/50 rounded border border-red-500/50">
        <p class="text-xl font-mono text-red-200">{{ store.panicReason }}</p>
      </div>

      <button 
        @click="store.dismissPanic"
        class="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase tracking-wider transition-colors duration-200 shadow-lg hover:shadow-red-500/20"
      >
        Reset System
      </button>
    </div>
  </div>
</template>
