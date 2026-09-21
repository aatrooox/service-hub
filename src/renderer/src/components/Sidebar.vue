<template>
  <aside class="w-64 bg-surface border-r border-line flex flex-col h-full select-none">
    <!-- Header with window drag area -->
    <div class="h-14 flex items-center justify-between px-4 border-b border-line titlebar-drag">
      <div class="flex items-center gap-2 pl-14 titlebar-no-drag">
        <span class="font-sans font-bold text-[13px] tracking-tight text-ink">
          ServiceHub
        </span>
        <span class="text-[10px] px-1.5 py-[1px] bg-canvas text-ink-tertiary font-mono border border-line rounded">
          1.0
        </span>
      </div>
      <div class="flex items-center gap-0.5 titlebar-no-drag">
        <button
          class="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition cursor-pointer"
          title="导入服务目录"
          @click="$emit('open-import')"
        >
          <FolderInput class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition cursor-pointer"
          title="添加新服务"
          @click="$emit('open-add')"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Batch operations -->
    <div class="p-3 border-b border-line flex gap-2">
      <button
        class="flex-1 py-1.5 px-2.5 rounded-md border border-line hover:border-line-strong bg-surface text-ink text-[12px] font-medium flex items-center justify-center gap-1.5 transition active:scale-[.98] cursor-pointer"
        @click="store.startAll()"
      >
        <Play class="w-3 h-3 fill-current" />
        全部启动
      </button>
      <button
        class="flex-1 py-1.5 px-2.5 rounded-md border border-line hover:border-line-strong bg-surface text-ink text-[12px] font-medium flex items-center justify-center gap-1.5 transition active:scale-[.98] cursor-pointer"
        @click="store.stopAll()"
      >
        <Square class="w-3 h-3 fill-current" />
        全部停止
      </button>
    </div>

    <!-- Service List -->
    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="store.services.length === 0" class="text-center py-10 text-[12px] text-ink-tertiary leading-relaxed px-4">
        暂无服务<br />点击右上角「+」或导入目录
      </div>

      <div
        v-for="service in store.services"
        :key="service.id"
        class="group relative flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition"
        :class="[
          store.activeServiceId === service.id
            ? 'bg-canvas text-ink'
            : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
        ]"
        @click="store.selectService(service.id)"
      >
        <!-- Type badge -->
        <div class="relative flex items-center justify-center">
          <div
            class="w-7 h-7 rounded-md flex items-center justify-center font-mono text-[9px] font-medium tracking-wide border"
            :class="getTypeBadgeClass(service.type)"
          >
            {{ getTypeShort(service.type) }}
          </div>
          <!-- Status dot -->
          <span
            class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-surface"
            :class="getStatusDotClass(service.runtime?.status)"
          ></span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <span class="text-[13px] font-medium truncate leading-tight block">
            {{ service.name }}
          </span>
          <div class="flex items-center gap-1.5 text-[10px] text-ink-tertiary font-mono mt-px">
            <span v-if="service.port" class="truncate">:{{ service.port }}</span>
            <span v-else class="truncate">no port</span>
            <span v-if="service.runtime?.pid">· {{ service.runtime.pid }}</span>
          </div>
        </div>

        <!-- Quick play/stop on hover -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          <button
            v-if="service.runtime?.status !== 'RUNNING' && service.runtime?.status !== 'STARTING'"
            class="p-1 rounded-md text-ink-tertiary hover:text-vercel-blue transition cursor-pointer"
            title="启动服务"
            @click.stop="store.startService(service.id)"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            v-else
            class="p-1 rounded-md text-ink-tertiary hover:text-vercel-red transition cursor-pointer"
            title="停止服务"
            @click.stop="store.stopService(service.id)"
          >
            <Square class="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>

    <!-- Footer info -->
    <div class="p-3 border-t border-line text-[11px] text-ink-tertiary flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span>{{ store.services.length }} 个服务</span>
        <button
          class="text-ink-tertiary hover:text-ink transition flex items-center gap-1 cursor-pointer"
          title="检查新版本"
          @click="checkUpdate"
        >
          <RefreshCw class="w-3 h-3" />
          <span>更新</span>
        </button>
      </div>
      <span class="flex items-center gap-1.5 text-ink-secondary font-mono text-[11px]">
        <span class="w-1.5 h-1.5 rounded-full bg-vercel-green"></span>
        {{ runningCount }}
      </span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Plus, FolderInput, Play, Square, RefreshCw } from 'lucide-vue-next'
import { useServiceStore } from '../stores/serviceStore'
import { ServiceType, ServiceStatus } from '../../../../src/main/types'

defineEmits<{
  (e: 'open-add'): void
  (e: 'open-import'): void
}>()

const store = useServiceStore()

async function checkUpdate(): Promise<void> {
  await window.api.checkForUpdates()
}

const runningCount = computed(() => {
  return store.services.filter((s) => s.runtime?.status === 'RUNNING').length
})

function getTypeShort(type: ServiceType): string {
  switch (type) {
    case 'go': return 'GO'
    case 'node': return 'JS'
    case 'python': return 'PY'
    case 'binary': return 'BIN'
    default: return 'CMD'
  }
}

function getTypeBadgeClass(type: ServiceType): string {
  const base = 'bg-surface '
  switch (type) {
    case 'go':
      return base + 'text-sky-600 border-sky-200'
    case 'node':
      return base + 'text-green-600 border-green-200'
    case 'python':
      return base + 'text-amber-600 border-amber-200'
    case 'binary':
      return base + 'text-violet-600 border-violet-200'
    default:
      return base + 'text-ink-tertiary border-line'
  }
}

function getStatusDotClass(status?: ServiceStatus): string {
  switch (status) {
    case 'RUNNING': return 'bg-vercel-green'
    case 'STARTING': return 'bg-vercel-amber animate-pulse'
    case 'CRASHED': return 'bg-vercel-red'
    default: return 'bg-ink-tertiary'
  }
}
</script>
