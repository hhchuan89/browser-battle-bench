<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import GladiatorGate from '@/components/shared/GladiatorGate.vue'
import { importLocalRun } from '@/lib/share/import-local-run'
import {
  loadGladiatorIdentity,
  useGladiatorIdentity,
} from '@/composables/useGladiatorIdentity'
import {
  createRunHashMaterial,
  generateRunHash,
} from '@/lib/run-hash'
import {
  createReplayHashMaterial,
  generateReplayHash,
} from '@/lib/replay-hash'
import type { BBBRawOutputsFile, BBBReportJson } from '@/types/report'

type PrecheckStatus = 'idle' | 'validating' | 'valid' | 'invalid'
type PayloadRole = 'report' | 'raw' | 'unknown'

interface PrecheckSnapshot {
  runHash: string
  replayHash: string
  mode: 'quick' | 'gauntlet'
  scenarioId: string
}

const SUPPORTED_SCENARIOS: Record<string, 'quick' | 'gauntlet'> = {
  'quick-battle-30s': 'quick',
  'logic-traps-l1': 'gauntlet',
  'logic-traps-grouped': 'gauntlet',
}

const router = useRouter()

const reportText = ref('')
const rawOutputsText = ref('')
const importError = ref('')
const importSuccess = ref('')
const precheckStatus = ref<PrecheckStatus>('idle')
const precheckMessage = ref('')
const precheckSnapshot = ref<PrecheckSnapshot | null>(null)
const dragActive = ref(false)
const busy = ref(false)

const parsedReport = ref<BBBReportJson | null>(null)
const parsedRawOutputs = ref<BBBRawOutputsFile | null>(null)

const showIdentityGate = ref(false)
const identityGateResolver = ref<((value: boolean) => void) | null>(null)

const {
  identity: gladiatorIdentity,
  hasGladiatorName,
  save: saveGladiatorIdentity,
  reload: reloadIdentity,
} = useGladiatorIdentity()

const canSubmit = computed(
  () => precheckStatus.value === 'valid' && !busy.value
)

const isHashLike = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim())

const detectPayloadRole = (value: unknown): PayloadRole => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'unknown'
  const record = value as Record<string, unknown>
  if (Array.isArray(record.raw_outputs)) return 'raw'
  if (Array.isArray(record.models_tested) && typeof record.run_hash === 'string') {
    return 'report'
  }
  return 'unknown'
}

const resetMessages = () => {
  importError.value = ''
  importSuccess.value = ''
}

