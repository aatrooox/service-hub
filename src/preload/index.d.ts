import { ServiceConfig, WebViewBounds, ServiceItem, ServiceRuntime } from '../main/types'

export interface IElectronAPI {
  listServices: () => Promise<ServiceItem[]>
  saveService: (config: ServiceConfig) => Promise<ServiceItem>
  deleteService: (id: string) => Promise<boolean>
  startService: (id: string) => Promise<{ success: boolean; error?: string }>
  stopService: (id: string) => Promise<{ success: boolean; error?: string }>
  restartService: (id: string) => Promise<{ success: boolean; error?: string }>
  startAll: () => Promise<void>
  stopAll: () => Promise<void>
  getLogs: (id: string) => Promise<string[]>
  clearLogs: (id: string) => Promise<void>
  checkPort: (port: number) => Promise<{ inUse: boolean; pid?: number }>
  killPort: (port: number) => Promise<boolean>
  openFolder: (path: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  selectDirectory: () => Promise<string | null>
  detectFolder: (path: string) => Promise<Partial<ServiceConfig> | null>

  showWebView: (id: string, url: string, bounds: WebViewBounds) => Promise<void>
  hideWebView: () => Promise<void>
  updateWebViewBounds: (bounds: WebViewBounds) => Promise<void>
  reloadWebView: () => Promise<void>
  goBackWebView: () => Promise<void>
  goForwardWebView: () => Promise<void>

  // Updater
  checkForUpdates: () => Promise<any>
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => Promise<void>
  getUpdateStatus: () => Promise<any>
  onUpdateStatus: (callback: (status: any) => void) => () => void

  onLog: (callback: (data: { serviceId: string; text: string }) => void) => () => void
  onStatus: (callback: (data: { serviceId: string; runtime: ServiceRuntime }) => void) => () => void
  onPortDetected: (callback: (data: { serviceId: string }) => void) => () => void
  onWindowResized: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
