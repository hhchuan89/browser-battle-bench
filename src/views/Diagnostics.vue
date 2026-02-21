<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { analyzeRunDrift, type DriftAnalysisSummary } from '@/lib/drift-analysis'
import { buildDriftDiff, type DriftDiff } from '@/lib/drift-diff'
import { loadRunHistory } from '@/lib/run-history'
import { getSelectedModelId } from '@/lib/settings-store'

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
const driftSummary = ref<DriftAnalysisSummary>({
  groups: [],
  overallConsistency: 100,
  unstableGroups: 0,
})
const selectedDriftKey = ref<string | null>(null)
const driftDiff = ref<DriftDiff | null>(null)

const runDiagnostics = async () => {
  isChecking.value = true
  diagnostics.value.adapterInfoError = null

  diagnostics.value.routePath = route.path
  diagnostics.value.routeName = route.name ? String(route.name) : 'unknown'
  diagnostics.value.selectedModel = getSelectedModelId() || 'Not set'

  const navigationEntry = performance.getEntriesByType('navigation')[0]
  if (navigationEntry && 'type' in navigationEntry) {
    diagnostics.value.navigationType = (navigationEntry as PerformanceNavigationTiming).type
  }

  diagnostics.value.hasWebGPU = 'gpu' in navigator
  const runHistory = loadRunHistory()
  driftSummary.value = analyzeRunDrift(runHistory)
  if (!selectedDriftKey.value && driftSummary.value.groups.length > 0) {
    selectedDriftKey.value = driftSummary.value.groups[0].key
  }
  if (selectedDriftKey.value) {
    driftDiff.value = buildDriftDiff(runHistory, selectedDriftKey.value)
  } else {
    driftDiff.value = null
  }

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

const selectDriftGroup = (key: string) => {
  selectedDriftKey.value = key
  driftDiff.value = buildDriftDiff(loadRunHistory(), key)
}
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

      <div class="mt-6 border border-green-800 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">📉 Drift Summary</h2>
          <p class="text-sm text-green-500">
            Overall consistency: {{ driftSummary.overallConsistency.toFixed(1) }}%
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Tracked Groups</p>
            <p class="text-xl font-bold">{{ driftSummary.groups.length }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Unstable Groups</p>
            <p class="text-xl font-bold">{{ driftSummary.unstableGroups }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Signal Source</p>
            <p class="text-xl font-bold">Run History</p>
          </div>
        </div>

        <div
          v-if="driftSummary.groups.length === 0"
          class="border border-green-900 rounded p-4 text-sm text-green-500"
        >
          Need at least 2 runs per scenario to compute drift signal.
        </div>

        <div v-else class="space-y-2">
          <article
            v-for="group in driftSummary.groups.slice(0, 5)"
            :key="group.key"
            class="border border-green-900 rounded p-3"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="font-bold">{{ group.scenarioName }}</p>
              <span
                class="text-xs px-2 py-1 rounded"
                :class="
                  group.riskLevel === 'HIGH'
                    ? 'bg-red-900 text-red-200'
                    : group.riskLevel === 'MEDIUM'
                      ? 'bg-yellow-900 text-yellow-200'
                      : 'bg-green-900 text-green-200'
                "
              >
                {{ group.riskLevel }}
              </span>
            </div>
            <p class="text-xs text-green-600 mb-2">
              {{ group.mode }} · {{ group.runs }} runs
            </p>
            <button
              class="text-xs bg-green-900 text-green-200 px-2 py-1 rounded mb-2"
              @click="selectDriftGroup(group.key)"
            >
              View Diff
            </button>
            <div class="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p class="text-green-500">Consistency</p>
                <p class="font-bold">{{ group.consistencyScore.toFixed(1) }}%</p>
              </div>
              <div>
                <p class="text-green-500">Avg Pass</p>
                <p class="font-bold">{{ group.avgPassRate.toFixed(1) }}%</p>
              </div>
              <div>
                <p class="text-green-500">Variance</p>
                <p class="font-bold">{{ group.variance.toFixed(1) }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="mt-6 border border-green-800 rounded-lg p-6 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">🧩 Drift Diff</h2>
          <p class="text-sm text-green-500">
            Latest vs previous run
          </p>
        </div>

        <div v-if="!driftDiff" class="text-sm text-green-500">
          Select a drift group to inspect changes between the latest runs.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Scenario</p>
            <p class="font-bold">{{ driftDiff.scenarioName }}</p>
            <p class="text-green-600 text-xs mt-1">{{ driftDiff.mode }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Pass Rate Delta</p>
            <p class="font-bold">{{ driftDiff.deltaPassRate.toFixed(1) }}%</p>
            <p class="text-green-600 text-xs mt-1">
              Score Delta:
              {{ driftDiff.deltaScorePct !== null ? `${driftDiff.deltaScorePct.toFixed(1)}%` : 'N/A' }}
            </p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Latest Run</p>
            <p class="font-bold">{{ driftDiff.latest.passRate.toFixed(1) }}% pass</p>
            <p class="text-green-600 text-xs mt-1">{{ driftDiff.latest.completedAt }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-500">Previous Run</p>
            <p class="font-bold">{{ driftDiff.previous.passRate.toFixed(1) }}% pass</p>
            <p class="text-green-600 text-xs mt-1">{{ driftDiff.previous.completedAt }}</p>
          </div>
        </div>
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