const parseJson = (input: string, fieldName: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(input)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be a JSON object`)
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`${fieldName} parse failed: ${reason}`)
  }
}

const applyDetectedPayload = (
  role: PayloadRole,
  payload: Record<string, unknown>,
  rawText: string
) => {
  if (role === 'report') {
    reportText.value = rawText
    parsedReport.value = payload as unknown as BBBReportJson
    return
  }
  if (role === 'raw') {
    rawOutputsText.value = rawText
    parsedRawOutputs.value = payload as unknown as BBBRawOutputsFile
    return
  }
  throw new Error('Unknown payload type. Expect bbb-report.json or bbb-raw-outputs.json.')
}

const readFileAsText = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsText(file)
  })

const importFiles = async (files: FileList | File[]) => {
  resetMessages()
  precheckStatus.value = 'idle'
  precheckSnapshot.value = null
  precheckMessage.value = ''

  try {
    const list = Array.from(files)
    for (const file of list) {
      const text = await readFileAsText(file)
      const payload = parseJson(text, file.name)
      const role = detectPayloadRole(payload)
      applyDetectedPayload(role, payload, text)
    }
  } catch (error) {
    importError.value = error instanceof Error ? error.message : String(error)
  }
}

const onFileInput = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  await importFiles(target.files)
  target.value = ''
}

const onDrop = async (event: DragEvent) => {
  event.preventDefault()
  dragActive.value = false
  if (!event.dataTransfer?.files?.length) return
  await importFiles(event.dataTransfer.files)
}

const parseReportAndRawInputs = (): { report: BBBReportJson; rawOutputs: BBBRawOutputsFile } => {
  const reportParsed = parseJson(reportText.value, 'bbb_report')
  const rawParsed = parseJson(rawOutputsText.value, 'bbb_raw_outputs')

  const reportRole = detectPayloadRole(reportParsed)
  const rawRole = detectPayloadRole(rawParsed)

  if (reportRole === 'report' && rawRole === 'raw') {
    return {
      report: reportParsed as unknown as BBBReportJson,
      rawOutputs: rawParsed as unknown as BBBRawOutputsFile,
    }
  }

  if (reportRole === 'raw' && rawRole === 'report') {
    // auto-fix swapped paste
    return {
      report: rawParsed as unknown as BBBReportJson,
      rawOutputs: reportParsed as unknown as BBBRawOutputsFile,
    }
  }

  throw new Error('Both bbb-report and bbb-raw-outputs are required (strict dual-file import).')
}

const resolveScenario = (
  report: BBBReportJson
): { scenarioId: string; mode: 'quick' | 'gauntlet' } => {
  const firstModel = report.models_tested?.[0]
  const details = firstModel?.phases?.logic_traps?.details
  const scenarioId =
    typeof details?.scenario_id === 'string'
      ? details.scenario_id.trim()
      : ''
  if (!scenarioId) {
    throw new Error('bbb_report missing phases.logic_traps.details.scenario_id')
  }

  const mode = SUPPORTED_SCENARIOS[scenarioId]
  if (!mode) {
    throw new Error(`Unsupported scenario_id for import: ${scenarioId}`)
  }

  return {
    scenarioId,
    mode,
  }
}

const runLocalPrecheck = async () => {
  resetMessages()
  precheckStatus.value = 'validating'
  precheckMessage.value = 'Validating report integrity...'
  precheckSnapshot.value = null

  try {
    const { report, rawOutputs } = parseReportAndRawInputs()
    const firstModel = report.models_tested?.[0]
    if (!firstModel?.model_id) {
      throw new Error('bbb_report.models_tested[0].model_id is required')
    }

    if (!isHashLike(report.run_hash)) {
      throw new Error('bbb_report.run_hash must be a valid SHA-256 hash')
    }
    if (!isHashLike(report.replay_hash)) {
      throw new Error('bbb_report.replay_hash must be a valid SHA-256 hash')
    }
    if (!Array.isArray(rawOutputs.raw_outputs) || rawOutputs.raw_outputs.length === 0) {
      throw new Error('bbb_raw_outputs.raw_outputs must not be empty')
    }

    const { scenarioId, mode } = resolveScenario(report)

    const runMaterial = createRunHashMaterial({
      testSuiteVersion: report.test_suite_version,
      modelId: firstModel.model_id,
      rawOutputs: rawOutputs.raw_outputs.map((entry) => ({
        test_id: entry.test_id,
        run: Number(entry.run),
        output: String(entry.output || ''),
      })),
    })
    const replayMaterial = createReplayHashMaterial({
      testSuiteVersion: report.test_suite_version,
      modelId: firstModel.model_id,
      rawOutputs: rawOutputs.raw_outputs.map((entry) => ({
        test_id: entry.test_id,
        run: Number(entry.run),
        ttft_ms: entry.ttft_ms ?? null,
        total_time_ms: entry.total_time_ms ?? null,
        char_timestamps: entry.char_timestamps ?? [],
      })),
    })

    const computedRunHash = await generateRunHash(runMaterial)
    const computedReplayHash = await generateReplayHash(replayMaterial)

    if (computedRunHash !== report.run_hash || computedReplayHash !== report.replay_hash) {
      precheckStatus.value = 'invalid'
      precheckMessage.value = 'TAMPERING DETECTED. REPORT REJECTED.'
      return
    }

    parsedReport.value = report
    parsedRawOutputs.value = rawOutputs
    precheckSnapshot.value = {
      runHash: report.run_hash,
      replayHash: report.replay_hash,
      mode,
      scenarioId,
    }
    precheckStatus.value = 'valid'
    precheckMessage.value = 'Hash verified locally. Ready to import.'
  } catch (error) {
    precheckStatus.value = 'invalid'
    precheckMessage.value = error instanceof Error ? error.message : String(error)
  }
}

const resolveIdentityGate = (value: boolean) => {
  if (!identityGateResolver.value) return
  const resolver = identityGateResolver.value
  identityGateResolver.value = null
  resolver(value)
}

const ensureIdentityReady = async (): Promise<boolean> => {
  reloadIdentity()
  if (hasGladiatorName.value) return true

  showIdentityGate.value = true
  return new Promise<boolean>((resolve) => {
    identityGateResolver.value = resolve
  })
}

const onIdentityConfirm = (payload: {
  gladiatorName: string
  githubUsername: string
}) => {
  saveGladiatorIdentity({
    gladiatorName: payload.gladiatorName,
    githubUsername: payload.githubUsername,
  })
  showIdentityGate.value = false
  resolveIdentityGate(true)
}

const onIdentityCancel = () => {
  showIdentityGate.value = false
  resolveIdentityGate(false)
}

const submitImport = async () => {
  resetMessages()
  if (precheckStatus.value !== 'valid') {
    importError.value = 'Run local precheck and pass hash verification before import.'
    return
  }
  if (!parsedReport.value || !parsedRawOutputs.value) {
    importError.value = 'Missing parsed report files. Please rerun local precheck.'
    return
  }

  const identityReady = await ensureIdentityReady()
  if (!identityReady) {
    importError.value = 'Import cancelled. Gladiator identity is required.'
    return
  }

  const identity = loadGladiatorIdentity()
  busy.value = true
  try {
    const result = await importLocalRun({
      gladiator_name: identity.gladiator_name,
      github_username: identity.github_username,
      device_id: identity.device_id,
      bbb_report: parsedReport.value,
      bbb_raw_outputs: parsedRawOutputs.value,
    })

    importSuccess.value = 'Import successful. Opening public report...'
    await router.push(`/r/${result.id}`)
  } catch (error) {
    importError.value = error instanceof Error ? error.message : String(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-5xl mx-auto space-y-4">
      <div class="border border-green-800 rounded-lg p-4">
        <h1 class="text-3xl font-bold">📥 Import Local Run</h1>
        <p class="text-sm text-green-600 mt-2">
          Strict dual-file import for Quick/Gauntlet only.
          Upload both <code>bbb-report.json</code> and <code>bbb-raw-outputs.json</code>.
        </p>
      </div>

      <GladiatorGate
        :open="showIdentityGate"
        :busy="busy"
        :initial-name="gladiatorIdentity.gladiator_name"
        :initial-github="gladiatorIdentity.github_username || ''"
        @confirm="onIdentityConfirm"
        @cancel="onIdentityCancel"
      />

      <div
        class="border rounded-lg p-6 text-center transition-colors"
        :class="dragActive ? 'border-cyan-500 bg-cyan-900/10' : 'border-green-800'"
        @dragenter.prevent="dragActive = true"
        @dragover.prevent="dragActive = true"
        @dragleave.prevent="dragActive = false"
        @drop="onDrop"
      >
        <p class="text-sm">Drag & drop your two JSON files here</p>
        <p class="text-xs text-green-600 mt-1">or</p>
        <label class="btn btn-outline btn-sm mt-3">
          Select JSON Files
          <input class="hidden" type="file" accept=".json,application/json" multiple @change="onFileInput" />
        </label>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <label class="block">
          <span class="text-xs text-green-600">bbb-report.json</span>
          <textarea
            v-model="reportText"
            class="mt-1 w-full h-64 rounded border border-green-800 bg-black p-3 text-xs text-green-200 focus:border-green-500 focus:outline-none"
            placeholder="Paste bbb-report.json here..."
          />
        </label>
        <label class="block">
          <span class="text-xs text-green-600">bbb-raw-outputs.json</span>
          <textarea
            v-model="rawOutputsText"
            class="mt-1 w-full h-64 rounded border border-green-800 bg-black p-3 text-xs text-green-200 focus:border-green-500 focus:outline-none"
            placeholder="Paste bbb-raw-outputs.json here..."
          />
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="btn btn-outline btn-sm" :disabled="busy" @click="void runLocalPrecheck()">
          Run Local Precheck
        </button>
        <button class="btn btn-primary btn-sm" :disabled="!canSubmit" @click="void submitImport()">
          {{ busy ? 'Importing...' : 'Import to Global Leaderboard' }}
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="busy" @click="router.push('/leaderboard')">
          Back to Leaderboard
        </button>
      </div>

      <div
        v-if="precheckStatus !== 'idle'"
        class="border rounded-lg p-3 text-sm"
        :class="precheckStatus === 'valid' ? 'border-green-600 bg-green-900/10' : precheckStatus === 'invalid' ? 'border-red-700 bg-red-900/10 text-red-300' : 'border-yellow-700 bg-yellow-900/10 text-yellow-300'"
      >
        <p class="font-bold">
          {{ precheckStatus === 'valid' ? 'Integrity Check Passed' : precheckStatus === 'invalid' ? 'Integrity Check Failed' : 'Checking...' }}
        </p>
        <p class="mt-1">{{ precheckMessage }}</p>
        <p v-if="precheckSnapshot" class="mt-2 text-xs text-green-500 break-all">
          mode={{ precheckSnapshot.mode }} · scenario={{ precheckSnapshot.scenarioId }} · run_hash={{ precheckSnapshot.runHash }}
        </p>
      </div>

      <div v-if="importError" class="border border-red-700 bg-red-900/10 rounded-lg p-3 text-sm text-red-300">
        {{ importError }}
      </div>
      <div v-if="importSuccess" class="border border-green-700 bg-green-900/10 rounded-lg p-3 text-sm text-green-300">
        {{ importSuccess }}
      </div>
    </div>
  </div>
</template>
