<template>
  <div class="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-line rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-lg shadow-black/5">
      <!-- Header -->
      <div class="h-14 px-5 border-b border-line flex items-center justify-between">
        <h3 class="text-[13px] font-semibold">{{ isEdit ? '编辑服务配置' : '添加新服务' }}</h3>
        <button
          class="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover cursor-pointer"
          @click="$emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-5 space-y-5 text-[12px]">
        <!-- Basic info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-ink-secondary mb-1.5">服务名称 *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如: Image Gateway"
              class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary transition"
              @input="onNameInput"
            />
          </div>
          <div>
            <label class="block text-ink-secondary mb-1.5">唯一标识 (ID) *</label>
            <input
              v-model="form.id"
              type="text"
              :disabled="isEdit"
              placeholder="例如: image-gateway"
              class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary disabled:opacity-50 font-mono"
            />
          </div>
        </div>

        <div>
          <label class="block text-ink-secondary mb-1.5">服务简介</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="简要说明此服务的作用"
            class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary"
          />
        </div>

        <!-- Runtime & CWD -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-ink-secondary mb-1.5">运行时类型 *</label>
            <select
              v-model="form.type"
              class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary"
            >
              <option value="go">Go</option>
              <option value="node">Node.js</option>
              <option value="python">Python</option>
              <option value="binary">二进制</option>
              <option value="custom">通用命令</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-ink-secondary mb-1.5">工作目录 (CWD) *</label>
            <div class="flex gap-2">
              <input
                v-model="form.cwd"
                type="text"
                placeholder="/path/to/project"
                class="flex-1 bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary font-mono"
              />
              <button
                type="button"
                class="px-3 py-2 rounded-md border border-line hover:border-line-strong bg-surface text-ink font-medium cursor-pointer"
                @click="browseDirectory"
              >
                浏览
              </button>
            </div>
          </div>
        </div>

        <!-- Command -->
        <div>
          <label class="block text-ink-secondary mb-1.5">启动命令 *</label>
          <input
            v-model="form.command"
            type="text"
            placeholder="例如: go run ./cmd/server"
            class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary font-mono"
          />
        </div>

        <!-- Port & Web URL -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-ink-secondary">监听端口</label>
              <button
                v-if="form.port"
                type="button"
                class="text-[11px] text-vercel-blue hover:underline cursor-pointer"
                @click="checkPortOccupied"
              >
                {{ portStatusText || '探测' }}
              </button>
            </div>
            <input
              v-model.number="form.port"
              type="number"
              placeholder="8080"
              class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary font-mono"
            />
          </div>
          <div class="col-span-2">
            <label class="block text-ink-secondary mb-1.5">Web 管理界面 URL</label>
            <input
              v-model="form.webUrl"
              type="text"
              placeholder="http://127.0.0.1:8080"
              class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink outline-none focus:border-ink-tertiary font-mono"
            />
          </div>
        </div>

        <!-- Health Check -->
        <div class="bg-canvas rounded-lg border border-line p-3.5 space-y-3">
          <span class="font-medium text-ink">健康检查探针</span>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-ink-tertiary mb-1">类型</label>
              <select
                v-model="healthCheckType"
                class="w-full bg-surface border border-line rounded-md px-2.5 py-1.5 text-[12px] text-ink outline-none"
              >
                <option value="none">无</option>
                <option value="tcp">TCP</option>
                <option value="http">HTTP</option>
              </select>
            </div>
            <div v-if="healthCheckType === 'http'" class="col-span-2">
              <label class="block text-ink-tertiary mb-1">探针地址</label>
              <input
                v-model="healthCheckEndpoint"
                type="text"
                placeholder="http://127.0.0.1:8080/health"
                class="w-full bg-surface border border-line rounded-md px-2.5 py-1.5 text-[12px] text-ink outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <!-- Credentials -->
        <div class="bg-canvas rounded-lg border border-line p-3.5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <KeyRound class="w-3.5 h-3.5 text-ink-tertiary" />
              <span class="font-medium text-ink">账号与密钥（自动加密）</span>
            </div>
            <button
              type="button"
              class="text-[12px] text-vercel-blue flex items-center gap-1 cursor-pointer"
              @click="addCredential"
            >
              <Plus class="w-3.5 h-3.5" /> 添加
            </button>
          </div>

          <p v-if="credentials.length === 0" class="text-ink-tertiary text-[12px] py-2 text-center">
            暂无记录
          </p>

          <div
            v-for="(cred, idx) in credentials"
            :key="idx"
            class="bg-surface border border-line rounded-md p-2.5 space-y-2 relative"
          >
            <button
              type="button"
              class="absolute top-2 right-2 text-ink-tertiary hover:text-vercel-red cursor-pointer"
              @click="removeCredential(idx)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="cred.label"
                type="text"
                placeholder="用途（如：管理员）"
                class="bg-surface border border-line rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-ink-tertiary"
              />
              <input
                v-model="cred.note"
                type="text"
                placeholder="备注"
                class="bg-surface border border-line rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-ink-tertiary"
              />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <input
                v-model="cred.username"
                type="text"
                placeholder="用户名"
                class="bg-surface border border-line rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-ink-tertiary font-mono"
              />
              <input
                v-model="cred.password"
                type="text"
                placeholder="密码"
                class="bg-surface border border-line rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-ink-tertiary font-mono"
              />
              <input
                v-model="cred.apiKey"
                type="text"
                placeholder="API Key"
                class="bg-surface border border-line rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-ink-tertiary font-mono"
              />
            </div>
          </div>
        </div>

        <!-- Auto start -->
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input v-model="form.autoStart" type="checkbox" class="accent-black" />
          <span class="text-ink">客户端启动时自动拉起</span>
        </label>
      </div>

      <!-- Footer -->
      <div class="h-14 px-5 border-t border-line flex items-center justify-between">
        <button
          v-if="isEdit"
          type="button"
          class="text-[12px] text-vercel-red hover:underline flex items-center gap-1 cursor-pointer"
          @click="onDelete"
        >
          <Trash2 class="w-3.5 h-3.5" /> 删除服务
        </button>
        <div v-else></div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-4 py-1.5 rounded-md border border-line text-ink-secondary hover:text-ink hover:border-line-strong font-medium cursor-pointer"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded-md bg-ink hover:bg-neutral-800 text-surface font-medium cursor-pointer"
            @click="onSave"
          >
            保存
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

