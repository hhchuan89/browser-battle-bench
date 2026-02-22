<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PublicReportResponse } from '@/lib/share/publish-types'
import { fetchPublicReport } from '@/lib/share/publish-report'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const report = ref<PublicReportResponse | null>(null)

const stageRoute = computed(() => {
  if (!report.value) return '/'
  switch (report.value.mode) {
    case 'arena':
      return '/arena'
    case 'quick':
      return '/quick'
    case 'gauntlet':
      return '/gauntlet'
    case 'stress':
      return '/stress'
    default:
      return '/'
  }
})

const modeLabel = computed(() => {
  if (!report.value) return 'Report'
  return report.value.mode.charAt(0).toUpperCase() + report.value.mode.slice(1)
})

const titleText = computed(() => {
  if (!report.value) return 'Public Report'
  return `${modeLabel.value} · ${report.value.grade} ${report.value.score.toFixed(1)}`
})

const fmtPercent = (value?: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
  return `${value.toFixed(1)}%`
}

const fmtNullable = (value?: string | null, fallback = 'N/A'): string => {
  const normalized = (value || '').trim()
  return normalized || fallback
}

const fmtVram = (value?: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
  return `${value.toFixed(1)} GB`
}

const githubProfileUrl = (username?: string | null): string => {
  const normalized = (username || '').trim().replace(/^@+/, '')
  return `https://github.com/${normalized}`
}

const fmtDate = (value: string): string => {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleString('en-MY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const load = async () => {
  const id = String(route.params.id || '').trim()
  if (!id) {
    error.value = 'Missing report id.'
    report.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    report.value = await fetchPublicReport(id)
  } catch (err) {
    report.value = null
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    void load()
  }
)

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-4xl mx-auto space-y-4">
      <div class="border border-green-800 rounded-lg p-4">
        <p class="text-green-600 text-sm">Public Battle Report</p>
        <h1 class="text-3xl font-bold mt-1">{{ titleText }}</h1>
      </div>

      <div v-if="loading" class="border border-green-900 rounded-lg p-6 text-center">
        <p class="text-green-500">Loading report...</p>
      </div>

      <div v-else-if="error" class="border border-red-700 rounded-lg p-6 bg-red-900/10">
        <p class="text-red-400 font-bold mb-2">Unable to load report</p>
        <p class="text-red-300 text-sm">{{ error }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="bg-red-800 hover:bg-red-700 text-red-100 text-sm px-3 py-1 rounded" @click="void load()">
            Retry
          </button>
          <button class="bg-green-800 hover:bg-green-700 text-green-100 text-sm px-3 py-1 rounded" @click="router.push('/leaderboard')">
            Open Leaderboard
          </button>
        </div>
      </div>

      <template v-else-if="report">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Mode</p>
            <p class="text-xl font-bold">{{ modeLabel }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Score</p>
            <p class="text-xl font-bold">{{ report.score.toFixed(1) }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Grade</p>
            <p class="text-xl font-bold">{{ report.grade }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Tier</p>
            <p class="text-xl font-bold">{{ report.tier }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div class="border border-green-900 rounded-lg p-4 space-y-2">
            <h2 class="text-base font-bold text-green-500">Gladiator Identity</h2>
            <p>
              <span class="text-green-600">Name:</span>
              <span class="font-bold ml-2">{{ report.gladiator_name || 'Anonymous' }}</span>
            </p>
            <p v-if="report.github_username">
              <span class="text-green-600">GitHub:</span>
              <a
                :href="githubProfileUrl(report.github_username)"
                target="_blank"
                rel="noopener noreferrer"
                class="font-bold ml-2 text-cyan-300 hover:text-cyan-100 underline underline-offset-2"
              >
                @{{ report.github_username }}
              </a>
            </p>
            <p>
              <span class="text-green-600">Device ID:</span>
              <span class="font-bold ml-2 break-all">{{ report.device_id }}</span>
            </p>
          </div>

          <div class="border border-green-900 rounded-lg p-4 space-y-2">
            <h2 class="text-base font-bold text-green-500">Model Canonicalization</h2>
            <p>
              <span class="text-green-600">Model ID:</span>
              <span class="font-bold ml-2 break-all">{{ report.model_id }}</span>
            </p>
            <p>
              <span class="text-green-600">Canonical:</span>
              <span class="font-bold ml-2 break-all">{{ fmtNullable(report.canonical_model_id) }}</span>
            </p>
            <p>
              <span class="text-green-600">Family:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.model_family) }}</span>
            </p>
            <p>
              <span class="text-green-600">Param Size:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.param_size) }}</span>
            </p>
            <p>
              <span class="text-green-600">Quantization:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.quantization) }}</span>
            </p>
          </div>

          <div class="border border-green-900 rounded-lg p-4 space-y-2">
            <h2 class="text-base font-bold text-green-500">Hardware (Self-Reported)</h2>
            <p>
              <span class="text-green-600">GPU:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.gpu_name, 'Unknown GPU') }}</span>
            </p>
            <p>
              <span class="text-green-600">Vendor:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.gpu_vendor) }}</span>
            </p>
            <p>
              <span class="text-green-600">OS:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.os_name) }}</span>
            </p>
            <p>
              <span class="text-green-600">Browser:</span>
              <span class="font-bold ml-2">{{ fmtNullable(report.browser_name) }}</span>
            </p>
            <p>
              <span class="text-green-600">VRAM:</span>
              <span class="font-bold ml-2">{{ fmtVram(report.vram_gb) }}</span>
            </p>
          </div>
        </div>

        <div class="border border-green-900 rounded-lg p-4 space-y-2 text-sm">
          <p>
            <span class="text-green-600">Scenario:</span>
            <span class="font-bold ml-2">{{ report.scenario_name }}</span>
          </p>
          <p>
            <span class="text-green-600">Model:</span>
            <span class="font-bold ml-2 break-all">{{ report.model_id }}</span>
          </p>
          <p>
            <span class="text-green-600">Pass Rate:</span>
            <span class="font-bold ml-2">{{ fmtPercent(report.pass_rate) }}</span>
          </p>
          <p>
            <span class="text-green-600">Rounds:</span>
            <span class="font-bold ml-2">{{ report.passed_rounds ?? 'N/A' }} / {{ report.total_rounds ?? 'N/A' }}</span>
          </p>
          <p>
            <span class="text-green-600">Published At:</span>
            <span class="font-bold ml-2">{{ fmtDate(report.created_at) }}</span>
          </p>
          <p v-if="report.run_hash">
            <span class="text-green-600">Run Hash:</span>
            <span class="font-bold ml-2 break-all">{{ report.run_hash }}</span>
          </p>
        </div>

        <div class="border border-green-900 rounded-lg p-4">
          <h2 class="text-lg font-bold mb-2">Report Summary</h2>
          <pre class="text-xs text-green-200 whitespace-pre-wrap break-all bg-black border border-green-950 rounded p-3">{{ JSON.stringify(report.report_summary, null, 2) }}</pre>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="bg-green-800 hover:bg-green-700 text-green-100 text-sm px-3 py-1 rounded" @click="router.push(stageRoute)">
            Open {{ modeLabel }}
          </button>
          <button class="bg-cyan-800 hover:bg-cyan-700 text-cyan-100 text-sm px-3 py-1 rounded" @click="router.push('/leaderboard')">
            Open Leaderboard
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
