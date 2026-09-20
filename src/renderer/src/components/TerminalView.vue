<template>
  <div class="h-full flex flex-col bg-zinc-950">
    <!-- Log controls bar -->
    <div class="h-9 px-4 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800/80 bg-slate-100 dark:bg-zinc-900/60 text-xs text-slate-600 dark:text-zinc-400 transition-colors">
      <div class="flex items-center gap-2">
        <Terminal class="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span class="font-mono text-[11px] font-medium">控制台实时日志输出</span>
        <span class="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">({{ logLinesCount }} 行)</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition text-[11px] font-medium cursor-pointer"
          title="复制所有日志"
          @click="copyLogs"
        >
          <Copy class="w-3 h-3" />
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>
        <button
          class="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition text-[11px] font-medium cursor-pointer"
          title="清空日志"
          @click="clearLogs"
        >
          <Trash2 class="w-3 h-3" />
          <span>清空</span>
        </button>
      </div>
    </div>

    <!-- Terminal container -->
    <div ref="terminalRef" class="flex-1 p-2 overflow-hidden bg-zinc-950"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal, Trash2, Copy } from 'lucide-vue-next'
import { useServiceStore } from '../stores/serviceStore'

const props = defineProps<{
  serviceId: string
}>()

const store = useServiceStore()
const terminalRef = ref<HTMLDivElement | null>(null)
const copied = ref(false)

let term: XTerm | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null

const logLinesCount = computed(() => {
  return store.logs[props.serviceId]?.length || 0
})

function initTerminal(): void {
  if (!terminalRef.value) return

  term = new XTerm({
    theme: {
      background: '#09090b', // zinc-950
      foreground: '#f4f4f5', // zinc-100
      cursor: '#10b981', // emerald-500
      selectionBackground: '#27272a',
      black: '#18181b',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#d946ef',
      cyan: '#06b6d4',
      white: '#fafafa',
      brightBlack: '#52525b',
      brightRed: '#f87171',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#e879f9',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff'
    },
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 12,
    lineHeight: 1.4,
    scrollback: 5000,
    cursorBlink: true,
    disableStdin: true
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalRef.value)

  setTimeout(() => {
    fitAddon?.fit()
  }, 100)

  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  resizeObserver.observe(terminalRef.value)

  reloadLogs()
}

function reloadLogs(): void {
  if (!term) return
  term.clear()
  const history = store.logs[props.serviceId] || []
  for (const line of history) {
    term.write(line)
  }
  term.scrollToBottom()
}

function clearLogs(): void {
  store.clearLogs(props.serviceId)
  term?.clear()
}

function copyLogs(): void {
  const history = store.logs[props.serviceId] || []
  navigator.clipboard.writeText(history.join(''))
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}

watch(
  () => props.serviceId,
  () => {
    reloadLogs()
  }
)

const stopListener = window.api.onLog((data) => {
  if (data.serviceId === props.serviceId && term) {
    term.write(data.text)
  }
})

onMounted(() => {
  initTerminal()
})

onBeforeUnmount(() => {
  stopListener()
  resizeObserver?.disconnect()
  term?.dispose()
})
</script>
