<template>
  <div class="h-screen w-screen flex bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-200">
    <!-- Left Sidebar -->
    <Sidebar
      @open-add="openAddModal"
      @open-import="showImportModal = true"
    />

    <!-- Main Workspace -->
    <main class="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-zinc-950">
      <!-- Top Service Header & Actions Bar -->
      <header class="h-14 border-b border-slate-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/60 flex items-center justify-between px-5 titlebar-drag transition-colors">
        <!-- Service Info -->
        <div v-if="serviceStore.activeService" class="flex items-center gap-3 min-w-0 titlebar-no-drag">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                {{ serviceStore.activeService.name }}
              </h2>
              <span
                class="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border"
                :class="getStatusBadgeClass(serviceStore.activeService.runtime?.status)"
              >
                {{ getStatusLabel(serviceStore.activeService.runtime?.status) }}
              </span>
              <span v-if="serviceStore.activeService.port" class="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                :{{ serviceStore.activeService.port }}
              </span>
              <span v-if="serviceStore.activeService.runtime?.pid" class="text-xs text-slate-400 dark:text-zinc-500 font-mono">
                (pid: {{ serviceStore.activeService.runtime.pid }})
              </span>
            </div>
            <span v-if="serviceStore.activeService.description" class="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-md">
              {{ serviceStore.activeService.description }}
            </span>
          </div>
        </div>
        <div v-else class="text-xs text-slate-400 dark:text-zinc-500 titlebar-no-drag">
          未选择服务
        </div>

        <!-- Action Buttons & Tabs -->
        <div v-if="serviceStore.activeService" class="flex items-center gap-2 titlebar-no-drag">
          <!-- Start / Stop / Restart -->
          <button
            v-if="serviceStore.activeService.runtime?.status !== 'RUNNING' && serviceStore.activeService.runtime?.status !== 'STARTING'"
            class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            @click="handleStart"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
            启动
          </button>
          <button
            v-else
            class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            @click="handleStop"
          >
            <Square class="w-3.5 h-3.5 fill-current" />
            停止
          </button>

          <button
            class="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs transition border border-slate-200 dark:border-transparent cursor-pointer"
            title="重启服务"
            @click="handleRestart"
          >
            <RotateCcw class="w-4 h-4" />
          </button>

          <button
            class="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs transition border border-slate-200 dark:border-transparent cursor-pointer"
            title="打开所在目录"
            @click="serviceStore.openFolder(serviceStore.activeService.cwd)"
          >
            <Folder class="w-4 h-4" />
          </button>

          <button
            class="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs transition border border-slate-200 dark:border-transparent cursor-pointer"
            title="编辑服务配置"
            @click="openEditModal"
          >
            <Settings class="w-4 h-4" />
          </button>

          <div class="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>

          <!-- Tab Switcher -->
          <div class="bg-slate-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center text-xs">
            <button
              class="px-3 py-1 rounded-md transition font-semibold flex items-center gap-1.5 cursor-pointer"
              :class="activeTab === 'console' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
              @click="switchTab('console')"
            >
              <Terminal class="w-3.5 h-3.5" />
              终端控制台
            </button>
            <button
              v-if="serviceStore.activeService.webUrl"
              class="px-3 py-1 rounded-md transition font-semibold flex items-center gap-1.5 cursor-pointer"
              :class="activeTab === 'web' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
              @click="switchTab('web')"
            >
              <Globe class="w-3.5 h-3.5" />
              Web 界面
            </button>
          </div>

          <!-- Credential vault toggle button -->
          <button
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer"
            :class="showCredentialDrawer ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'"
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
        <!-- Main Slot (Console or Web) -->
        <div class="flex-1 flex flex-col min-w-0 h-full">
          <!-- Tab 1: Terminal Console -->
          <div v-show="activeTab === 'console'" class="h-full w-full">
            <TerminalView
              v-if="serviceStore.activeService"
              :service-id="serviceStore.activeService.id"
            />
            <div v-else class="h-full flex items-center justify-center text-slate-400 dark:text-zinc-500 text-xs">
              请在左侧选择或添加一个服务
            </div>
          </div>

          <!-- Tab 2: Embedded Web View slot -->
          <div v-show="activeTab === 'web'" class="h-full w-full flex flex-col">
            <!-- Web Navigation Bar -->
            <div class="h-9 px-4 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-100/90 dark:bg-zinc-900/60 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 transition-colors">
              <div class="flex items-center gap-2">
                <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer" title="后退" @click="goBack">
                  <ChevronLeft class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer" title="前进" @click="goForward">
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer" title="刷新页面" @click="reload">
                  <RotateCw class="w-3.5 h-3.5" />
                </button>
                <span class="font-mono text-[11px] text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 px-2.5 py-0.5 rounded border border-slate-300 dark:border-zinc-800">
                  {{ serviceStore.activeService?.webUrl }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition text-[11px] font-medium cursor-pointer"
                  title="在系统默认浏览器中打开"
                  @click="openInBrowser"
                >
                  <ExternalLink class="w-3.5 h-3.5" />
                  <span>外部打开</span>
                </button>
              </div>
            </div>

            <!-- Native WebContentsView bounds target element -->
            <div ref="webSlotRef" class="flex-1 w-full h-full bg-white dark:bg-zinc-950"></div>
          </div>
        </div>

        <!-- Right Docked Credential Drawer (Side-by-side with web view) -->
        <aside
          v-if="showCredentialDrawer && serviceStore.activeService"
          class="w-80 h-full border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex flex-col z-20 transition-all"
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
    case 'RUNNING': return '运行中'
    case 'STARTING': return '正在启动'
    case 'CRASHED': return '启动失败'
    default: return '已停止'
  }
}

