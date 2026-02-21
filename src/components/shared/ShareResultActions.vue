<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ShareResultPayload } from '@/types/share'
import { createShareCardFile } from '@/lib/share/share-card-image'
import {
  buildSocialShareTargets,
  buildSocialShareText,
  type SocialShareTarget,
} from '@/lib/share/social-share'

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
const showSocialMenu = ref(false)
const socialTargets = computed(() => buildSocialShareTargets(props.payload))

const getCardFile = async (): Promise<File | null> => {
  return createShareCardFile(props.payload)
}

const copyImageToClipboard = async (file: File): Promise<boolean> => {
  const clipboardItemCtor = (
    globalThis as typeof globalThis & { ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem }
  ).ClipboardItem
  if (!navigator.clipboard?.write || !clipboardItemCtor) return false

  try {
    const item = new clipboardItemCtor({
      [file.type || 'image/png']: file,
    })
    await navigator.clipboard.write([item])
    return true
  } catch {
    return false
  }
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
  showSocialMenu.value = false
  if (ok) emit('link-copied')
}

const copyShareLink = async () => {
  const ok = await copyText(props.payload.shareUrl)
  statusText.value = ok ? 'Share link copied.' : 'Failed to copy share link.'
  showSocialMenu.value = false
  if (ok) emit('link-copied')
}

const toggleSocialShareMenu = () => {
  showSocialMenu.value = !showSocialMenu.value
  statusText.value = showSocialMenu.value
    ? 'Choose a social platform.'
    : ''
}

const openSocialShare = async (target: SocialShareTarget) => {
  if (isBusy.value) return
  const popup = window.open(target.url, '_blank', 'noopener,noreferrer')
  if (!popup) {
    const reason = 'Unable to open share window. Please allow popups for this site.'
    statusText.value = reason
    emit('error', reason)
    return
  }

  isBusy.value = true
  showSocialMenu.value = false
  try {
    const [file, textCopied] = await Promise.all([
      getCardFile(),
      copyText(`${buildSocialShareText(props.payload)}\n${props.payload.challengeUrl}`),
    ])
    const imageCopied = file ? await copyImageToClipboard(file) : false

    if (imageCopied && textCopied) {
      statusText.value = `Opened ${target.label}. Card image + caption copied. Paste with Cmd+V.`
    } else if (imageCopied) {
      statusText.value = `Opened ${target.label}. Card image copied. Paste with Cmd+V.`
    } else if (textCopied) {
      statusText.value = `Opened ${target.label}. Caption copied. Upload card manually if needed.`
    } else {
      statusText.value = `Opened ${target.label}. Use Download Card to attach the image manually.`
    }
    emit('shared')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = `Share prep failed: ${reason}`
    emit('error', reason)
  } finally {
    isBusy.value = false
  }
}

const goNext = () => {
  if (!props.nextTo) return
  showSocialMenu.value = false
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
        @click="toggleSocialShareMenu"
      >
        Share
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
    <div
      v-if="showSocialMenu"
      class="rounded-lg border border-base-300 p-3 bg-base-200/50"
    >
      <p class="text-xs font-semibold mb-2">Social Media Share</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="target in socialTargets"
          :key="target.id"
          class="btn btn-outline btn-xs"
          @click="openSocialShare(target)"
        >
          <span class="font-bold">{{ target.icon }}</span>
          {{ target.label }}
        </button>
      </div>
      <p class="text-[11px] text-base-content/60 mt-2">
        Instagram/TikTok do not support direct web share prefill. Use Download Card for manual upload.
      </p>
    </div>
    <p v-if="statusText" class="text-xs text-base-content/70">
      {{ statusText }}
    </p>
  </div>
</template>
