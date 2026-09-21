<template>
  <div class="h-screen w-screen flex bg-canvas text-ink overflow-hidden font-sans">
    <!-- Left Sidebar -->
    <Sidebar
      @open-add="openAddModal"
      @open-import="showImportModal = true"
    />

    <!-- Main Workspace -->
    <main class="flex-1 flex flex-col min-w-0 bg-canvas">
      <!-- Top Service Header & Actions Bar -->
      <header class="h-14 border-b border-line bg-surface flex items-center justify-between px-5 titlebar-drag">
        <!-- Service Info -->
        <div v-if="serviceStore.activeService" class="flex items-center gap-3 min-w-0 titlebar-no-drag">
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="getLampClass(serviceStore.activeService.runtime?.status)"
          ></span>
          <div class="flex flex-col">
            <div class="flex items-center gap-2.5">
              <h2 class="text-[13px] font-semibold text-ink truncate tracking-tight">
                {{ serviceStore.activeService.name }}
              </h2>
              <span class="text-[10px] font-mono px-1.5 py-[1px] border rounded text-ink-tertiary border-line">
                {{ getStatusLabel(serviceStore.activeService.runtime?.status) }}
              </span>
              <span v-if="serviceStore.activeService.port" class="text-[11px] text-ink-tertiary font-mono">
                :{{ serviceStore.activeService.port }}
              </span>
              <span v-if="serviceStore.activeService.runtime?.pid" class="text-[10px] text-ink-tertiary font-mono">
                {{ serviceStore.activeService.runtime.pid }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-[12px] text-ink-tertiary titlebar-no-drag">
          No service selected
        </div>

        <!-- Action Buttons & Tabs -->
        <div v-if="serviceStore.activeService" class="flex items-center gap-1.5 titlebar-no-drag">
          <!-- Start (Vercel solid black) / Stop -->
          <button
            v-if="serviceStore.activeService.runtime?.status !== 'RUNNING' && serviceStore.activeService.runtime?.status !== 'STARTING'"
            class="px-3 py-1.5 rounded-md bg-ink hover:bg-neutral-800 text-surface text-[12px] font-medium flex items-center gap-1.5 transition active:scale-[.98] cursor-pointer"
            @click="handleStart"
          >
            <Play class="w-3 h-3 fill-current" />
            启动
          </button>
          <button
            v-else
            class="px-3 py-1.5 rounded-md border border-line hover:border-line-strong hover:bg-surface-hover text-ink text-[12px] font-medium flex items-center gap-1.5 transition active:scale-[.98] cursor-pointer"
            @click="handleStop"
          >
            <Square class="w-3 h-3 fill-current" />
            停止
          </button>

          <button
            class="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition cursor-pointer"
            title="重启服务"
            @click="handleRestart"
          >
            <RotateCcw class="w-4 h-4" />
          </button>

          <button
            class="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition cursor-pointer"
            title="打开所在目录"
            @click="serviceStore.openFolder(serviceStore.activeService.cwd)"
          >
            <Folder class="w-4 h-4" />
          </button>

          <button
            class="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition cursor-pointer"
            title="编辑服务配置"
            @click="openEditModal"
          >
            <Settings class="w-4 h-4" />
          </button>

          <div class="h-4 w-px bg-line mx-1"></div>

          <!-- Tab Switcher -->
          <div class="flex items-center gap-0.5 text-[12px]">
            <button
              class="px-2.5 py-1.5 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer"
              :class="activeTab === 'console' ? 'bg-canvas text-ink' : 'text-ink-tertiary hover:text-ink hover:bg-surface-hover'"
              @click="switchTab('console')"
            >
              <Terminal class="w-3.5 h-3.5" />
              控制台
            </button>
            <button
              v-if="serviceStore.activeService.webUrl"
              class="px-2.5 py-1.5 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer"
              :class="activeTab === 'web' ? 'bg-canvas text-ink' : 'text-ink-tertiary hover:text-ink hover:bg-surface-hover'"
              @click="switchTab('web')"
            >
              <Globe class="w-3.5 h-3.5" />
              Web
            </button>
          </div>

          <!-- Credential vault toggle -->
          <button
            class="px-2.5 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 border transition cursor-pointer"
            :class="showCredentialDrawer ? 'border-line-strong bg-canvas text-ink' : 'border-line text-ink-tertiary hover:text-ink hover:border-line-strong'"
            title="查看服务账号与密钥"
            @click="showCredentialDrawer = !showCredentialDrawer"
          >
            <KeyRound class="w-3.5 h-3.5" />
            <span>凭据</span>
          </button>
        </div>
      </header>

      <!-- Auto Update Notification Banner -->
      <UpdateNotification />

      <!-- Content Area -->
      <div class="flex-1 relative overflow-hidden flex">
        <div class="flex-1 flex flex-col min-w-0 h-full">
          <!-- Terminal Console -->
          <div v-show="activeTab === 'console'" class="h-full w-full">
            <TerminalView
              v-if="serviceStore.activeService"
              :service-id="serviceStore.activeService.id"
            />
            <div v-else class="h-full flex flex-col items-center justify-center text-ink-tertiary text-[12px] gap-3">
              <Box class="w-7 h-7 opacity-30" />
              请在左侧选择或添加一个服务
            </div>
          </div>

          <!-- Embedded Web View -->
          <div v-show="activeTab === 'web'" class="h-full w-full flex flex-col">
            <div class="h-9 px-4 border-b border-line bg-surface flex items-center justify-between text-[11px] text-ink-tertiary">
              <div class="flex items-center gap-1.5">
                <button class="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover cursor-pointer" title="后退" @click="goBack">
                  <ChevronLeft class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover cursor-pointer" title="前进" @click="goForward">
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover cursor-pointer" title="刷新" @click="reload">
                  <RotateCw class="w-3.5 h-3.5" />
                </button>
                <span class="font-mono text-[10px] text-ink bg-canvas px-2 py-0.5 rounded border border-line ml-1">
                  {{ serviceStore.activeService?.webUrl }}
                </span>
              </div>
              <button
                class="flex items-center gap-1 px-2 py-1 text-ink-tertiary hover:text-ink transition text-[11px] cursor-pointer"
                title="在浏览器中打开"
                @click="openInBrowser"
              >
                <ExternalLink class="w-3.5 h-3.5" />
                <span>外部打开</span>
              </button>
            </div>

            <div ref="webSlotRef" class="flex-1 w-full h-full bg-white"></div>
          </div>
        </div>

        <!-- Credential Drawer -->
        <aside
          v-if="showCredentialDrawer && serviceStore.activeService"
          class="w-80 h-full border-l border-line bg-surface shrink-0 flex flex-col z-20"
        >
          <CredentialDrawer
            :credentials="serviceStore.activeService.credentials || []"
            @close="showCredentialDrawer = false"
          />
        </aside>
      </div>
    </main>

    <!-- Modals -->
    <ServiceEditModal
      v-if="showEditModal"
      :initial-data="editingService"
      @close="showEditModal = false"
    />

    <ImportModal
      v-if="showImportModal"
      @close="showImportModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import {
  Play,
  Square,
  RotateCcw,
  RotateCw,
  Folder,
  Settings,
  Terminal,
  Globe,
  KeyRound,
  Box,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import Sidebar from './components/Sidebar.vue'
import TerminalView from './components/TerminalView.vue'
import CredentialDrawer from './components/CredentialDrawer.vue'
import ServiceEditModal from './components/ServiceEditModal.vue'
import ImportModal from './components/ImportModal.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import { useServiceStore } from './stores/serviceStore'
import { ServiceConfig, ServiceStatus } from '../../../src/main/types'

const serviceStore = useServiceStore()
const activeTab = ref<'console' | 'web'>('console')
const showCredentialDrawer = ref(false)
const showEditModal = ref(false)
const showImportModal = ref(false)
const editingService = ref<ServiceConfig | null>(null)
const webSlotRef = ref<HTMLDivElement | null>(null)

function getStatusLabel(status?: ServiceStatus): string {
  switch (status) {
    case 'RUNNING': return 'Running'
    case 'STARTING': return 'Starting'
    case 'CRASHED': return 'Error'
    default: return 'Stopped'
  }
}

function getLampClass(status?: ServiceStatus): string {
  switch (status) {
    case 'RUNNING': return 'bg-vercel-green'
    case 'STARTING': return 'bg-vercel-amber animate-pulse'
    case 'CRASHED': return 'bg-vercel-red'
    default: return 'bg-ink-tertiary'
  }
}

async function handleStart(): Promise<void> {
  if (!serviceStore.activeService) return
  const service = serviceStore.activeService
  const res = await serviceStore.startService(service.id)
  if (res.success) {
    if (service.webUrl) {
      setTimeout(() => switchTab('web'), 600)
    }
  } else if (res.error) {
    alert(`启动失败: ${res.error}`)
  }
}

async function handleStop(): Promise<void> {
  if (!serviceStore.activeService) return
  await serviceStore.stopService(serviceStore.activeService.id)
  switchTab('console')
}

async function handleRestart(): Promise<void> {
  if (!serviceStore.activeService) return
  const service = serviceStore.activeService
  const res = await serviceStore.restartService(service.id)
  if (res.success && service.webUrl) {
    setTimeout(() => switchTab('web'), 800)
  } else if (res.error) {
    alert(`重启失败: ${res.error}`)
  }
}

function openAddModal(): void {
  editingService.value = null
  showEditModal.value = true
}

function openEditModal(): void {
  editingService.value = serviceStore.activeService
  showEditModal.value = true
}

function switchTab(tab: 'console' | 'web'): void {
  activeTab.value = tab
  if (tab === 'web') {
    if (!showEditModal.value && !showImportModal.value) {
      nextTick(() => attachWebView())
    }
  } else {
    window.api.hideWebView()
  }
}

function attachWebView(): void {
  if (showEditModal.value || showImportModal.value) return
  if (!webSlotRef.value || !serviceStore.activeService || !serviceStore.activeService.webUrl) return
  const rect = webSlotRef.value.getBoundingClientRect()
  window.api.showWebView(
    serviceStore.activeService.id,
    serviceStore.activeService.webUrl,
    { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
  )
}

function updateWebViewPosition(): void {
  if (showEditModal.value || showImportModal.value) return
  if (activeTab.value === 'web' && webSlotRef.value) {
    const rect = webSlotRef.value.getBoundingClientRect()
    window.api.updateWebViewBounds({
      x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)
    })
  }
}

function reload(): void { window.api.reloadWebView() }
function goBack(): void { window.api.goBackWebView() }
function goForward(): void { window.api.goForwardWebView() }
function openInBrowser(): void {
  if (serviceStore.activeService?.webUrl) serviceStore.openExternal(serviceStore.activeService.webUrl)
}

function updateDefaultTab(): void {
  const current = serviceStore.activeService
  if (!current) return
  if (current.webUrl && current.runtime?.status === 'RUNNING') switchTab('web')
  else switchTab('console')
}

watch(() => serviceStore.activeServiceId, () => updateDefaultTab())

watch([showEditModal, showImportModal], ([editOpen, importOpen]) => {
  if (editOpen || importOpen) {
    window.api.hideWebView()
  } else if (activeTab.value === 'web') {
    nextTick(() => attachWebView())
  }
})

watch(showCredentialDrawer, () => nextTick(() => updateWebViewPosition()))

const stopResize = window.api.onWindowResized(() => updateWebViewPosition())

const stopStatus = window.api.onStatus((data) => {
  const prevStatus = serviceStore.activeService?.runtime?.status
  serviceStore.updateStatus(data.serviceId, data.runtime)
  if (
    data.serviceId === serviceStore.activeServiceId &&
    prevStatus !== 'RUNNING' &&
    data.runtime.status === 'RUNNING' &&
    serviceStore.activeService?.webUrl
  ) {
    switchTab('web')
  }
})

const stopPort = window.api.onPortDetected(async (data) => {
  // Pull the updated config (now with port/webUrl) back into the store.
  const all = await window.api.listServices()
  const updated = all.find((s) => s.id === data.serviceId)
  if (!updated) return
  const idx = serviceStore.services.findIndex((s) => s.id === data.serviceId)
  if (idx >= 0) serviceStore.services[idx] = updated
  else serviceStore.services.push(updated)
  if (data.serviceId === serviceStore.activeServiceId) {
    switchTab('web')
  }
})

onMounted(async () => {
  await serviceStore.loadServices()
  updateDefaultTab()
})

onBeforeUnmount(() => {
  stopResize()
  stopStatus()
  stopPort()
  window.api.hideWebView()
})
</script>
