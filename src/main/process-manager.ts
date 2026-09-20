import { spawn, ChildProcess, exec } from 'node:child_process'
import net from 'node:net'
import http from 'node:http'
import https from 'node:https'
import treeKill from 'tree-kill'
import { ServiceConfig, ServiceRuntime, ServiceStatus } from './types'

export type LogListener = (serviceId: string, text: string) => void
export type StatusListener = (serviceId: string, runtime: ServiceRuntime) => void

interface ManagedProcess {
  config: ServiceConfig
  process?: ChildProcess
  runtime: ServiceRuntime
  logs: string[]
  healthCheckTimer?: NodeJS.Timeout
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map()
  private logListeners: Set<LogListener> = new Set()
  private statusListeners: Set<StatusListener> = new Set()
  private heartbeatTimer?: NodeJS.Timeout

  constructor() {
    this.startHeartbeat()
  }

  public registerService(config: ServiceConfig): void {
    if (!this.processes.has(config.id)) {
      this.processes.set(config.id, {
        config,
        runtime: {
          id: config.id,
          status: 'STOPPED'
        },
        logs: []
      })
    } else {
      const existing = this.processes.get(config.id)!
      existing.config = config
    }
    // Check health immediately
    this.checkServiceHealth(config.id)
  }

  public unregisterService(serviceId: string): void {
    this.stop(serviceId)
    this.processes.delete(serviceId)
  }

