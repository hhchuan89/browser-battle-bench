<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isChecking = ref(false)
const diagnostics = ref({
  hasWebGPU: false,
  adapterInfoSupported: false,
  adapterInfoName: 'Unknown',
  adapterInfoError: null as string | null,
  selectedModel: 'Not set',
  navigationType: 'unknown',
  routePath: route.path,
  routeName: route.name ? String(route.name) : 'unknown',
})

const runDiagnostics = async () => {
  isChecking.value = true
  diagnostics.value.adapterInfoError = null

  diagnostics.value.routePath = route.path
  diagnostics.value.routeName = route.name ? String(route.name) : 'unknown'
  diagnostics.value.selectedModel =
    localStorage.getItem('bbb:selectedModel') || 'Not set'

  const navigationEntry = performance.getEntriesByType('navigation')[0]
  if (navigationEntry && 'type' in navigationEntry) {
    diagnostics.value.navigationType = (navigationEntry as PerformanceNavigationTiming).type
  }

  diagnostics.value.hasWebGPU = 'gpu' in navigator

  if (diagnostics.value.hasWebGPU) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter()
      if (adapter) {
        diagnostics.value.adapterInfoSupported = typeof adapter.requestAdapterInfo === 'function'
        if (diagnostics.value.adapterInfoSupported) {
          try {
            const info = await adapter.requestAdapterInfo()
            diagnostics.value.adapterInfoName = info.deviceName || 'Unknown'
          } catch (error) {
            diagnostics.value.adapterInfoError = error instanceof Error ? error.message : String(error)
          }
        }
      }
    } catch (error) {
      diagnostics.value.adapterInfoError = error instanceof Error ? error.message : String(error)
    }
  }

  isChecking.value = false
}

onMounted(() => {
  runDiagnostics()
})
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-8">
    <div class="max-w-3xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">🧪 Diagnostics</h1>
        <p class="text-green-600">Manual verification and environment signals</p>
      </div>

      <div class="border border-green-800 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-green-500">Last Run</p>
          <p class="text-sm text-green-400">{{ isChecking ? 'Checking...' : 'Ready' }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-green-500">WebGPU</p>
            <p>{{ diagnostics.hasWebGPU ? '✅ Supported' : '❌ Not Available' }}</p>
          </div>
          <div>
            <p class="text-green-500">Adapter Info API</p>
            <p>{{ diagnostics.adapterInfoSupported ? '✅ requestAdapterInfo()' : '❌ Not Available' }}</p>
          </div>
          <div>
            <p class="text-green-500">Adapter Name</p>
            <p>{{ diagnostics.adapterInfoName }}</p>
          </div>
          <div>
            <p class="text-green-500">Selected Model</p>
            <p>{{ diagnostics.selectedModel }}</p>
          </div>
          <div>
            <p class="text-green-500">Route</p>
            <p>{{ diagnostics.routeName }} ({{ diagnostics.routePath }})</p>
          </div>
          <div>
            <p class="text-green-500">Navigation Type</p>
            <p>{{ diagnostics.navigationType }}</p>
          </div>
        </div>

        <div v-if="diagnostics.adapterInfoError" class="border border-red-700 bg-red-900/20 rounded p-3">
          <p class="text-red-400 font-bold">Adapter Info Error</p>
          <p class="text-red-300 text-sm mt-1">{{ diagnostics.adapterInfoError }}</p>
        </div>

        <button
          class="mt-2 bg-green-700 hover:bg-green-600 text-black font-bold py-2 px-4 rounded"
          :disabled="isChecking"
          @click="runDiagnostics"
        >
          🔄 Re-run Diagnostics
        </button>
      </div>

      <div class="mt-6 border border-green-800 rounded-lg p-4 text-sm text-green-300">
        <p class="text-green-500 mb-2">Manual Checklist</p>
        <ul class="list-disc list-inside space-y-1">
          <li>Navigate Home → Arena → Gauntlet without full page reloads.</li>
          <li>Confirm WebGPU status and adapter info above.</li>
          <li>Load a model in Arena, then confirm Selected Model updates here.</li>
        </ul>
      </div>
    </div>
  </div>
</template>
