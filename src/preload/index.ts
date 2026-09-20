import { contextBridge, ipcRenderer } from 'electron'
import { ServiceConfig, WebViewBounds, ServiceItem, ServiceRuntime } from '../main/types'

const api = {
  listServices: (): Promise<ServiceItem[]> => ipcRenderer.invoke('services:list'),
  saveService: (config: ServiceConfig): Promise<ServiceItem> => ipcRenderer.invoke('services:save', config),
  deleteService: (id: string): Promise<boolean> => ipcRenderer.invoke('services:delete', id),
  startService: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('services:start', id),
  stopService: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('services:stop', id),
  restartService: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('services:restart', id),
  startAll: (): Promise<void> => ipcRenderer.invoke('services:startAll'),
  stopAll: (): Promise<void> => ipcRenderer.invoke('services:stopAll'),
  getLogs: (id: string): Promise<string[]> => ipcRenderer.invoke('services:getLogs', id),
  clearLogs: (id: string): Promise<void> => ipcRenderer.invoke('services:clearLogs', id),
  checkPort: (port: number): Promise<{ inUse: boolean; pid?: number }> =>
    ipcRenderer.invoke('services:checkPort', port),
  killPort: (port: number): Promise<boolean> => ipcRenderer.invoke('services:killPort', port),
  openFolder: (path: string): Promise<void> => ipcRenderer.invoke('services:openFolder', path),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('services:openExternal', url),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory'),
  detectFolder: (path: string): Promise<Partial<ServiceConfig> | null> =>
    ipcRenderer.invoke('services:detectFolder', path),

  // Webview
  showWebView: (id: string, url: string, bounds: WebViewBounds): Promise<void> =>
    ipcRenderer.invoke('webview:show', id, url, bounds),
  hideWebView: (): Promise<void> => ipcRenderer.invoke('webview:hide'),
  updateWebViewBounds: (bounds: WebViewBounds): Promise<void> =>
    ipcRenderer.invoke('webview:updateBounds', bounds),
  reloadWebView: (): Promise<void> => ipcRenderer.invoke('webview:reload'),
  goBackWebView: (): Promise<void> => ipcRenderer.invoke('webview:goBack'),
  goForwardWebView: (): Promise<void> => ipcRenderer.invoke('webview:goForward'),

  // Updater
  checkForUpdates: (): Promise<any> => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('updater:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  getUpdateStatus: (): Promise<any> => ipcRenderer.invoke('updater:getStatus'),
  onUpdateStatus: (callback: (status: any) => void) => {
    const handler = (_: any, status: any) => callback(status)
    ipcRenderer.on('updater:status-changed', handler)
    return () => {
      ipcRenderer.removeListener('updater:status-changed', handler)
    }
  },

  // Listeners
  onLog: (callback: (data: { serviceId: string; text: string }) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('services:log-appended', handler)
    return () => {
      ipcRenderer.removeListener('services:log-appended', handler)
    }
  },
  onStatus: (callback: (data: { serviceId: string; runtime: ServiceRuntime }) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('services:status-changed', handler)
    return () => {
      ipcRenderer.removeListener('services:status-changed', handler)
    }
  },
  onWindowResized: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('window:resized', handler)
    return () => {
      ipcRenderer.removeListener('window:resized', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
