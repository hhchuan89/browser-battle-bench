<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EnduranceArena from '@/components/EnduranceArena.vue'
import { useSystemStore } from '@/stores/systemStore'
import { useGatekeeper } from '@/composables/useGatekeeper'

const systemStore = useSystemStore()
const { isScanning, result, scan, tierLabel } = useGatekeeper()

const isEngineReady = computed(() => systemStore.isModelReady)
const isEngineLoading = computed(() => systemStore.status.webLlmEngine === 'LOADING')
const scanComplete = ref(false)
const confirmChecked = ref(false)
const isBlockedTier = computed(() => result.value?.tier === 'M' || result.value?.tier === 'F')
const canInitialize = computed(
  () => scanComplete.value && confirmChecked.value && !isBlockedTier.value && !isEngineLoading.value
)

onMounted(() => {
  scan().then(() => {
    scanComplete.value = true
  })
})

const initializeEngine = async () => {
  await systemStore.initializeEngine()
}
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">🔥 Stress Test</h1>
        <p class="text-green-600">Extended Endurance Benchmark</p>
      </div>

      <div v-if="!isEngineReady" class="border border-green-800 rounded-lg p-6 bg-black/50 space-y-6">
        <div>
          <p class="text-green-300 mb-2">
            Stress Test runs are resource intensive. Confirm your hardware tier before initializing the engine.
          </p>
          <p class="text-xs text-green-500">
            We block mobile/no-WebGPU tiers to avoid unsafe runs.
          </p>
        </div>

        <div class="border border-green-800 rounded-lg p-4 text-sm">
          <h2 class="text-green-500 mb-3 flex items-center gap-2">
            <span class="animate-pulse" v-if="!scanComplete || isScanning">⚡</span>
            <span>Gatekeeper Scan</span>
          </h2>

          <div v-if="!scanComplete || isScanning" class="text-green-400">
            Scanning hardware...
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <div>Tier:</div>
            <div>{{ result?.tier }} — {{ tierLabel }}</div>

            <div>WebGPU:</div>
            <div>{{ result?.hasWebGPU ? '✅ Supported' : '❌ Not Available' }}</div>

            <div>GPU:</div>
            <div>{{ result?.gpuName }}</div>

            <div>VRAM:</div>
            <div>{{ result?.vramGb }}GB</div>

            <div>Mobile:</div>
            <div>{{ result?.isMobile ? '📱 Yes' : '🖥️ No' }}</div>
          </div>
        </div>

        <div v-if="scanComplete && isBlockedTier" class="border border-red-700/60 rounded-lg p-4 text-sm text-red-300">
          Stress Test is disabled on mobile or no-WebGPU tiers. Use Gauntlet mode instead.
        </div>

        <label class="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 accent-green-500"
            v-model="confirmChecked"
            :disabled="isBlockedTier || !scanComplete"
          />
          <span>
            I understand this can stress my GPU and may slow down my system.
          </span>
        </label>

        <button
          class="bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-black font-bold py-2 px-4 rounded"
          :disabled="!canInitialize"
          @click="initializeEngine"
        >
          {{ isEngineLoading ? 'Initializing...' : 'Initialize Engine' }}
        </button>

        <div v-if="isEngineLoading" class="mt-4">
          <div class="w-full bg-green-900 h-2 rounded overflow-hidden">
            <div
              class="bg-green-400 h-full transition-all duration-300"
              :style="{ width: `${Math.round(systemStore.modelLoadingProgress * 100)}%` }"
            ></div>
          </div>
          <p class="text-xs text-green-500 mt-2">
            {{ systemStore.loadingText || 'Preparing model...' }}
          </p>
        </div>
      </div>

      <EnduranceArena v-else />
    </div>
  </div>
</template>
