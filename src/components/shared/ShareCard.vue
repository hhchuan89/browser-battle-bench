<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import type { ShareResultPayload } from '@/types/share'

const props = defineProps<{
  payload: ShareResultPayload
}>()

const rootEl = ref<HTMLElement | null>(null)
const qrDataUrl = ref('')

const generateQr = async (targetUrl: string) => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(targetUrl, {
      width: 84,
      margin: 1,
      color: {
        dark: '#22c55e',
        light: '#000000',
      },
    })
  } catch {
    qrDataUrl.value = ''
  }
}

watch(
  () => props.payload.shareUrl,
  async (url) => {
    await generateQr(url)
  },
  { immediate: true }
)

defineExpose({
  rootEl,
})
</script>

<template>
  <article
    ref="rootEl"
    class="w-[480px] bg-black border border-green-700 rounded-xl p-5 text-green-400 font-mono"
  >
    <header class="mb-4">
      <p class="text-sm text-green-600">BROWSER BATTLE BENCH</p>
      <h3 class="text-2xl font-bold mt-1">{{ payload.badgeText }} - {{ payload.grade }}</h3>
      <p class="text-xs text-green-500 mt-1">{{ payload.scenarioName }}</p>
    </header>

    <section class="space-y-2 border border-green-900 rounded-lg p-3 bg-black/70">
      <div class="flex justify-between gap-2 text-sm">
        <span class="text-green-600">Model</span>
        <span class="text-right break-all">{{ payload.modelId }}</span>
      </div>
      <div class="flex justify-between gap-2 text-sm">
        <span class="text-green-600">Hardware</span>
        <span class="text-right">{{ payload.hardwareLabel }}</span>
      </div>
      <div class="flex justify-between gap-2 text-sm">
        <span class="text-green-600">Run Ref</span>
        <span class="text-right">{{ payload.runRef || 'N/A' }}</span>
      </div>
    </section>

    <section class="mt-4 border border-green-900 rounded-lg p-3 bg-black/70">
      <p class="text-sm text-green-600 mb-2">Battle Dimensions</p>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="border border-green-900 rounded p-2 text-center">
          <p class="text-green-600">Obedience</p>
          <p class="text-lg font-bold">{{ payload.scores.obedience.toFixed(1) }}%</p>
        </div>
        <div class="border border-green-900 rounded p-2 text-center">
          <p class="text-green-600">Intelligence</p>
          <p class="text-lg font-bold">{{ payload.scores.intelligence.toFixed(1) }}%</p>
        </div>
        <div class="border border-green-900 rounded p-2 text-center">
          <p class="text-green-600">Stability</p>
          <p class="text-lg font-bold">{{ payload.scores.stability.toFixed(1) }}%</p>
        </div>
      </div>
    </section>

    <footer class="mt-4 flex items-end justify-between gap-3">
      <div class="flex-1">
        <p class="text-sm text-green-300">"{{ payload.taunt }}"</p>
        <p class="text-xs text-green-600 mt-2">browserbattlebench.vercel.app</p>
      </div>
      <img
        v-if="qrDataUrl"
        :src="qrDataUrl"
        alt="Share QR"
        class="h-[84px] w-[84px] border border-green-900 rounded"
      />
    </footer>
  </article>
</template>

