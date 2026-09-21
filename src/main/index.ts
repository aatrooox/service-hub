import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ConfigStore } from './config-store'
import { ProcessManager } from './process-manager'
import { WebViewManager } from './web-view-manager'
import { setupAutoUpdater } from './updater'
import { ServiceConfig, ServiceItem, WebViewBounds } from './types'

let mainWindow: BrowserWindow | null = null
let configStore: ConfigStore
let processManager: ProcessManager
let webViewManager: WebViewManager

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset', // Mac-friendly traffic lights
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load URL
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  webViewManager = new WebViewManager(mainWindow)
  setupAutoUpdater(mainWindow)

  mainWindow.on('resize', () => {
    // Notify renderer to recalculate webview bounds if webview is active
    mainWindow?.webContents.send('window:resized')
  })
}

function setupIPC(): void {
  // 1. List services
  ipcMain.handle('services:list', (): ServiceItem[] => {
    const configs = configStore.getAll()
    return configs.map((cfg) => ({
      ...cfg,
      runtime: processManager.getRuntime(cfg.id)
    }))
  })

  // 2. Save service
  ipcMain.handle('services:save', async (_, config: ServiceConfig): Promise<ServiceItem> => {
    console.log('[services:save] received:', JSON.stringify(config))
    try {
      configStore.set(config)
      processManager.registerService(config)
      return {
        ...config,
        runtime: processManager.getRuntime(config.id)
      }
    } catch (err) {
      console.error('[services:save] failed:', err)
      throw err
    }
  })

  // 3. Delete service
  ipcMain.handle('services:delete', async (_, id: string): Promise<boolean> => {
    await processManager.stop(id)
    processManager.unregisterService(id)
    webViewManager.destroyServiceView(id)
    return configStore.delete(id)
  })

  // 4. Start service
  ipcMain.handle('services:start', async (_, id: string) => {
    return processManager.start(id)
  })

  // 5. Stop service
  ipcMain.handle('services:stop', async (_, id: string) => {
    return processManager.stop(id)
  })

  // 6. Restart service
  ipcMain.handle('services:restart', async (_, id: string) => {
    return processManager.restart(id)
  })

  // 7. Start all / Stop all
  ipcMain.handle('services:startAll', async () => {
    return processManager.startAll()
  })
  ipcMain.handle('services:stopAll', async () => {
    return processManager.stopAll()
  })

  // 8. Logs
  ipcMain.handle('services:getLogs', (_, id: string): string[] => {
    return processManager.getLogs(id)
  })
  ipcMain.handle('services:clearLogs', (_, id: string): void => {
    processManager.clearLogs(id)
  })

  // 9. Port check & kill
  ipcMain.handle('services:checkPort', async (_, port: number) => {
    return processManager.checkPort(port)
  })
  ipcMain.handle('services:killPort', async (_, port: number) => {
    return processManager.killPort(port)
  })

  // 10. Open folder / External URL
  ipcMain.handle('services:openFolder', async (_, dirPath: string) => {
    return shell.openPath(dirPath)
  })
  ipcMain.handle('services:openExternal', async (_, url: string) => {
    return shell.openExternal(url)
  })

  // 11. WebView controls
  ipcMain.handle('webview:show', (_, id: string, url: string, bounds: WebViewBounds) => {
    webViewManager.show(id, url, bounds)
  })
  ipcMain.handle('webview:hide', () => {
    webViewManager.hide()
  })
  ipcMain.handle('webview:updateBounds', (_, bounds: WebViewBounds) => {
    webViewManager.updateBounds(bounds)
  })
  ipcMain.handle('webview:reload', () => {
    webViewManager.reload()
  })
  ipcMain.handle('webview:goBack', () => {
    webViewManager.goBack()
  })
  ipcMain.handle('webview:goForward', () => {
    webViewManager.goForward()
  })

  // 12. File dialog for selecting directory
  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 13. Auto-detect service from folder
  ipcMain.handle('services:detectFolder', async (_, folderPath: string): Promise<Partial<ServiceConfig> | null> => {
    if (!existsSync(folderPath)) return null
    const folderName = folderPath.split('/').pop() || 'new-service'

    // Check manifest.json
    const manifestPath = join(folderPath, 'service.manifest.json')
    if (existsSync(manifestPath)) {
      try {
        const raw = readFileSync(manifestPath, 'utf8')
        const manifest = JSON.parse(raw)
        return {
          ...manifest,
          id: manifest.id || folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          name: manifest.name || folderName,
          cwd: manifest.cwd || folderPath
        }
      } catch {}
    }

    // Check Go
    if (existsSync(join(folderPath, 'go.mod'))) {
      return {
        id: folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        name: folderName,
        type: 'go',
        cwd: folderPath,
        command: 'go run ./cmd/server',
        credentials: []
      }
    }

    // Check Node package.json
    const pkgPath = join(folderPath, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        const hasDev = !!pkg.scripts?.dev
        const hasStart = !!pkg.scripts?.start
        const cmd = hasDev ? 'npm run dev' : hasStart ? 'npm start' : 'node index.js'
        return {
          id: (pkg.name || folderName).toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          name: pkg.name || folderName,
          type: 'node',
          cwd: folderPath,
          command: cmd,
          credentials: []
        }
      } catch {}
    }

    return {
      id: folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      name: folderName,
      type: 'custom',
      cwd: folderPath,
      command: '',
      credentials: []
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.zzhub.servicehub')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  configStore = new ConfigStore()
  processManager = new ProcessManager()

  // Register all saved services into process manager
  for (const item of configStore.getAll()) {
    processManager.registerService(item)
  }

  // Hook up event broadcasts
  processManager.onLog((serviceId, text) => {
    mainWindow?.webContents.send('services:log-appended', { serviceId, text })
  })

  processManager.onStatus((serviceId, runtime) => {
    mainWindow?.webContents.send('services:status-changed', { serviceId, runtime })
  })

  processManager.onPortDetected((serviceId) => {
    // Persist the auto-discovered port so it survives restarts.
    const updated = processManager.getConfig?.(serviceId)
    if (updated) configStore.set(updated)
    mainWindow?.webContents.send('services:port-detected', { serviceId })
  })

  setupIPC()
  createWindow()

  // Trigger auto-start services
  for (const item of configStore.getAll()) {
    if (item.autoStart) {
      processManager.start(item.id)
    }
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  // Ensure all child processes are killed cleanly on app quit
  if (processManager) {
    await processManager.stopAll()
  }
})
