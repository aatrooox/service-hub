<template>
  <div class="h-full w-full bg-surface p-4 text-ink flex flex-col gap-3 select-none">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-3">
      <div class="flex items-center gap-2">
        <KeyRound class="w-4 h-4 text-ink-tertiary" />
        <span class="font-semibold text-[13px]">凭据与密钥</span>
      </div>
      <button
        class="text-ink-tertiary hover:text-ink p-1 rounded-md hover:bg-surface-hover cursor-pointer"
        @click="$emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Credential list -->
    <div class="flex-1 space-y-2 overflow-y-auto pr-1">
      <div v-if="credentials.length === 0" class="text-center py-10 text-[12px] text-ink-tertiary leading-relaxed">
        尚无账号或密钥<br />请在服务配置中添加
      </div>

      <div
        v-for="(cred, idx) in credentials"
        :key="cred.id || idx"
        class="bg-surface border border-line rounded-lg p-3 space-y-2 text-[11px]"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-ink text-[12px]">{{ cred.label || '默认凭证' }}</span>
          <span v-if="cred.note" class="text-[10px] text-ink-tertiary truncate max-w-[120px]" :title="cred.note">
            {{ cred.note }}
          </span>
        </div>

        <!-- Username -->
        <div v-if="cred.username" class="flex items-center justify-between bg-canvas px-2.5 py-1.5 rounded-md border border-line">
          <span class="text-ink-tertiary font-mono text-[10px]">USER</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-ink select-text">{{ cred.username }}</span>
            <button
              class="text-ink-tertiary hover:text-vercel-blue transition cursor-pointer"
              title="复制账号"
              @click="copyText(cred.username, `user-${idx}`)"
            >
              <Check v-if="copiedId === `user-${idx}`" class="w-3.5 h-3.5 text-vercel-blue" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Password -->
        <div v-if="cred.password" class="flex items-center justify-between bg-canvas px-2.5 py-1.5 rounded-md border border-line">
          <span class="text-ink-tertiary font-mono text-[10px]">PASS</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-ink select-text">
              {{ showPass[idx] ? cred.password : '••••••••' }}
            </span>
            <button
              class="text-ink-tertiary hover:text-ink transition cursor-pointer"
              :title="showPass[idx] ? '隐藏' : '显示'"
              @click="showPass[idx] = !showPass[idx]"
            >
              <EyeOff v-if="showPass[idx]" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </button>
            <button
              class="text-ink-tertiary hover:text-vercel-blue transition cursor-pointer"
              title="复制密码"
              @click="copyText(cred.password, `pass-${idx}`)"
            >
              <Check v-if="copiedId === `pass-${idx}`" class="w-3.5 h-3.5 text-vercel-blue" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- API Key -->
        <div v-if="cred.apiKey" class="flex items-center justify-between bg-canvas px-2.5 py-1.5 rounded-md border border-line">
          <span class="text-ink-tertiary font-mono text-[10px]">KEY</span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-ink select-text truncate max-w-[120px]">
              {{ showPass[`key-${idx}`] ? cred.apiKey : maskKey(cred.apiKey) }}
            </span>
            <button
              class="text-ink-tertiary hover:text-ink transition cursor-pointer"
              :title="showPass[`key-${idx}`] ? '隐藏' : '显示'"
              @click="showPass[`key-${idx}`] = !showPass[`key-${idx}`]"
            >
              <EyeOff v-if="showPass[`key-${idx}`]" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </button>
            <button
              class="text-ink-tertiary hover:text-vercel-blue transition cursor-pointer"
              title="复制 Key"
              @click="copyText(cred.apiKey, `key-${idx}`)"
            >
              <Check v-if="copiedId === `key-${idx}`" class="w-3.5 h-3.5 text-vercel-blue" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-[10px] text-ink-tertiary text-center border-t border-line pt-2">
      AES-256-GCM 本地加密
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { KeyRound, X, Copy, Check, Eye, EyeOff } from 'lucide-vue-next'
import { ServiceCredential } from '../../../../src/main/types'

defineProps<{ credentials: ServiceCredential[] }>()
defineEmits<{ (e: 'close'): void }>()

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
    if (copiedId.value === id) copiedId.value = null
  }, 1500)
}
</script>
