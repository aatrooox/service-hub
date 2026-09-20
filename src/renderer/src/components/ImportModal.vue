<template>
  <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col p-6 space-y-4 text-slate-800 dark:text-zinc-300 transition-colors">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div class="flex items-center gap-2">
          <FolderInput class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100">智能导入本地服务</h3>
        </div>
        <button
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
          @click="$emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <p class="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
        选择任意本地项目目录，ServiceHub 将自动嗅探
        <code class="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">service.manifest.json</code>、
        <code class="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">package.json</code> 或
        <code class="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">go.mod</code>，自动提取名称和默认启动命令。
      </p>

      <div
        class="border-2 border-dashed border-slate-300 dark:border-zinc-700/80 hover:border-emerald-500 dark:hover:border-emerald-500/80 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/80 dark:bg-zinc-950/40"
        @click="chooseFolder"
      >
        <FolderUp class="w-10 h-10 text-slate-400 dark:text-zinc-500 mb-2" />
        <span class="text-xs font-semibold text-slate-700 dark:text-zinc-300">点击选择服务所在文件夹</span>
        <span class="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">支持 Go、Node、Python 等任意工程</span>
      </div>

      <!-- Preview detected info -->
      <div v-if="detected" class="bg-slate-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
        <div class="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
          <span>识别到服务: {{ detected.name }}</span>
          <span class="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono font-semibold">
            {{ detected.type }}
          </span>
        </div>
        <div class="text-slate-600 dark:text-zinc-400 font-mono text-[11px] truncate">
          路径: {{ detected.cwd }}
        </div>
        <div class="text-slate-600 dark:text-zinc-400 font-mono text-[11px] truncate">
          命令: {{ detected.command || '未配置' }}
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
          @click="$emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="!detected"
          class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-40 shadow-md shadow-emerald-600/20 cursor-pointer"
          @click="confirmImport"
        >
          完成导入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X, FolderInput, FolderUp } from 'lucide-vue-next'
import { ServiceConfig } from '../../../../src/main/types'
import { useServiceStore } from '../stores/serviceStore'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'imported', service: ServiceConfig): void
}>()

const store = useServiceStore()
const detected = ref<Partial<ServiceConfig> | null>(null)

async function chooseFolder(): Promise<void> {
  const folder = await window.api.selectDirectory()
  if (folder) {
    const res = await window.api.detectFolder(folder)
    if (res) {
      detected.value = res
    }
  }
}

async function confirmImport(): Promise<void> {
  if (!detected.value || !detected.value.id || !detected.value.name || !detected.value.cwd) return

  const fullConfig: ServiceConfig = {
    id: detected.value.id,
    name: detected.value.name,
    description: detected.value.description || '',
    type: detected.value.type || 'custom',
    cwd: detected.value.cwd,
    command: detected.value.command || '',
    port: detected.value.port,
    webUrl: detected.value.webUrl || (detected.value.port ? `http://127.0.0.1:${detected.value.port}` : ''),
    healthCheck: detected.value.healthCheck || { type: detected.value.port ? 'tcp' : 'none' },
    credentials: detected.value.credentials || [],
    autoStart: false
  }

  await store.saveService(fullConfig)
  emit('imported', fullConfig)
  emit('close')
}
</script>