  public onLog(listener: LogListener): () => void {
    this.logListeners.add(listener)
    return () => this.logListeners.delete(listener)
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  public getRuntime(serviceId: string): ServiceRuntime {
    return this.processes.get(serviceId)?.runtime || { id: serviceId, status: 'STOPPED' }
  }

  public getAllRuntimes(): Record<string, ServiceRuntime> {
    const res: Record<string, ServiceRuntime> = {}
    for (const [id, item] of this.processes.entries()) {
      res[id] = item.runtime
    }
    return res
  }

  public getLogs(serviceId: string): string[] {
    return this.processes.get(serviceId)?.logs || []
  }

  public clearLogs(serviceId: string): void {
    const item = this.processes.get(serviceId)
    if (item) item.logs = []
  }

  private appendLog(serviceId: string, text: string): void {
    const item = this.processes.get(serviceId)
    if (!item) return
    if (item.logs.length > 2000) {
      item.logs.splice(0, item.logs.length - 1500)
    }
    item.logs.push(text)
    for (const listener of this.logListeners) {
      listener(serviceId, text)
    }
  }

  private updateStatus(serviceId: string, patch: Partial<ServiceRuntime>): void {
    const item = this.processes.get(serviceId)
    if (!item) return
    const prevStatus = item.runtime.status
    const prevPid = item.runtime.pid
    item.runtime = { ...item.runtime, ...patch }
    // Only broadcast if status or pid actually changed
    if (prevStatus !== item.runtime.status || prevPid !== item.runtime.pid) {
      for (const listener of this.statusListeners) {
        listener(serviceId, item.runtime)
      }
    }
  }

  /**
   * Probes whether a service is actively running and responsive.
   * Checks HTTP URL first, then TCP port.
   */
  public async checkServiceHealth(serviceId: string): Promise<boolean> {
    const item = this.processes.get(serviceId)
    if (!item) return false

    const { config } = item
    let isAlive = false
    let detectedPid: number | undefined

    // 1. If webUrl or healthCheck endpoint exists, test HTTP ping
    const probeUrl = config.healthCheck?.endpoint || config.webUrl
    if (probeUrl) {
      isAlive = await this.probeHttp(probeUrl)
    }

    // 2. If not detected via HTTP, but port exists, test TCP connect
    if (!isAlive && config.port) {
      isAlive = await this.probeTcp(config.port)
    }

    // 3. If alive, find listening PID if port exists
    if (isAlive && config.port) {
      detectedPid = await this.findPidByPort(config.port)
    }

    // If active child process exists, prefer its PID
    if (item.process && item.process.pid) {
      detectedPid = item.process.pid
    }

    if (isAlive) {
      this.updateStatus(serviceId, {
        status: 'RUNNING',
        pid: detectedPid,
        error: undefined
      })
      return true
    } else {
      // If service is not responding and not starting
      if (item.runtime.status !== 'STARTING') {
        if (item.runtime.status === 'RUNNING') {
          this.updateStatus(serviceId, {
            status: 'STOPPED',
            pid: undefined
          })
        }
      }
      return false
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(async () => {
      for (const id of this.processes.keys()) {
        await this.checkServiceHealth(id)
      }
    }, 2500)
  }

  public async start(serviceId: string): Promise<{ success: boolean; error?: string }> {
    const item = this.processes.get(serviceId)
    if (!item) return { success: false, error: 'Service not found' }

    // First, check if already alive
    const alreadyAlive = await this.checkServiceHealth(serviceId)
    if (alreadyAlive) {
      this.appendLog(
        serviceId,
        `\x1b[32m[ServiceHub]\x1b[0m 检测到服务已在后台运行中，已成功接管！\n`
      )
      return { success: true }
    }

    const { config } = item

    this.updateStatus(serviceId, {
      status: 'STARTING',
      error: undefined,
      startTime: Date.now()
    })

    this.appendLog(
      serviceId,
      `\x1b[36m[ServiceHub]\x1b[0m 正在启动服务: ${config.command} (工作目录: ${config.cwd})\n`
    )

    try {
      const env = {
        ...process.env,
        ...config.env
      }

      const child = spawn(config.command, {
        cwd: config.cwd,
        env,
        shell: true,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      item.process = child
      const pid = child.pid
      this.updateStatus(serviceId, { pid })

      child.stdout?.on('data', (data: Buffer) => {
        this.appendLog(serviceId, data.toString())
      })

      child.stderr?.on('data', (data: Buffer) => {
        this.appendLog(serviceId, data.toString())
      })

      child.on('error', (err) => {
        this.appendLog(serviceId, `\x1b[31m[ServiceHub 异常]\x1b[0m 进程启动失败: ${err.message}\n`)
        this.updateStatus(serviceId, {
          status: 'CRASHED',
          error: err.message
        })
      })

      child.on('close', (code, signal) => {
        this.appendLog(
          serviceId,
          `\x1b[33m[ServiceHub]\x1b[0m 进程已退出 (code: ${code}, signal: ${signal})\n`
        )
        if (item.healthCheckTimer) {
          clearTimeout(item.healthCheckTimer)
          item.healthCheckTimer = undefined
        }
        item.process = undefined
        if (item.runtime.status !== 'STOPPED') {
          this.updateStatus(serviceId, {
            status: code === 0 ? 'STOPPED' : 'CRASHED',
            pid: undefined,
            error: code !== 0 ? `退出码: ${code}` : undefined
          })
        }
      })

      // Actively poll until it becomes healthy
      this.monitorHealth(serviceId)

      return { success: true }
    } catch (err: any) {
      this.updateStatus(serviceId, {
        status: 'CRASHED',
        error: err.message
      })
      return { success: false, error: err.message }
    }
  }

  private monitorHealth(serviceId: string): void {
    const item = this.processes.get(serviceId)
    if (!item) return

    const { config } = item
    const startTime = Date.now()
    const maxWait = (config.healthCheck?.timeoutMs || 15000)

    const check = async () => {
      if (item.runtime.status === 'STOPPED') return

      const alive = await this.checkServiceHealth(serviceId)

      if (alive) {
        this.appendLog(
          serviceId,
          `\x1b[32m[ServiceHub]\x1b[0m 服务健康检测通过，已就绪！\n`
        )
      } else {
        if (Date.now() - startTime < maxWait) {
          item.healthCheckTimer = setTimeout(check, 600)
        } else {
          // Timeout reached, mark running if process still alive
          if (item.process && item.runtime.status === 'STARTING') {
            this.updateStatus(serviceId, { status: 'RUNNING' })
          }
        }
      }
    }

    item.healthCheckTimer = setTimeout(check, 500)
  }

  public probeHttp(urlStr: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const client = urlStr.startsWith('https:') ? https : http
        const req = client.get(urlStr, { timeout: 1500 }, (res) => {
          // Any HTTP status code (200, 301, 302, 401, 403, 404, etc.) means the web server is up and listening!
          resolve(res.statusCode !== undefined)
        })
        req.on('error', () => resolve(false))
        req.on('timeout', () => {
          req.destroy()
          resolve(false)
        })
      } catch {
        resolve(false)
      }
    })
  }

  public probeTcp(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(800)
      socket.once('connect', () => {
        socket.destroy()
        resolve(true)
      })
      socket.once('timeout', () => {
        socket.destroy()
        resolve(false)
      })
      socket.once('error', () => {
        socket.destroy()
        resolve(false)
      })
      socket.connect(port, '127.0.0.1')
    })
  }

  public findPidByPort(port: number): Promise<number | undefined> {
    return new Promise((resolve) => {
      exec(`lsof -i :${port} -sTCP:LISTEN -t`, (err, stdout) => {
        if (!err && stdout.trim()) {
          const lines = stdout.trim().split('\n')
          const pid = parseInt(lines[0], 10)
          resolve(isNaN(pid) ? undefined : pid)
        } else {
          resolve(undefined)
        }
      })
    })
  }

  public async stop(serviceId: string): Promise<{ success: boolean; error?: string }> {
    const item = this.processes.get(serviceId)
    if (!item) return { success: false, error: 'Service not found' }

    if (item.healthCheckTimer) {
      clearTimeout(item.healthCheckTimer)
      item.healthCheckTimer = undefined
    }

    let pid = item.runtime.pid || item.process?.pid

    // If no PID known but port exists, find PID
    if (!pid && item.config.port) {
      pid = await this.findPidByPort(item.config.port)
    }

    this.updateStatus(serviceId, { status: 'STOPPED', pid: undefined })

    if (pid) {
      this.appendLog(serviceId, `\x1b[33m[ServiceHub]\x1b[0m 正在终止进程树 (PID: ${pid})...\n`)
      await new Promise<void>((resolve) => {
        treeKill(pid!, 'SIGTERM', (err) => {
          if (err) {
            treeKill(pid!, 'SIGKILL', () => resolve())
          } else {
            resolve()
          }
        })
      })
    }

    // Double check if port is still occupied
    if (item.config.port) {
      await this.killPort(item.config.port)
    }

    item.process = undefined
    this.appendLog(serviceId, `\x1b[32m[ServiceHub]\x1b[0m 服务已完全停止\n`)
    return { success: true }
  }

  public async restart(serviceId: string): Promise<{ success: boolean; error?: string }> {
    await this.stop(serviceId)
    await new Promise((resolve) => setTimeout(resolve, 800))
    return this.start(serviceId)
  }

  public async startAll(): Promise<void> {
    for (const id of this.processes.keys()) {
      await this.start(id)
    }
  }

  public async stopAll(): Promise<void> {
    for (const id of this.processes.keys()) {
      await this.stop(id)
    }
  }

  public async checkPort(port: number): Promise<{ inUse: boolean; pid?: number }> {
    const pid = await this.findPidByPort(port)
    if (pid) {
      return { inUse: true, pid }
    }
    const tcpAlive = await this.probeTcp(port)
    return { inUse: tcpAlive }
  }

  public killPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`lsof -i :${port} -sTCP:LISTEN -t | xargs kill -9`, (err) => {
        resolve(!err)
      })
    })
  }
}
