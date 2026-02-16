<script setup lang="ts">
import { computed } from 'vue';
import { useSystemStore } from '../stores/systemStore';

const store = useSystemStore();

/**
 * Returns the CSS color class based on the system state.
 * @param state - The state of the system component.
 */
const getStatusColor = (state: string) => {
  switch (state) {
    case 'ONLINE': return 'text-green-400';
    case 'STANDBY': return 'text-yellow-500';
    case 'OFFLINE': return 'text-red-500';
    case 'ERROR': return 'text-red-600 animate-pulse';
    default: return 'text-gray-500';
  }
};
</script>

<template>
  <div class="border border-green-800 p-4 rounded bg-gray-900 bg-opacity-50">
    <h2 class="text-xl font-bold mb-4 border-b border-green-800 pb-2">SYSTEM STATUS</h2>
    <ul class="space-y-2 text-sm">
      <li class="flex justify-between">
        <span>CORE INTEGRITY:</span>
        <span :class="getStatusColor(store.status.coreIntegrity)">
          {{ store.status.coreIntegrity }}
        </span>
      </li>
      <li class="flex justify-between">
        <span>WEBLLM ENGINE:</span>
        <span :class="getStatusColor(store.status.webLlmEngine)">
          {{ store.status.webLlmEngine }}
        </span>
      </li>
      <li class="flex justify-between">
        <span>JUDGE AI:</span>
        <span :class="getStatusColor(store.status.judgeAi)">
          {{ store.status.judgeAi }}
        </span>
      </li>
    </ul>
  </div>
</template>
