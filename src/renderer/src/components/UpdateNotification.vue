<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-4 scale-98"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-4 scale-98"
  >
    <div
      v-if="visible"
      class="border-b border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 text-slate-800 dark:text-zinc-100 px-4 py-2.5 flex items-center justify-between shadow-xs transition-colors"
    >
      <!-- State: Update Available -->
      <div v-if="status.state === 'available'" class="flex items-center gap-3 text-xs">
        <div class="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <Sparkles class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-slate-900 dark:text-zinc-100">
            发现新版本 v{{ status.version }}！
          </span>
          <span class="text-slate-600 dark:text-zinc-400 ml-1.5">
            {{ status.releaseNotes ? '包含功能升级与问题修复' : '有可用的更新' }}
          </span>
        </div>
      </div>

      <!-- State: Downloading -->
      <div v-else-if="status.state === 'downloading'" class="flex items-center gap-3 text-xs flex-1 max-w-md">
        <div class="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
          <Download class="w-4 h-4 animate-bounce" />
        </div>
        <div class="flex-1">
          <div class="flex justify-between text-[11px] mb-1">
            <span class="font-semibold text-slate-800 dark:text-zinc-200">正在下载更新包...</span>
            <span class="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {{ status.progress?.percent || 0 }}%
            </span>
          </div>
          <!-- Progress bar -->
          <div class="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              class="bg-emerald-500 h-full transition-all duration-300 rounded-full"
              :style="{ width: `${status.progress?.percent || 0}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- State: Downloaded Ready to Install -->
      <div v-else-if="status.state === 'downloaded'" class="flex items-center gap-3 text-xs">
        <div class="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-slate-900 dark:text-zinc-100">新版本 v{{ status.version }} 下载完成！</span>
          <span class="text-slate-600 dark:text-zinc-400 ml-1.5">重启客户端即可无缝升级</span>
        </div>
      </div>

      <!-- State: Checking / Error info for manual check -->
      <div v-else-if="status.state === 'checking'" class="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
        <Loader2 class="w-3.5 h-3.5 animate-spin text-emerald-500" />
        <span>正在检查 GitHub 最新版本...</span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          v-if="status.state === 'available'"
          class="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          @click="startDownload"
        >
          立即下载
        </button>

        <button
          v-if="status.state === 'downloaded'"
          class="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 animate-pulse"
          @click="installNow"
        >
          立即重启更新
        </button>

        <button
          class="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition cursor-pointer"
          title="关闭提示"
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
  progress?: {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  }
  error?: string
}

const status = ref<UpdateStatus>({ state: 'idle' })
const visible = ref(false)

function handleStatusChange(newStatus: UpdateStatus): void {
  status.value = newStatus
  if (['available', 'downloading', 'downloaded', 'checking'].includes(newStatus.state)) {
    visible.value = true
  } else if (newStatus.state === 'not-available') {
    // Hide or auto-dismiss
    setTimeout(() => {
      visible.value = false
    }, 2000)
  }
}

async function startDownload(): Promise<void> {
  await window.api.downloadUpdate()
}

function installNow(): void {
  window.api.installUpdate()
}

function dismiss(): void {
  visible.value = false
}

let stopListener: (() => void) | null = null

onMounted(async () => {
  stopListener = window.api.onUpdateStatus((s) => {
    handleStatusChange(s)
  })
  const current = await window.api.getUpdateStatus()
  if (current) {
    handleStatusChange(current)
  }
})

onBeforeUnmount(() => {
  if (stopListener) stopListener()
})
</script>
