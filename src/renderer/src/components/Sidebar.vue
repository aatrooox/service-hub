<template>
  <aside class="w-64 bg-slate-100/90 dark:bg-zinc-900/70 border-r border-slate-200 dark:border-zinc-800/80 flex flex-col h-full select-none transition-colors duration-200">
    <!-- Header with window drag area -->
    <div class="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-zinc-800/80 titlebar-drag">
      <div class="flex items-center gap-2 pl-16 titlebar-no-drag">
        <span class="font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
          ServiceHub
        </span>
        <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono">
          v1.0
        </span>
      </div>
      <div class="flex items-center gap-1 titlebar-no-drag">
        <!-- Theme toggle -->
        <button
          class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition"
          :title="isDark ? '切换为浅色模式' : '切换为深色模式'"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="w-4 h-4" />
          <Moon v-else class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition"
          title="导入服务目录"
          @click="$emit('open-import')"
        >
          <FolderInput class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition"
          title="添加新服务"
          @click="$emit('open-add')"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Batch operations -->
    <div class="p-3 border-b border-slate-200/80 dark:border-zinc-800/60 flex gap-2">
      <button
        class="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
        @click="store.startAll()"
      >
        <Play class="w-3.5 h-3.5 fill-current" />
        全部启动
      </button>
      <button
        class="flex-1 py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
        @click="store.stopAll()"
      >
        <Square class="w-3.5 h-3.5 fill-current" />
        全部停止
      </button>
    </div>

    <!-- Service List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="store.services.length === 0" class="text-center py-10 text-xs text-slate-400 dark:text-zinc-500">
        暂无注册服务，点击右上角「+」或导入目录
      </div>

      <div
        v-for="service in store.services"
        :key="service.id"
        class="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition border"
        :class="[
          store.activeServiceId === service.id
            ? 'bg-white dark:bg-zinc-800/90 border-slate-300 dark:border-zinc-700 shadow-xs text-slate-900 dark:text-zinc-100'
            : 'border-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/40 hover:text-slate-900 dark:hover:text-zinc-200'
        ]"
        @click="store.selectService(service.id)"
      >
        <!-- Type badge / icon -->
        <div class="relative flex items-center justify-center">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
            :class="getTypeBadgeClass(service.type)"
          >
            {{ getTypeShort(service.type) }}
          </div>
          <!-- Status dot -->
          <span
            class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900"
            :class="getStatusDotClass(service.runtime?.status)"
          ></span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold truncate leading-snug">
              {{ service.name }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-500 font-mono mt-0.5">
            <span v-if="service.port" class="truncate">:{{ service.port }}</span>
            <span v-else class="truncate">无端口</span>
            <span v-if="service.runtime?.pid" class="text-slate-600 dark:text-zinc-400">pid:{{ service.runtime.pid }}</span>
          </div>
        </div>

        <!-- Quick play/stop on hover or active -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          <button
            v-if="service.runtime?.status !== 'RUNNING' && service.runtime?.status !== 'STARTING'"
            class="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition"
            title="启动服务"
            @click.stop="store.startService(service.id)"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            v-else
            class="p-1 rounded-md hover:bg-red-500/20 text-red-600 dark:text-red-400 transition"
            title="停止服务"
            @click.stop="store.stopService(service.id)"
          >
            <Square class="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>

    <!-- Footer info -->
    <div class="p-3 border-t border-slate-200 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-500 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span>已托管 {{ store.services.length }} 个服务</span>
        <button
          class="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1 cursor-pointer"
          title="检查新版本"
          @click="checkUpdate"
        >
          <RefreshCw class="w-3 h-3" />
          <span>更新</span>
        </button>
      </div>
      <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
        {{ runningCount }} 运行中
      </span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Plus, FolderInput, Play, Square, Sun, Moon, RefreshCw } from 'lucide-vue-next'
import { useServiceStore } from '../stores/serviceStore'
import { useTheme } from '../composables/useTheme'
import { ServiceType, ServiceStatus } from '../../../../src/main/types'

defineEmits<{
  (e: 'open-add'): void
  (e: 'open-import'): void
}>()

const store = useServiceStore()
const { isDark, toggleTheme } = useTheme()

async function checkUpdate(): Promise<void> {
  await window.api.checkForUpdates()
}

const runningCount = computed(() => {
  return store.services.filter((s) => s.runtime?.status === 'RUNNING').length
})

function getTypeShort(type: ServiceType): string {
  switch (type) {
    case 'go': return 'Go'
    case 'node': return 'JS'
    case 'python': return 'Py'
    case 'binary': return 'Bin'
    default: return 'Cmd'
  }
}

function getTypeBadgeClass(type: ServiceType): string {
  switch (type) {
    case 'go':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30'
    case 'node':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
    case 'python':
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
    case 'binary':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30'
    default:
      return 'bg-slate-200/60 text-slate-700 border border-slate-300 dark:bg-zinc-700/30 dark:text-zinc-400 dark:border-zinc-600/30'
  }
}

function getStatusDotClass(status?: ServiceStatus): string {
  switch (status) {
    case 'RUNNING': return 'bg-emerald-500 animate-pulse'
    case 'STARTING': return 'bg-amber-400 animate-ping'
    case 'CRASHED': return 'bg-red-500'
    default: return 'bg-slate-400 dark:bg-zinc-600'
  }
}
</script>
