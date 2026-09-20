import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ServiceConfig, ServiceItem, ServiceRuntime } from '../../../../src/main/types'

export const useServiceStore = defineStore('service', () => {
  const services = ref<ServiceItem[]>([])
  const activeServiceId = ref<string | null>(null)
  const activeTab = ref<'console' | 'web' | 'settings'>('console')
  const logs = ref<Record<string, string[]>>({})
  const loading = ref(false)

  const activeService = computed(() => {
    return services.value.find((s) => s.id === activeServiceId.value) || null
  })

  async function loadServices(): Promise<void> {
    loading.value = true
    try {
      services.value = await window.api.listServices()
      if (services.value.length > 0 && !activeServiceId.value) {
        activeServiceId.value = services.value[0].id
      }
      // Load logs for all services
      for (const s of services.value) {
        if (!logs.value[s.id]) {
          const l = await window.api.getLogs(s.id)
          logs.value[s.id] = l
        }
      }
    } finally {
      loading.value = false
    }
  }

  function selectService(id: string): void {
    activeServiceId.value = id
  }

  function setActiveTab(tab: 'console' | 'web' | 'settings'): void {
    activeTab.value = tab
  }

  async function startService(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await window.api.startService(id)
    return res
  }

  async function stopService(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await window.api.stopService(id)
    return res
  }

  async function restartService(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await window.api.restartService(id)
    return res
  }

  async function startAll(): Promise<void> {
    await window.api.startAll()
  }

  async function stopAll(): Promise<void> {
    await window.api.stopAll()
  }

  async function saveService(config: ServiceConfig): Promise<ServiceItem> {
    const saved = await window.api.saveService(config)
    const idx = services.value.findIndex((s) => s.id === saved.id)
    if (idx >= 0) {
      services.value[idx] = saved
    } else {
      services.value.push(saved)
    }
    if (!activeServiceId.value) {
      activeServiceId.value = saved.id
    }
    return saved
  }

  async function deleteService(id: string): Promise<boolean> {
    const ok = await window.api.deleteService(id)
    if (ok) {
      services.value = services.value.filter((s) => s.id !== id)
      delete logs.value[id]
      if (activeServiceId.value === id) {
        activeServiceId.value = services.value[0]?.id || null
      }
    }
    return ok
  }

  function appendLog(id: string, text: string): void {
    if (!logs.value[id]) {
      logs.value[id] = []
    }
    if (logs.value[id].length > 2000) {
      logs.value[id].splice(0, logs.value[id].length - 1500)
    }
    logs.value[id].push(text)
  }

  async function clearLogs(id: string): Promise<void> {
    await window.api.clearLogs(id)
    logs.value[id] = []
  }

  function updateStatus(id: string, runtime: ServiceRuntime): void {
    const s = services.value.find((item) => item.id === id)
    if (s) {
      s.runtime = runtime
    }
  }

  async function killPort(port: number): Promise<boolean> {
    return window.api.killPort(port)
  }

  async function openFolder(path: string): Promise<void> {
    return window.api.openFolder(path)
  }

  async function openExternal(url: string): Promise<void> {
    return window.api.openExternal(url)
  }

  return {
    services,
    activeServiceId,
    activeService,
    activeTab,
    logs,
    loading,
    loadServices,
    selectService,
    setActiveTab,
    startService,
    stopService,
    restartService,
    startAll,
    stopAll,
    saveService,
    deleteService,
    appendLog,
    clearLogs,
    updateStatus,
    killPort,
    openFolder,
    openExternal
  }
})
