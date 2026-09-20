import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: string
  progress?: {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  }
  error?: string
}

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // Do not auto-download immediately; let the user confirm first
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  let currentStatus: UpdateStatus = { state: 'idle' }

  const sendStatus = (status: UpdateStatus): void => {
    currentStatus = status
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status-changed', status)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const notes = typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : Array.isArray(info.releaseNotes)
        ? info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note)).join('\n')
        : undefined

    sendStatus({
      state: 'available',
      version: info.version,
      releaseNotes: notes
    })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    sendStatus({
      state: 'not-available',
      version: info.version
    })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendStatus({
      state: 'downloading',
      version: currentStatus.version,
      progress: {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      }
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    sendStatus({
      state: 'downloaded',
      version: info.version
    })
  })

  autoUpdater.on('error', (err: Error) => {
    sendStatus({
      state: 'error',
      error: err.message
    })
  })

  // IPC Handlers
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      sendStatus({
        state: 'not-available',
        version: app.getVersion(),
        error: '当前处于开发环境，请打包后体验版本检测'
      })
      return null
    }
    try {
      sendStatus({ state: 'checking' })
      return await autoUpdater.checkForUpdates()
    } catch (err: any) {
      sendStatus({ state: 'error', error: err.message })
      return null
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      sendStatus({ state: 'downloading', version: currentStatus.version })
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      sendStatus({ state: 'error', error: err.message })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('updater:getStatus', () => {
    return currentStatus
  })

  // Silent check 4 seconds after launch in production app
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 4000)
  }
}
