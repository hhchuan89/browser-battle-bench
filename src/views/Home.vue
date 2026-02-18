<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGatekeeper } from '../composables/useGatekeeper'
import { loadQuickResults } from '@/lib/quick-results'

const { isScanning, result, scan, tierLabel } = useGatekeeper()
const scanComplete = ref(false)
const router = useRouter()
const isDev = import.meta.env.DEV
const quickRuns = ref(loadQuickResults())

onMounted(() => {
  // Auto-scan on mount
  scan().then(() => {
    scanComplete.value = true
  })
  quickRuns.value = loadQuickResults()
})

const startBattle = () => {
  // Navigate to arena
  router.push('/arena')
}

const latestQuick = computed(() => quickRuns.value[0] ?? null)
const quickTotalRuns = computed(() => quickRuns.value.length)
const quickBestScore = computed(() => {
  if (quickRuns.value.length === 0) return 0
  return Math.max(...quickRuns.value.map((entry) => entry.scorePct))
})

const formatDuration = (durationMs: number) => {
  if (durationMs < 1000) return `${durationMs}ms`
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
  return `${(durationMs / 60000).toFixed(1)}m`
}
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <h1 class="text-4xl font-bold mb-2">🏟️ Browser Battle Bench</h1>
      <p class="text-green-600 mb-8">WebGPU LLM Benchmarking Arena</p>
      
      <!-- Gatekeeper Scan -->
      <div v-if="!scanComplete || isScanning" class="border border-green-800 rounded-lg p-6">
        <h2 class="text-xl mb-4 flex items-center gap-2">
          <span class="animate-pulse">⚡</span>
          Scanning Hardware...
        </h2>
        
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <span v-if="result?.hasWebGPU !== undefined" class="text-xl">
              {{ result?.hasWebGPU ? '✅' : '❌' }}
            </span>
            <span v-else class="animate-bounce">🔄</span>
            <span>WebGPU Detection</span>
          </div>
          
          <div v-if="result?.hasWebGPU" class="flex items-center gap-2">
            <span>🖥️</span>
            <span>{{ result?.gpuName || 'Detecting...' }}</span>
          </div>
          
          <div v-if="result?.hasWebGPU" class="flex items-center gap-2">
            <span>💾</span>
            <span>VRAM: {{ result?.vramGb || '?' }}GB</span>
          </div>
          
          <div class="flex items-center gap-2">
            <span v-if="result?.ollamaAvailable !== undefined" class="text-xl">
              {{ result?.ollamaAvailable ? '✅' : '❌' }}
            </span>
            <span v-else class="animate-bounce">🔄</span>
            <span>Ollama Connection</span>
          </div>
        </div>
      </div>
      
      <!-- Results -->
      <div v-else-if="result" class="space-y-6">
        <!-- Tier Display -->
        <div class="border border-green-600 rounded-lg p-6 text-center">
          <p class="text-green-500 mb-2">Your Hardware Tier</p>
          <p class="text-6xl font-bold text-green-400">{{ result.tier }}</p>
          <p class="text-xl mt-2">{{ tierLabel }}</p>
        </div>
        
        <!-- Specs -->
        <div class="border border-green-800 rounded-lg p-4 text-sm">
          <h3 class="text-green-500 mb-3">📋 Specifications</h3>
          <div class="grid grid-cols-2 gap-2">
            <div>WebGPU:</div>
            <div>{{ result.hasWebGPU ? '✅ Supported' : '❌ Not Available' }}</div>
            
            <div>GPU:</div>
            <div>{{ result.gpuName }}</div>
            
            <div>VRAM:</div>
            <div>{{ result.vramGb }}GB</div>
            
            <div>Mobile:</div>
            <div>{{ result.isMobile ? '📱 Yes' : '🖥️ No' }}</div>
            
            <div>Ollama:</div>
            <div>{{ result.ollamaAvailable ? '✅ Connected' : '❌ Not Found' }}</div>
            
            <div v-if="result.ollamaModels.length">Models:</div>
            <div v-if="result.ollamaModels.length">{{ result.ollamaModels.join(', ') }}</div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-4">
          <button 
            @click="startBattle"
            class="flex-1 bg-green-700 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ⚔️ Enter Arena
          </button>
        </div>

        <div class="border border-green-800 rounded-lg p-4 text-sm">
          <h3 class="text-green-500 mb-3">⚡ Quick Battle Snapshot</h3>
          <div class="grid grid-cols-2 gap-2">
            <div>Total Quick Runs:</div>
            <div>{{ quickTotalRuns }}</div>
            <div>Best Score:</div>
            <div>{{ quickBestScore.toFixed(1) }}%</div>
            <template v-if="latestQuick">
              <div>Latest Score:</div>
              <div>{{ latestQuick.scorePct.toFixed(1) }}%</div>
              <div>Latest Pass:</div>
              <div>{{ latestQuick.passedRounds }} / {{ latestQuick.totalRounds }}</div>
              <div>Latest Duration:</div>
              <div>{{ formatDuration(latestQuick.durationMs) }}</div>
            </template>
          </div>
        </div>
        
        <!-- Quick Links -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <router-link
            to="/quick"
            class="block border border-green-800 hover:border-green-600 rounded p-3 text-center transition-colors"
          >
            ⚡ Quick Battle (30s)
          </router-link>
          <router-link
            to="/gauntlet"
            class="block border border-green-800 hover:border-green-600 rounded p-3 text-center transition-colors"
          >
            🥊 Gauntlet Mode
          </router-link>
          <router-link
            to="/stress"
            class="block border border-green-800 hover:border-green-600 rounded p-3 text-center transition-colors"
          >
            🔥 Stress Test
          </router-link>
          <router-link
            to="/leaderboard"
            class="block border border-green-800 hover:border-green-600 rounded p-3 text-center transition-colors"
          >
            🏆 Leaderboard
          </router-link>
        </div>

        <div v-if="isDev" class="mt-4 text-sm">
          <router-link
            to="/diagnostics"
            class="block border border-green-800 hover:border-green-600 rounded p-3 text-center transition-colors"
          >
            🧪 Diagnostics (Dev)
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
