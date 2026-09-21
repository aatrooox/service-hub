<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="border-b border-line bg-surface px-4 py-2.5 flex items-center justify-between text-[12px]"
    >
      <!-- Available -->
      <div v-if="status.state === 'available'" class="flex items-center gap-3">
        <Sparkles class="w-4 h-4 text-vercel-blue" />
        <div>
          <span class="font-medium text-ink">发现新版本 v{{ status.version }}</span>
          <span class="text-ink-tertiary ml-2">功能升级与问题修复</span>
        </div>
      </div>

      <!-- Downloading -->
      <div v-else-if="status.state === 'downloading'" class="flex items-center gap-3 flex-1 max-w-md">
        <Download class="w-4 h-4 text-vercel-blue" />
        <div class="flex-1">
          <div class="flex justify-between text-[11px] mb-1">
            <span class="text-ink-secondary">正在下载更新包</span>
            <span class="font-mono text-vercel-blue font-medium">{{ status.progress?.percent || 0 }}%</span>
          </div>
          <div class="w-full bg-line h-1 rounded-full overflow-hidden">
            <div class="bg-vercel-blue h-full transition-all duration-300" :style="{ width: `${status.progress?.percent || 0}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Downloaded -->
      <div v-else-if="status.state === 'downloaded'" class="flex items-center gap-3">
        <CheckCircle2 class="w-4 h-4 text-ink-secondary" />
        <div>
          <span class="font-medium text-ink">下载完成</span>
          <span class="text-ink-tertiary ml-2">重启客户端即可升级</span>
        </div>
      </div>

      <!-- Checking -->
      <div v-else-if="status.state === 'checking'" class="flex items-center gap-2 text-ink-tertiary">
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        <span>正在检查更新</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="status.state === 'available'"
          class="px-3 py-1 rounded-md bg-ink hover:bg-neutral-800 text-surface font-medium text-[12px] transition cursor-pointer"
          @click="startDownload"
        >
          立即下载
        </button>
        <button
          v-if="status.state === 'downloaded'"
          class="px-3 py-1 rounded-md bg-vercel-blue text-white font-medium text-[12px] transition cursor-pointer"
          @click="installNow"
        >
          立即重启
        </button>
        <button
          class="p-1 text-ink-tertiary hover:text-ink cursor-pointer"
          @click="dismiss"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Sparkles, Download, CheckCircle2, Loader2, X } from 'lucide-vue-next'

interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: string
  progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number }
  error?: string
}

const status = ref<UpdateStatus>({ state: 'idle' })
const visible = ref(false)

function handleStatusChange(s: UpdateStatus): void {
  status.value = s
  if (['available', 'downloading', 'downloaded', 'checking'].includes(s.state)) visible.value = true
  else if (s.state === 'not-available') setTimeout(() => (visible.value = false), 2000)
}

function startDownload(): void { window.api.downloadUpdate() }
function installNow(): void { window.api.installUpdate() }
function dismiss(): void { visible.value = false }

let stopListener: (() => void) | null = null

onMounted(async () => {
  stopListener = window.api.onUpdateStatus((s) => handleStatusChange(s))
  const current = await window.api.getUpdateStatus()
  if (current) handleStatusChange(current)
})

onBeforeUnmount(() => { if (stopListener) stopListener() })
</script>
