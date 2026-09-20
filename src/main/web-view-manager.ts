import { BrowserWindow, WebContentsView } from 'electron'
import { WebViewBounds } from './types'

export class WebViewManager {
  private win: BrowserWindow
  private views: Map<string, WebContentsView> = new Map()
  private activeServiceId?: string
  private currentBounds?: WebViewBounds

  constructor(win: BrowserWindow) {
    this.win = win
  }

  public show(serviceId: string, url: string, bounds: WebViewBounds): void {
    this.currentBounds = bounds

    // Hide any previous active view
    if (this.activeServiceId && this.activeServiceId !== serviceId) {
      const prevView = this.views.get(this.activeServiceId)
      if (prevView) {
        this.win.contentView.removeChildView(prevView)
      }
    }

    let view = this.views.get(serviceId)
    if (!view) {
      view = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })
      view.webContents.loadURL(url)
      this.views.set(serviceId, view)
    }

    this.activeServiceId = serviceId
    this.win.contentView.addChildView(view)
    view.setBounds(bounds)
  }

  public hide(): void {
    if (this.activeServiceId) {
      const view = this.views.get(this.activeServiceId)
      if (view) {
        this.win.contentView.removeChildView(view)
      }
      this.activeServiceId = undefined
    }
  }

  public updateBounds(bounds: WebViewBounds): void {
    this.currentBounds = bounds
    if (this.activeServiceId) {
      const view = this.views.get(this.activeServiceId)
      if (view) {
        view.setBounds(bounds)
      }
    }
  }

  public reload(): void {
    if (this.activeServiceId) {
      this.views.get(this.activeServiceId)?.webContents.reload()
    }
  }

  public goBack(): void {
    if (this.activeServiceId) {
      this.views.get(this.activeServiceId)?.webContents.goBack()
    }
  }

  public goForward(): void {
    if (this.activeServiceId) {
      this.views.get(this.activeServiceId)?.webContents.goForward()
    }
  }

  public destroyServiceView(serviceId: string): void {
    const view = this.views.get(serviceId)
    if (view) {
      if (this.activeServiceId === serviceId) {
        this.hide()
      }
      this.views.delete(serviceId)
    }
  }
}
