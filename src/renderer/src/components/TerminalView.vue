<template>
  <div class="h-full flex flex-col bg-surface">
    <!-- Log controls bar -->
    <div class="h-9 px-4 flex items-center justify-between border-b border-line bg-surface text-[11px] text-ink-tertiary">
      <div class="flex items-center gap-2">
        <Terminal class="w-3.5 h-3.5 text-ink-tertiary" />
        <span class="font-mono text-[11px]">Logs</span>
        <span class="text-[10px] text-ink-tertiary font-mono">{{ logLinesCount }}</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="flex items-center gap-1 px-2 py-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition text-[11px] cursor-pointer"
          title="复制所有日志"
          @click="copyLogs"
        >
          <Copy class="w-3 h-3" />
          <span>{{ copied ? 'Copied' : 'Copy' }}</span>
        </button>
        <button
          class="flex items-center gap-1 px-2 py-1 rounded-md text-ink-tertiary hover:text-vercel-red hover:bg-surface-hover transition text-[11px] cursor-pointer"
          title="清空日志"
          @click="clearLogs"
        >
          <Trash2 class="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Terminal container -->
    <div ref="terminalRef" class="flex-1 p-2 overflow-hidden bg-surface"></div>
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

const logLinesCount = computed(() => store.logs[props.serviceId]?.length || 0)

function initTerminal(): void {
  if (!terminalRef.value) return

  term = new XTerm({
    theme: {
      background: '#ffffff',
      foreground: '#171717',
      cursor: '#0a0a0a',
      selectionBackground: '#e5e5e5',
      black: '#333333',
      red: '#ee0000',
      green: '#0a7b3b',
      yellow: '#a15c00',
      blue: '#0070f3',
      magenta: '#a02282',
      cyan: '#0a8f8f',
      white: '#e5e5e5',
      brightBlack: '#8f8f8f',
      brightRed: '#f5483d',
      brightGreen: '#17a34a',
      brightYellow: '#d97706',
      brightBlue: '#3d8bff',
      brightMagenta: '#d946ef',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff'
    },
    fontFamily: '"Geist Mono", "SF Mono", Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.5,
    scrollback: 5000,
    cursorBlink: true,
    disableStdin: true
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalRef.value)

  setTimeout(() => fitAddon?.fit(), 100)

  resizeObserver = new ResizeObserver(() => fitAddon?.fit())
  resizeObserver.observe(terminalRef.value)

  reloadLogs()
}

function reloadLogs(): void {
  if (!term) return
  term.clear()
  const history = store.logs[props.serviceId] || []
  for (const line of history) term.write(line)
  term.scrollToBottom()
}

function clearLogs(): void {
  store.clearLogs(props.serviceId)
  term?.clear()
}

function copyLogs(): void {
  navigator.clipboard.writeText((store.logs[props.serviceId] || []).join(''))
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

watch(() => props.serviceId, () => reloadLogs())

const stopListener = window.api.onLog((data) => {
  if (data.serviceId === props.serviceId && term) term.write(data.text)
})

onMounted(() => initTerminal())

onBeforeUnmount(() => {
  stopListener()
  resizeObserver?.disconnect()
  term?.dispose()
})
</script>