function getStatusBadgeClass(status?: ServiceStatus): string {
  switch (status) {
    case 'RUNNING':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
    case 'STARTING':
      return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
    case 'CRASHED':
      return 'bg-red-50 text-red-700 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-transparent'
  }
}

async function handleStart(): Promise<void> {
  if (!serviceStore.activeService) return
  const service = serviceStore.activeService
  const res = await serviceStore.startService(service.id)
  if (res.success) {
    if (service.webUrl) {
      setTimeout(() => {
        switchTab('web')
      }, 600)
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
    setTimeout(() => {
      switchTab('web')
    }, 800)
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
    // Only attach if no modals are open
    if (!showEditModal.value && !showImportModal.value) {
      nextTick(() => {
        attachWebView()
      })
    }
  } else {
    window.api.hideWebView()
  }
}

function attachWebView(): void {
  if (showEditModal.value || showImportModal.value) return
  if (!webSlotRef.value || !serviceStore.activeService || !serviceStore.activeService.webUrl) return
  const rect = webSlotRef.value.getBoundingClientRect()
  const bounds = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
  window.api.showWebView(
    serviceStore.activeService.id,
    serviceStore.activeService.webUrl,
    bounds
  )
}

function updateWebViewPosition(): void {
  if (showEditModal.value || showImportModal.value) return
  if (activeTab.value === 'web' && webSlotRef.value) {
    const rect = webSlotRef.value.getBoundingClientRect()
    window.api.updateWebViewBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    })
  }
}

function reload(): void {
  window.api.reloadWebView()
}
function goBack(): void {
  window.api.goBackWebView()
}
function goForward(): void {
  window.api.goForwardWebView()
}
function openInBrowser(): void {
  if (serviceStore.activeService?.webUrl) {
    serviceStore.openExternal(serviceStore.activeService.webUrl)
  }
}

function updateDefaultTab(): void {
  const current = serviceStore.activeService
  if (!current) return
  if (current.webUrl && current.runtime?.status === 'RUNNING') {
    switchTab('web')
  } else {
    switchTab('console')
  }
}

// Watch active service change
watch(
  () => serviceStore.activeServiceId,
  () => {
    updateDefaultTab()
  }
)

// Watch modals opening and closing: HIDE WebContentsView while modal is open, RESTORE when closed!
watch([showEditModal, showImportModal], ([editOpen, importOpen]) => {
  if (editOpen || importOpen) {
    window.api.hideWebView()
  } else {
    if (activeTab.value === 'web') {
      nextTick(() => {
        attachWebView()
      })
    }
  }
})

// Watch credential drawer opening/closing: adjust WebContentsView bounds
watch(showCredentialDrawer, () => {
  nextTick(() => {
    updateWebViewPosition()
  })
})

// Watch window resize
const stopResize = window.api.onWindowResized(() => {
  updateWebViewPosition()
})

// Watch status changes from backend
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

onMounted(async () => {
  await serviceStore.loadServices()
  updateDefaultTab()
})

onBeforeUnmount(() => {
  stopResize()
  stopStatus()
  window.api.hideWebView()
})
</script>
