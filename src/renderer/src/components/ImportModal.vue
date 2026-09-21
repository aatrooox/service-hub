<template>
  <div class="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-line rounded-xl w-full max-w-lg flex flex-col shadow-lg shadow-black/5">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 h-14 border-b border-line">
        <div class="flex items-center gap-2">
          <FolderInput class="w-4 h-4 text-ink-tertiary" />
          <h3 class="text-[13px] font-semibold">智能导入本地服务</h3>
        </div>
        <button
          class="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover cursor-pointer"
          @click="$emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-4">
        <p class="text-[12px] text-ink-secondary leading-relaxed">
          选择任意本地项目目录，ServiceHub 将自动嗅探
          <code class="text-ink font-mono text-[11px]">service.manifest.json</code>、
          <code class="text-ink font-mono text-[11px]">package.json</code> 或
          <code class="text-ink font-mono text-[11px]">go.mod</code>，自动提取名称和启动命令。
        </p>

        <button
          class="w-full border border-dashed border-line-strong hover:border-ink-tertiary rounded-lg py-9 flex flex-col items-center justify-center cursor-pointer transition bg-canvas"
          @click="chooseFolder"
        >
          <FolderUp class="w-8 h-8 text-ink-tertiary mb-2" />
          <span class="text-[12px] font-medium text-ink">点击选择服务所在文件夹</span>
          <span class="text-[11px] text-ink-tertiary mt-1">支持 Go、Node、Python 等任意工程</span>
        </button>

        <!-- Preview -->
        <div v-if="detected" class="bg-canvas rounded-lg border border-line p-3.5 space-y-2 text-[11px]">
          <div class="flex items-center justify-between text-ink font-medium">
            <span>识别到服务: {{ detected.name }}</span>
            <span class="uppercase text-[9px] px-1.5 py-[1px] bg-surface text-ink-tertiary font-mono border border-line rounded">
              {{ detected.type }}
            </span>
          </div>
          <div class="text-ink-tertiary font-mono text-[10px] truncate">
            {{ detected.cwd }}
          </div>
          <div class="text-ink-tertiary font-mono text-[10px] truncate">
            {{ detected.command || '未配置命令' }}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2 px-5 h-14 border-t border-line">
        <button
          type="button"
          class="px-4 py-1.5 rounded-md border border-line text-ink-secondary hover:text-ink hover:border-line-strong text-[12px] font-medium transition cursor-pointer"
          @click="$emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="!detected"
          class="px-4 py-1.5 rounded-md bg-ink hover:bg-neutral-800 text-surface text-[12px] font-medium transition disabled:opacity-40 cursor-pointer"
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
    if (res) detected.value = res
  }
}

async function confirmImport(): Promise<void> {
  // Detected data is a deep Vue reactive Proxy which cannot be structured-cloned over IPC.
  const raw = JSON.parse(JSON.stringify(detected.value || {})) as Partial<ServiceConfig>
  if (!raw.id || !raw.name || !raw.cwd) return

  const fullConfig: ServiceConfig = {
    id: raw.id,
    name: raw.name,
    description: raw.description || '',
    type: raw.type || 'custom',
    cwd: raw.cwd,
    command: raw.command || '',
    port: raw.port,
    webUrl: raw.webUrl || (raw.port ? `http://127.0.0.1:${raw.port}` : ''),
    healthCheck: raw.healthCheck || { type: raw.port ? 'tcp' : 'none' },
    credentials: raw.credentials || [],
    autoStart: false
  }

  try {
    await store.saveService(fullConfig)
    emit('imported', fullConfig)
    emit('close')
  } catch (err) {
    console.error('[confirmImport] saveService failed:', err)
    alert('导入失败: ' + (err instanceof Error ? err.message : String(err)))
  }
}
</script>
