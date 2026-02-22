<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useEnduranceStore } from '../stores/enduranceStore';
import { useSystemStore } from '../stores/systemStore';
import { enduranceScenarios } from '../data/enduranceScenarios';
import { getCurrentMemory, formatMemory, calculateLeakRate } from '../services/performance/MemoryMonitor';
import { loadHardwareSnapshot } from '@/lib/hardware-snapshot';
import { getSelectedModelId } from '@/lib/settings-store';
import { buildStressSharePayload } from '@/lib/share/share-payload';
import { publishReport } from '@/lib/share/publish-report';
import { buildStressPublishRequest } from '@/lib/share/publish-normalizers';
import type { PublishedShareLinks } from '@/lib/share/publish-types';
import { loadGladiatorIdentity } from '@/composables/useGladiatorIdentity';
import CountUp from './shared/CountUp.vue';
import FadeTransition from './shared/FadeTransition.vue';
import PulseRing from './shared/PulseRing.vue';
import ResultActionBar from '@/components/shared/ResultActionBar.vue';

interface EnduranceArenaProps {
  defaultScenarioId?: string;
}

const props = withDefaults(defineProps<EnduranceArenaProps>(), {
  defaultScenarioId: 'memory-leak-100',
});

const enduranceStore = useEnduranceStore();
const systemStore = useSystemStore();

const resolveScenarioId = (scenarioId: string): string =>
  enduranceScenarios.some((scenario) => scenario.id === scenarioId)
    ? scenarioId
    : 'memory-leak-100';

const selectedScenarioId = ref(resolveScenarioId(props.defaultScenarioId));
const hoveredBar = ref<{ index: number; value: string; round: number } | null>(null);
const showTimestamp = ref(true);
const publishedShareLinks = ref<PublishedShareLinks | null>(null);

const selectedScenario = computed(() => 
  enduranceScenarios.find(s => s.id === selectedScenarioId.value)
);

const currentMemory = computed(() => getCurrentMemory());

const leakRate = computed(() => 
  calculateLeakRate(enduranceStore.session.memorySnapshots)
);

const finalReport = computed(() => {
  if (!enduranceStore.isComplete) return null;
  return enduranceStore.generateReport();
});

const hardwareLabel = computed(() => {
  const snapshot = loadHardwareSnapshot();
  return snapshot ? `GPU: ${snapshot.gpu}` : 'GPU: Unknown';
});

const stressSharePayload = computed(() => {
  if (!finalReport.value || !selectedScenario.value) return null;
  return buildStressSharePayload({
    scenarioId: selectedScenario.value.id,
    scenarioName: selectedScenario.value.name,
    modelId: getSelectedModelId(),
    runRef: `stress-${Date.parse(finalReport.value.timestamp) || Date.now()}`,
    report: finalReport.value,
    hardwareLabel: hardwareLabel.value,
  });
});

const publishStressShare = async (): Promise<PublishedShareLinks> => {
  if (publishedShareLinks.value) return publishedShareLinks.value;
  if (!stressSharePayload.value || !finalReport.value) {
    throw new Error('Stress result is not ready for publishing.');
  }

  const request = buildStressPublishRequest({
    payload: stressSharePayload.value,
    report: finalReport.value,
    identity: loadGladiatorIdentity(),
    hardware: loadHardwareSnapshot(),
    tier: loadHardwareSnapshot()?.tier,
  });
  const links = await publishReport(request);
  publishedShareLinks.value = links;
  return links;
};

watch(
  () => props.defaultScenarioId,
  (value) => {
    if (value) {
      selectedScenarioId.value = resolveScenarioId(value);
    }
  }
);

watch(
  () => enduranceStore.session.status,
  (status) => {
    if (status === 'IDLE') {
      publishedShareLinks.value = null;
    }
  }
);

const canStart = computed(() => 
  systemStore.isModelReady && enduranceStore.session.status === 'IDLE'
);

async function startTest() {
  if (!selectedScenario.value) return;
  publishedShareLinks.value = null;
  await enduranceStore.startTest(selectedScenario.value);
}

