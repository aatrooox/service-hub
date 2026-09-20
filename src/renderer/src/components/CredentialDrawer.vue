<template>
  <div class="h-full w-full bg-white dark:bg-zinc-900 p-4 text-slate-800 dark:text-zinc-100 flex flex-col gap-3 transition-colors select-none">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
      <div class="flex items-center gap-2">
        <KeyRound class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span class="font-bold text-sm text-slate-900 dark:text-zinc-100">服务凭据与密钥</span>
      </div>
      <button
        class="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
        @click="$emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Credential list -->
    <div class="flex-1 space-y-2.5 overflow-y-auto pr-1">
      <div v-if="credentials.length === 0" class="text-center py-10 text-xs text-slate-400 dark:text-zinc-500">
        该服务尚未记录账号或密钥，请在服务配置中添加
      </div>

      <div
        v-for="(cred, idx) in credentials"
        :key="cred.id || idx"
        class="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 text-xs"
      >
        <div class="flex items-center justify-between">
          <span class="font-bold text-emerald-700 dark:text-emerald-400 text-[13px]">{{ cred.label || '默认凭证' }}</span>
          <span v-if="cred.note" class="text-[10px] text-slate-500 dark:text-zinc-500 truncate max-w-[120px]" :title="cred.note">
            {{ cred.note }}
          </span>
        </div>

        <!-- Username field -->
        <div v-if="cred.username" class="flex items-center justify-between bg-white dark:bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <span class="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">账号:</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-slate-900 dark:text-zinc-200 select-text">{{ cred.username }}</span>
            <button
              class="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="复制账号"
              @click="copyText(cred.username, `user-${idx}`)"
            >
              <Check v-if="copiedId === `user-${idx}`" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Password field -->
        <div v-if="cred.password" class="flex items-center justify-between bg-white dark:bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <span class="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">密码:</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-slate-900 dark:text-zinc-200 select-text">
              {{ showPass[idx] ? cred.password : '••••••••' }}
            </span>
            <button
              class="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
              :title="showPass[idx] ? '隐藏密码' : '显示密码'"
              @click="showPass[idx] = !showPass[idx]"
            >
              <EyeOff v-if="showPass[idx]" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </button>
            <button
              class="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="复制密码"
              @click="copyText(cred.password, `pass-${idx}`)"
            >
              <Check v-if="copiedId === `pass-${idx}`" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- API Key field -->
        <div v-if="cred.apiKey" class="flex items-center justify-between bg-white dark:bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <span class="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">Key:</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-slate-900 dark:text-zinc-200 select-text truncate max-w-[120px]">
              {{ showPass[`key-${idx}`] ? cred.apiKey : maskKey(cred.apiKey) }}
            </span>
            <button
              class="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
              :title="showPass[`key-${idx}`] ? '隐藏 Key' : '显示 Key'"
              @click="showPass[`key-${idx}`] = !showPass[`key-${idx}`]"
            >
              <EyeOff v-if="showPass[`key-${idx}`]" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </button>
            <button
              class="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="复制 API Key"
              @click="copyText(cred.apiKey, `key-${idx}`)"
            >
              <Check v-if="copiedId === `key-${idx}`" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer tip -->
    <div class="text-[11px] text-slate-400 dark:text-zinc-500 text-center border-t border-slate-200 dark:border-zinc-800/60 pt-2">
      本地 AES-256-GCM 加密存储 · 点击一键复制
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { KeyRound, X, Copy, Check, Eye, EyeOff } from 'lucide-vue-next'
import { ServiceCredential } from '../../../../src/main/types'

defineProps<{
  credentials: ServiceCredential[]
}>()

defineEmits<{
  (e: 'close'): void
}>()

const copiedId = ref<string | null>(null)
const showPass = reactive<Record<string | number, boolean>>({})

function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 10) return '••••••••'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

function copyText(text: string, id: string): void {
  navigator.clipboard.writeText(text)
  copiedId.value = id
  setTimeout(() => {
    if (copiedId.value === id) {
      copiedId.value = null
    }
  }, 1500)
}
</script>
