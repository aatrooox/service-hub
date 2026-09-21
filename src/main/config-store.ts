import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { ServiceConfig } from './types'
import { encryptText, decryptText } from './crypto'

export class ConfigStore {
  private configPath: string
  private services: Map<string, ServiceConfig> = new Map()

  constructor() {
    const userData = app.getPath('userData')
    const configDir = path.join(userData, 'config')
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }
    this.configPath = path.join(configDir, 'services.json')
    this.load()
  }

  private getSeedServices(): ServiceConfig[] {
    return []
  }

  private load(): void {
    if (!existsSync(this.configPath)) {
      const seeds = this.getSeedServices()
      for (const item of seeds) {
        this.services.set(item.id, item)
      }
      this.save()
      return
    }

    try {
      const raw = readFileSync(this.configPath, 'utf8')
      const parsed: ServiceConfig[] = JSON.parse(raw)
      for (const item of parsed) {
        // Decrypt password & apiKey
        if (item.credentials) {
          for (const cred of item.credentials) {
            if (cred.password) cred.password = decryptText(cred.password)
            if (cred.apiKey) cred.apiKey = decryptText(cred.apiKey)
          }
        }
        this.services.set(item.id, item)
      }
    } catch (err) {
      console.error('Failed to load services.json:', err)
    }
  }

  public save(): void {
    try {
      const list = Array.from(this.services.values()).map((s) => {
        const cloned: ServiceConfig = JSON.parse(JSON.stringify(s))
        if (cloned.credentials) {
          for (const cred of cloned.credentials) {
            if (cred.password) cred.password = encryptText(cred.password)
            if (cred.apiKey) cred.apiKey = encryptText(cred.apiKey)
          }
        }
        return cloned
      })
      writeFileSync(this.configPath, JSON.stringify(list, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to save services.json:', err)
    }
  }

  public getAll(): ServiceConfig[] {
    return Array.from(this.services.values())
  }

  public get(id: string): ServiceConfig | undefined {
    return this.services.get(id)
  }

  public set(config: ServiceConfig): void {
    this.services.set(config.id, config)
    this.save()
  }

  public delete(id: string): boolean {
    const res = this.services.delete(id)
    if (res) this.save()
    return res
  }
}
