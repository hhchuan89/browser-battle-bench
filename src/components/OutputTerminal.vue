<script setup lang="ts">
import { useSystemStore } from '../stores/systemStore';

const store = useSystemStore();
</script>

<template>
  <div class="border border-green-800 p-4 rounded bg-gray-900 bg-opacity-50 h-full flex flex-col mt-8 md:mt-0">
    <h2 class="text-xl font-bold mb-4 border-b border-green-800 pb-2">BATTLE LOG / TERMINAL</h2>
    <div class="flex-grow bg-black p-4 font-mono text-sm text-green-400 overflow-y-auto border border-green-900 rounded shadow-inner min-h-[200px]">
        <div v-if="!store.outputStream" class="opacity-50">> System Standby...</div>
        <div v-else class="whitespace-pre-wrap">> {{ store.outputStream }}<span class="animate-pulse">_</span></div>
    </div>
  </div>
</template>