const props = defineProps<{ initialData?: ServiceConfig | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const store = useServiceStore()
const isEdit = !!props.initialData

const form = reactive<ServiceConfig>(
  props.initialData
    ? { ...JSON.parse(JSON.stringify(props.initialData)) }
    : {
        id: '',
        name: '',
        description: '',
        type: 'custom',
        cwd: '',
        command: '',
        port: undefined,
        webUrl: '',
        healthCheck: { type: 'none' },
        credentials: [],
        autoStart: false
      }
)

const healthCheckType = ref<'http' | 'tcp' | 'none'>(props.initialData?.healthCheck?.type || 'none')
const healthCheckEndpoint = ref(props.initialData?.healthCheck?.endpoint || '')
const credentials = ref<ServiceCredential[]>(form.credentials)
const portStatusText = ref('')
let slugTouched = !!form.id

function onNameInput(): void {
  if (isEdit || slugTouched) return
  form.id = form.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function browseDirectory(): Promise<void> {
  const dir = await window.api.selectDirectory()
  if (dir) form.cwd = dir
}

async function checkPortOccupied(): Promise<void> {
  if (!form.port) return
  portStatusText.value = '探测中'
  const occupied = await window.api.checkPort(form.port)
  portStatusText.value = occupied ? `占用 (${occupied})` : '空闲 ✓'
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
    alert('请填写完整必填项')
    return
  }
  form.healthCheck = {
    type: healthCheckType.value,
    endpoint: healthCheckType.value === 'http' ? healthCheckEndpoint.value : undefined
  }
  form.credentials = credentials.value
  // Strip Vue reactive Proxy for IPC structured clone.
  const payload = JSON.parse(JSON.stringify(form)) as ServiceConfig
  await store.saveService(payload)
  emit('saved')
  emit('close')
}

async function onDelete(): Promise<void> {
  if (confirm(`确定删除「${form.name}」？`)) {
    await store.deleteService(form.id)
    emit('close')
  }
}
</script>
