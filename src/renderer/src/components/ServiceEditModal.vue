<template>
  <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] text-slate-800 dark:text-zinc-300 transition-colors">
      <!-- Header -->
      <div class="h-14 px-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100">
          {{ isEdit ? '编辑服务配置' : '添加新服务' }}
        </h3>
        <button
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
          @click="$emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
        <!-- Basic info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">服务名称 *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如: Image Gateway"
              class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition"
              @input="onNameInput"
            />
          </div>
          <div>
            <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">唯一标识 (ID) *</label>
            <input
              v-model="form.id"
              type="text"
              :disabled="isEdit"
              placeholder="例如: image-gateway"
              class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">服务简介 / 描述</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="简要说明此服务的作用"
            class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition"
          />
        </div>

        <!-- Runtime Type & Working Directory -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">运行时类型 *</label>
            <select
              v-model="form.type"
              class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition"
            >
              <option value="go">Go 语言服务</option>
              <option value="node">Node.js 服务</option>
              <option value="python">Python 服务</option>
              <option value="binary">独立二进制程序</option>
              <option value="custom">通用命令行服务</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">工作目录 (CWD) *</label>
            <div class="flex gap-2">
              <input
                v-model="form.cwd"
                type="text"
                placeholder="/path/to/project"
                class="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition font-mono"
              />
              <button
                type="button"
                class="px-3 py-2 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition text-xs font-semibold cursor-pointer"
                @click="browseDirectory"
              >
                浏览
              </button>
            </div>
          </div>
        </div>

        <!-- Start Command -->
        <div>
          <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">启动命令 *</label>
          <input
            v-model="form.command"
            type="text"
            placeholder="例如: go run ./cmd/server 或 npm run dev"
            class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition font-mono"
          />
        </div>

        <!-- Port & Web URL -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-slate-600 dark:text-zinc-400 font-semibold">监听端口</label>
              <button
                v-if="form.port"
                type="button"
                class="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                @click="checkPortOccupied"
              >
                {{ portStatusText || '探测端口' }}
              </button>
            </div>
            <input
              v-model.number="form.port"
              type="number"
              placeholder="例如: 8080"
              class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition font-mono"
            />
          </div>
          <div class="col-span-2">
            <label class="block text-slate-600 dark:text-zinc-400 font-semibold mb-1.5">自带 Web 管理界面 URL</label>
            <input
              v-model="form.webUrl"
              type="text"
              placeholder="例如: http://127.0.0.1:8080 (支持直接内嵌查看)"
              class="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 outline-none transition font-mono"
            />
          </div>
        </div>

        <!-- Health Check -->
        <div class="bg-slate-50 dark:bg-zinc-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 space-y-3">
          <span class="text-xs font-bold text-slate-800 dark:text-zinc-300">健康检查探针设置</span>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-600 dark:text-zinc-400 mb-1 font-medium">探针类型</label>
              <select
                v-model="healthCheckType"
                class="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 outline-none text-xs"
              >
                <option value="none">无 (启动即认定就绪)</option>
                <option value="tcp">TCP 端口监听探针</option>
                <option value="http">HTTP 接口探针</option>
              </select>
            </div>
            <div v-if="healthCheckType === 'http'" class="col-span-2">
              <label class="block text-slate-600 dark:text-zinc-400 mb-1 font-medium">HTTP 探针地址</label>
              <input
                v-model="healthCheckEndpoint"
                type="text"
                placeholder="例如: http://127.0.0.1:8080/health"
                class="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 outline-none text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <!-- Credentials section -->
        <div class="bg-slate-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <KeyRound class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span class="text-xs font-bold text-slate-800 dark:text-zinc-300">本地服务账号与密钥记录 (自动加密)</span>
            </div>
            <button
              type="button"
              class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              @click="addCredential"
            >
              <Plus class="w-3.5 h-3.5" />
              添加凭据项
            </button>
          </div>

          <div v-if="credentials.length === 0" class="text-center py-3 text-slate-400 dark:text-zinc-500 text-xs">
            暂无记录的账号密码。如有后台管理员账号或 API Key，建议添加备忘。
          </div>

          <div
            v-for="(cred, idx) in credentials"
            :key="idx"
            class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 relative shadow-2xs"
          >
            <button
              type="button"
              class="absolute top-2 right-2 text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 p-1 cursor-pointer"
              @click="removeCredential(idx)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="cred.label"
                type="text"
                placeholder="凭据用途 (例如: 管理员账号)"
                class="bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 text-xs outline-none"
              />
              <input
                v-model="cred.note"
                type="text"
                placeholder="备忘备注 (例如: 默认账号)"
                class="bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 text-xs outline-none"
              />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <input
                v-model="cred.username"
                type="text"
                placeholder="用户名 / 账号"
                class="bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 text-xs font-mono outline-none"
              />
              <input
                v-model="cred.password"
                type="text"
                placeholder="登录密码"
                class="bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 text-xs font-mono outline-none"
              />
              <input
                v-model="cred.apiKey"
                type="text"
                placeholder="API Key / Token"
                class="bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 text-xs font-mono outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Auto Start Checkbox -->
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            v-model="form.autoStart"
            type="checkbox"
            class="rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-0 bg-white dark:bg-zinc-950"
          />
          <span class="text-slate-700 dark:text-zinc-300 font-medium">客户端启动时自动拉起此服务</span>
        </label>
      </div>

      <!-- Footer -->
      <div class="h-14 px-6 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <button
          v-if="isEdit"
          type="button"
          class="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          @click="onDelete"
        >
          <Trash2 class="w-3.5 h-3.5" />
          删除此服务
        </button>
        <div v-else></div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
            @click="onSave"
          >
            保存服务
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { X, Trash2, KeyRound, Plus } from 'lucide-vue-next'
import { ServiceConfig, ServiceCredential } from '../../../../src/main/types'
import { useServiceStore } from '../stores/serviceStore'