async function retryStressTest() {
  enduranceStore.resetTest();
  await startTest();
}

function downloadReport() {
  const report = enduranceStore.exportReport();
  const blob = new Blob([report], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `endurance-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'RUNNING': return 'text-yellow-400';
    case 'PAUSED': return 'text-orange-400';
    case 'COMPLETE': return 'text-green-400';
    case 'ERROR': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'STABLE': return 'text-green-400';
    case 'MEMORY_LEAK': return 'text-orange-400';
    case 'CONCURRENCY_ISSUES': return 'text-yellow-400';
    case 'UNSTABLE': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function getMemoryBarHeight(snapshot: any): string {
  if (!snapshot.heapUsed || !enduranceStore.session.baselineMemory) {
    return '10%';
  }
  const maxScale = Math.max(enduranceStore.session.baselineMemory * 2.5, 1);
  const pct = Math.min(100, (snapshot.heapUsed / maxScale) * 100);
  return `${Math.max(pct, 5)}%`;
}

function getMemoryBarColor(snapshot: any): string {
  if (!snapshot.heapUsed || !enduranceStore.session.baselineMemory) {
    return 'bg-gray-600';
  }
  const ratio = snapshot.heapUsed / enduranceStore.session.baselineMemory;
  if (ratio > 2) return 'bg-gradient-to-t from-red-600 to-red-400';
  if (ratio > 1.5) return 'bg-gradient-to-t from-yellow-600 to-yellow-400';
  return 'bg-gradient-to-t from-cyan-600 to-cyan-400';
}

function getLatencyBarColor(durationMs: number): string {
  const avg = enduranceStore.session.averageLatency || 1000;
  const ratio = durationMs / avg;
  if (ratio > 1.5) return 'bg-gradient-to-t from-red-600 to-red-400';
  if (ratio > 1.2) return 'bg-gradient-to-t from-yellow-600 to-yellow-400';
  return 'bg-gradient-to-t from-green-600 to-green-400';
}
</script>

<template>
  <div class="endurance-arena p-4">
    <div class="flex items-center gap-3 mb-4">
      <h2 class="text-2xl font-bold text-cyan-400">🔥 Endurance Arena</h2>
      <PulseRing 
        v-if="enduranceStore.isRunning" 
        color="cyan" 
        size="md" 
        :active="true" 
      />
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Left Panel: Controls -->
      <div class="space-y-4">
        <!-- Scenario Selector -->
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <label class="block text-sm text-gray-400 mb-2">Test Scenario</label>
          <select 
            v-model="selectedScenarioId"
            :disabled="enduranceStore.isRunning"
            class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white transition-colors hover:border-cyan-500 focus:border-cyan-500 focus:outline-none"
          >
            <option v-for="scenario in enduranceScenarios" :key="scenario.id" :value="scenario.id">
              {{ scenario.name }}
            </option>
          </select>
          <p v-if="selectedScenario" class="mt-2 text-sm text-gray-400">
            {{ selectedScenario.description }}
          </p>
        </div>
        
        <!-- Control Buttons -->
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <div class="flex gap-2">
            <button 
              @click="startTest"
              :disabled="!canStart"
              class="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              ▶ Start
            </button>
            <button 
              @click="enduranceStore.pauseTest"
              :disabled="!enduranceStore.isRunning"
              class="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-all duration-200"
            >
              ⏸ Pause
            </button>
            <button 
              @click="enduranceStore.resumeTest"
              :disabled="!enduranceStore.isPaused"
              class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-all duration-200"
            >
              ⏵ Resume
            </button>
          </div>
          <button 
            @click="enduranceStore.resetTest"
            :disabled="enduranceStore.isRunning"
            class="w-full mt-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-all duration-200"
          >
            ↺ Reset
          </button>
        </div>
        
        <!-- Real-time Stats -->
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <h3 class="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
            <PulseRing v-if="enduranceStore.isRunning" color="cyan" size="sm" :active="true" />
            Live Stats
          </h3>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="text-xs text-gray-400">Status</div>
              <div class="font-mono font-bold" :class="getStatusColor(enduranceStore.session.status)">
                {{ enduranceStore.session.status }}
              </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="text-xs text-gray-400">Progress</div>
              <div class="font-mono font-bold text-white">
                <CountUp 
                  :value="enduranceStore.progress.current" 
                  suffix=" / "
                />
                {{ enduranceStore.progress.total }}
              </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="text-xs text-gray-400">Peak Memory</div>
              <div class="font-mono font-bold text-white">
                {{ formatMemory(enduranceStore.session.peakMemory) }}
              </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="text-xs text-gray-400">Current Memory</div>
              <div class="font-mono font-bold" :class="currentMemory ? 'text-white' : 'text-gray-500'">
                {{ currentMemory ? formatMemory(currentMemory.used) : 'N/A' }}
              </div>
              <div v-if="!currentMemory" class="text-[10px] text-gray-500">
                (Chrome only)
              </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="text-xs text-gray-400">Avg Latency</div>
              <div class="font-mono font-bold text-white">
                <CountUp :value="enduranceStore.session.averageLatency" suffix="ms" />
              </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="text-xs text-gray-400">Leak Rate</div>
              <div class="font-mono font-bold" :class="leakRate > 1 ? 'text-red-400' : 'text-green-400'">
                {{ leakRate > 0 ? '+' : '' }}{{ leakRate }} MB/r
              </div>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="mt-4">
            <div class="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
              <div 
                class="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600 transition-all duration-500 ease-out relative"
                :style="{ width: enduranceStore.progress.percentage + '%' }"
              >
                <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div class="text-center text-sm text-gray-400 mt-1">
              <CountUp :value="enduranceStore.progress.percentage" suffix="%" /> Complete
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Panel: Visualizations -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Charts Panel -->
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <h3 class="text-lg font-bold text-cyan-400 mb-3">Performance Charts</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Memory Chart -->
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-400">Memory Usage (MB)</span>
                <span v-if="hoveredBar?.value" class="text-xs text-cyan-400 font-mono">
                  {{ hoveredBar.value }}
                </span>
              </div>
              <div class="h-32 flex items-end gap-1 relative">
                <!-- Gradient background -->
                <div class="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent opacity-50 rounded"></div>
                
                <FadeTransition v-for="(snapshot, i) in enduranceStore.session.memorySnapshots.slice(-30)" 
                  :key="i"
                  :show="true"
                  :duration="300"
                >
                  <div 
                    class="flex-1 rounded-t transition-all duration-300 hover:brightness-125 cursor-pointer relative group"
                    :class="getMemoryBarColor(snapshot)"
                    :style="{ height: getMemoryBarHeight(snapshot) }"
                    @mouseenter="hoveredBar = { 
                      index: i, 
                      value: formatMemory(snapshot.heapUsed), 
                      round: snapshot.round 
                    }"
                    @mouseleave="hoveredBar = null"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-gray-600 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div class="text-cyan-400">Round {{ snapshot.round }}</div>
                      <div class="text-white">{{ formatMemory(snapshot.heapUsed) }}</div>
                    </div>
                  </div>
                </FadeTransition>
                
                <div v-if="enduranceStore.session.memorySnapshots.length === 0" class="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  <span class="animate-pulse">Waiting for data...</span>
                </div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start</span>
                <span>Now</span>
              </div>
            </div>
            
            <!-- Latency Chart -->
            <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-400">Latency (ms)</span>
                <span class="text-xs text-gray-500">Last 30 rounds</span>
              </div>
              <div class="h-32 flex items-end gap-1 relative">
                <div class="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent opacity-50 rounded"></div>
                
                <FadeTransition v-for="(record, i) in enduranceStore.session.latencyLog.slice(-30)" 
                  :key="i"
                  :show="true"
                  :duration="300"
                >
                  <div 
                    class="flex-1 rounded-t transition-all duration-300 hover:brightness-125 cursor-pointer relative group"
                    :class="getLatencyBarColor(record.durationMs)"
                    :style="{ 
                      height: enduranceStore.session.averageLatency 
                        ? Math.min(100, Math.max(5, (record.durationMs / Math.max(enduranceStore.session.averageLatency * 2.5, 1)) * 100)) + '%'
                        : '20%'
                    }"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-gray-600 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div class="text-green-400">Round {{ record.round }}</div>
                      <div class="text-white">{{ record.durationMs }}ms</div>
                    </div>
                  </div>
                </FadeTransition>
                
                <div v-if="enduranceStore.session.latencyLog.length === 0" class="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  <span class="animate-pulse">Waiting for data...</span>
                </div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Terminal Log -->
        <div class="bg-black border border-gray-700 rounded-lg p-4 font-mono text-sm shadow-lg">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-bold text-cyan-400 flex items-center gap-2">
              📋 Test Log
            </h3>
            <label class="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300">
              <input v-model="showTimestamp" type="checkbox" class="rounded bg-gray-800 border-gray-600">
              Timestamps
            </label>
          </div>
          <div 
            class="h-48 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            ref="logContainer"
          >
            <div 
              v-for="(log, i) in enduranceStore.liveLog" 
              :key="i"
              class="text-gray-300 hover:bg-gray-800/50 px-1 rounded transition-colors"
            >
              <span v-if="showTimestamp" class="text-gray-600 mr-2">{{ log.match(/^\[([^\]]+)\]/)?.[0] || '' }}</span>
              <span v-html="log.replace(/^\[[^\]]+\] /, '').replace(/(ERROR)/, '<span class=\'text-red-400\'>$1</span>').replace(/(✓)/, '<span class=\'text-green-400\'>$1</span>').replace(/(✗)/, '<span class=\'text-red-400\'>$1</span>')"></span>
            </div>
            <div v-if="enduranceStore.liveLog.length === 0" class="text-gray-600 italic text-center py-8">
              Waiting for test to start...
            </div>
          </div>
        </div>
        
        <!-- Final Report (shown when complete) -->
        <FadeTransition :show="enduranceStore.isComplete" :duration="500">
          <div v-if="enduranceStore.isComplete" class="bg-gray-900 border-2 border-green-600 rounded-lg p-4 shadow-lg">
            <h3 class="text-xl font-bold text-green-400 mb-3 flex items-center gap-2">
              🏁 Final Report
            </h3>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
                <div class="text-xs text-gray-400">Verdict</div>
                <div class="font-bold text-lg" :class="finalReport ? getVerdictColor(finalReport.verdict) : 'text-gray-500'">
                  {{ finalReport?.verdict || 'N/A' }}
                </div>
              </div>
              <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
                <div class="text-xs text-gray-400">Pass Rate</div>
                <div class="font-bold text-lg text-white">
                  <CountUp 
                    :value="Math.round(finalReport?.passRate || 0)" 
                    suffix="%"
                  />
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ finalReport ? `${finalReport.passedRounds} / ${finalReport.totalRounds}` : '0 / 0' }}
                </div>
              </div>
              <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
                <div class="text-xs text-gray-400">Total Time</div>
                <div class="font-bold text-lg text-white">
                  {{ finalReport ? `${(finalReport.totalTimeMs / 1000).toFixed(1)}s` : '0.0s' }}
                </div>
              </div>
              <div class="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
                <div class="text-xs text-gray-400">Leak Rate</div>
                <div class="font-bold text-lg" :class="leakRate > 1 ? 'text-red-400' : 'text-green-400'">
                  {{ leakRate }} MB/r
                </div>
              </div>
            </div>
            
            <div class="mt-3">
              <ResultActionBar
                v-if="stressSharePayload"
                :payload="stressSharePayload"
                :publish-report="publishStressShare"
                :next-to="stressSharePayload.nextRoute || '/leaderboard'"
                primary-mode="leaderboard"
                retry-label="Retry Stress Test"
                utility-download-label="Download JSON Report"
                :on-utility-download="downloadReport"
                @retry-click="void retryStressTest()"
              />
            </div>
          </div>
        </FadeTransition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.endurance-arena {
  min-height: 100%;
}

/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.8);
}
</style>
