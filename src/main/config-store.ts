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
    const homeDir = app.getPath('home')
    const coreDir = path.join(homeDir, '.oh-my-zzhub', 'core')

    return [
      {
        id: 'image-gateway',
        name: 'Image Gateway 生图网关',
        description: '多 GPT-Image 生图服务聚合分发网关 (Go)',
        type: 'go',
        cwd: path.join(coreDir, 'image-gateway'),
        command: 'go run ./cmd/server',
        port: 18787,
        webUrl: 'http://127.0.0.1:18787',
        healthCheck: {
          type: 'http',
          endpoint: 'http://127.0.0.1:18787/healthz',
          timeoutMs: 3000
        },
        credentials: [
          {
            id: 'ig-token',
            label: '本地访问令牌 (Local Token)',
            apiKey: '查看 data 目录或默认免验',
            note: '支持健康检查 http://127.0.0.1:18787/healthz'
          }
        ],
        autoStart: false
      },
      {
        id: 'aiclient2api',
        name: 'AIClient2API 代理中心',
        description: '模拟客户端大模型统一封装为本地 OpenAI 兼容接口 (Node)',
        type: 'node',
        cwd: path.join(coreDir, 'AIClient2API'),
        command: 'node src/core/master.js',
        port: 55777,
        webUrl: 'http://127.0.0.1:55777',
        healthCheck: {
          type: 'http',
          endpoint: 'http://127.0.0.1:55777',
          timeoutMs: 3000
        },
        credentials: [
          {
            id: 'a2-key',
            label: '默认 API Key',
            apiKey: 'sk-5c35f09c8cd95fdab0bfcff8700f2b5a',
            note: '对应 configs/config.json 中的 REQUIRED_API_KEY'
          },
          {
            id: 'a2-admin',
            label: 'Web 后台登录密码',
            username: 'admin',
            password: '查看 configs/pwd',
            note: '访问 http://127.0.0.1:55777 使用'
          }
        ],
        autoStart: false
      }
    ]
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
