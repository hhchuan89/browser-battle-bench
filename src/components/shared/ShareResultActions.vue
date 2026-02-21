<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import ShareCard from '@/components/shared/ShareCard.vue'
import type { ShareResultPayload } from '@/types/share'

const props = withDefaults(
  defineProps<{
    payload: ShareResultPayload
    showNext?: boolean
    nextLabel?: string
    nextTo?: string
  }>(),
  {
    showNext: false,
    nextLabel: 'Next Challenge',
    nextTo: '',
  }
)

const emit = defineEmits<{
  (event: 'shared'): void
  (event: 'link-copied'): void
  (event: 'downloaded'): void
  (event: 'next-click', to: string): void
  (event: 'error', reason: string): void
}>()

const router = useRouter()
const isBusy = ref(false)
const statusText = ref('')
const cardHostRef = ref<HTMLElement | null>(null)

const getCardFile = async (): Promise<File | null> => {
  const target = cardHostRef.value?.firstElementChild as HTMLElement | null
  if (!target) return null
  const canvas = await html2canvas(target, {
    backgroundColor: '#000000',
    scale: 2,
    useCORS: true,
  })
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), 'image/png')
  )
  if (!blob) return null
  return new File([blob], `bbb-share-${Date.now()}.png`, { type: 'image/png' })
}

const copyText = async (text: string): Promise<boolean> => {
  if (!text) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ignore and fallback below
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

const downloadCard = async () => {
  isBusy.value = true
  try {
    const file = await getCardFile()
    if (!file) throw new Error('Unable to generate share card image')
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
    statusText.value = 'Share card downloaded.'
    emit('downloaded')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = reason
    emit('error', reason)
  } finally {
    isBusy.value = false
  }
}

const copyChallengeLink = async () => {
  const ok = await copyText(props.payload.challengeUrl)
  statusText.value = ok ? 'Challenge link copied.' : 'Failed to copy challenge link.'
  if (ok) emit('link-copied')
}

const copyShareLink = async () => {
  const ok = await copyText(props.payload.shareUrl)
  statusText.value = ok ? 'Share link copied.' : 'Failed to copy share link.'
  if (ok) emit('link-copied')
}

const shareResult = async () => {
  if (isBusy.value) return
  isBusy.value = true

  const text = `${props.payload.badgeText} ${props.payload.grade} | ${props.payload.scenarioName}\n${props.payload.taunt}`
  const url = props.payload.shareUrl
  const title = `BBB ${props.payload.badgeText}`

  try {
    if (!navigator.share) {
      await downloadCard()
      return
    }

    const file = await getCardFile()
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title,
        text,
        url,
        files: [file],
      })
    } else {
      await navigator.share({ title, text, url })
    }
    statusText.value = 'Shared successfully.'
    emit('shared')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = `Share fallback: ${reason}`
    emit('error', reason)
    await downloadCard()
  } finally {
    isBusy.value = false
  }
}

const goNext = () => {
  if (!props.nextTo) return
  router.push(props.nextTo)
  emit('next-click', props.nextTo)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <button
        class="btn btn-primary btn-sm"
        :disabled="isBusy"
        @click="shareResult"
      >
        {{ isBusy ? 'Preparing...' : 'Share' }}
      </button>
      <button
        class="btn btn-secondary btn-sm"
        :disabled="isBusy"
        @click="copyChallengeLink"
      >
        Challenge a Friend
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="isBusy"
        @click="copyShareLink"
      >
        Copy Link
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="isBusy"
        @click="downloadCard"
      >
        Download Card
      </button>
      <button
        v-if="showNext && nextTo"
        class="btn btn-accent btn-sm"
        :disabled="isBusy"
        @click="goNext"
      >
        {{ nextLabel }}
      </button>
    </div>
    <p v-if="statusText" class="text-xs text-base-content/70">
      {{ statusText }}
    </p>

    <div ref="cardHostRef" class="fixed -left-[9999px] -top-[9999px] pointer-events-none">
      <ShareCard :payload="payload" />
    </div>
  </div>
</template>