const props = defineProps<{
  initialData?: ServiceConfig | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const store = useServiceStore()
const isEdit = !!props.initialData

const form = reactive<ServiceConfig>({
  id: props.initialData?.id || '',
  name: props.initialData?.name || '',
  description: props.initialData?.description || '',
  type: props.initialData?.type || 'go',
  cwd: props.initialData?.cwd || '',
  command: props.initialData?.command || '',
  port: props.initialData?.port,
  webUrl: props.initialData?.webUrl || '',
  credentials: props.initialData?.credentials ? JSON.parse(JSON.stringify(props.initialData.credentials)) : [],
  autoStart: props.initialData?.autoStart || false
})

const healthCheckType = ref<'http' | 'tcp' | 'none'>(props.initialData?.healthCheck?.type || 'none')
const healthCheckEndpoint = ref<string>(props.initialData?.healthCheck?.endpoint || '')
const credentials = ref<ServiceCredential[]>(form.credentials)
const portStatusText = ref<string>('')

function onNameInput(): void {
  if (!isEdit && !form.id) {
    form.id = form.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
  }
}

async function browseDirectory(): Promise<void> {
  const selected = await window.api.selectDirectory()
  if (selected) {
    form.cwd = selected
    const detected = await window.api.detectFolder(selected)
    if (detected) {
      if (!form.name && detected.name) form.name = detected.name
      if (!form.id && detected.id) form.id = detected.id
      if (detected.type) form.type = detected.type
      if (detected.command && !form.command) form.command = detected.command
      if (detected.port && !form.port) form.port = detected.port
      if (detected.webUrl && !form.webUrl) form.webUrl = detected.webUrl
    }
  }
}

async function checkPortOccupied(): Promise<void> {
  if (!form.port) return
  portStatusText.value = '正在检测...'
  const res = await window.api.checkPort(form.port)
  if (res.inUse) {
    portStatusText.value = `已监听 (PID:${res.pid || '?'})`
  } else {
    portStatusText.value = '空闲可用 ✓'
  }
}

function addCredential(): void {
  credentials.value.push({
    id: `cred-${Date.now()}`,
    label: '',
    username: '',
    password: '',
    apiKey: '',
    note: ''
  })
}

function removeCredential(idx: number): void {
  credentials.value.splice(idx, 1)
}

async function onSave(): Promise<void> {
  if (!form.id || !form.name || !form.command || !form.cwd) {
    alert('请填写完整的必填项 (名称, ID, 工作目录, 启动命令)')
    return
  }

  form.healthCheck = {
    type: healthCheckType.value,
    endpoint: healthCheckType.value === 'http' ? healthCheckEndpoint.value : undefined
  }
  form.credentials = credentials.value

  await store.saveService(form)
  emit('saved')
  emit('close')
}

async function onDelete(): Promise<void> {
  if (confirm(`确定要删除服务「${form.name}」吗？`)) {
    await store.deleteService(form.id)
    emit('close')
  }
}
</script>
