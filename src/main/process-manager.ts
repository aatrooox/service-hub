import { spawn, ChildProcess, exec } from 'node:child_process'
import net from 'node:net'
import http from 'node:http'
import https from 'node:https'
import treeKill from 'tree-kill'
import { ServiceConfig, ServiceRuntime, ServiceStatus } from './types'

export type LogListener = (serviceId: string, text: string) => void
export type StatusListener = (serviceId: string, runtime: ServiceRuntime) => void
export type PortDetectedListener = (
  serviceId: string,
  detail: { port: number; webUrl: string }
) => void

interface ManagedProcess {
  config: ServiceConfig
  process?: ChildProcess
  runtime: ServiceRuntime
  logs: string[]
  healthCheckTimer?: NodeJS.Timeout
  portWatchTimer?: NodeJS.Timeout
  probeFailures: number
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map()
  private logListeners: Set<LogListener> = new Set()
  private statusListeners: Set<StatusListener> = new Set()
  private portListeners: Set<PortDetectedListener> = new Set()
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
        logs: [],
        probeFailures: 0
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

  public onPortDetected(listener: PortDetectedListener): () => void {
    this.portListeners.add(listener)
    return () => this.portListeners.delete(listener)
  }

  public getRuntime(serviceId: string): ServiceRuntime {
    return this.processes.get(serviceId)?.runtime || { id: serviceId, status: 'STOPPED' }
  }

  public getConfig(serviceId: string): ServiceConfig | undefined {
    return this.processes.get(serviceId)?.config
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
    // Ensure every line break carries a carriage return for xterm rendering.
    if (!text.includes('\r\n')) {
      text = text.replace(/\r?\n/g, '\r\n')
    }
    if (item.logs.length > 2000) {
      item.logs.splice(0, item.logs.length - 1500)
    }
    item.logs.push(text)
    for (const listener of this.logListeners) {
      listener(serviceId, text)
    }
  }

  // Programs often emit bare "\n"; xterm only moves down without returning to
  // column 0, which makes output cascade diagonally. Normalize to "\r\n".
  private normalizeOutput(data: Buffer): string {
    return data.toString().replace(/\r?\n/g, '\r\n')
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
    const hasProbe = !!(config.healthCheck?.endpoint || config.webUrl || config.port)

    // --- Probe readiness (is the service actually accepting traffic?) ---
    let ready = false
    if (config.healthCheck?.endpoint || config.webUrl) {
      ready = await this.probeHttp(config.healthCheck?.endpoint || config.webUrl!)
    }
    if (!ready && config.port) {
      ready = await this.probeTcp(config.port)
    }
    if (!hasProbe) {
      ready = true
    }

    // --- Liveness (does the managed process / server still exist?) ---
    const processAlive = !!item.process
    const alive = hasProbe ? ready || processAlive : processAlive

    let pid: number | undefined
    if (ready && config.port) {
      pid = await this.findPidByPort(config.port)
    }
    if (item.process?.pid) pid = item.process.pid

    // --- Status transition ---
    if (item.runtime.status === 'STARTING') {
      // Stay STARTING until the probe actually passes; with no probe, the
      // spawned process itself counts as ready.
      if (ready) {
        item.probeFailures = 0
        this.updateStatus(serviceId, { status: 'RUNNING', pid, error: undefined })
      }
      return ready
    }

    if (alive) {
      item.probeFailures = 0
      this.updateStatus(serviceId, { status: 'RUNNING', pid, error: undefined })
      return true
    }

    // Not alive: require a few consecutive failures before flapping to STOPPED.
    item.probeFailures += 1
    if (item.probeFailures >= 3) {
      this.updateStatus(serviceId, { status: 'STOPPED', pid: undefined })
    }
    return false
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

    // Snapshot listening ports before spawning so we can tell which port
    // this process actually opened.
    const prePortMap = await this.getListeningPortMap()

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
        this.appendLog(serviceId, this.normalizeOutput(data))
      })

      child.stderr?.on('data', (data: Buffer) => {
        this.appendLog(serviceId, this.normalizeOutput(data))
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
        if (item.portWatchTimer) {
          clearTimeout(item.portWatchTimer)
          item.portWatchTimer = undefined
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

      // No declared port: auto-discover the port its process tree opens.
      if (!config.port) {
        this.watchForListeningPort(serviceId, pid, new Set(prePortMap.keys()))
      }

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

  /**
   * Returns a Map of every locally listening TCP port -> owning PID,
   * using a single lsof call.
   */
  private getListeningPortMap(): Promise<Map<number, number>> {
    return new Promise((resolve) => {
      exec('lsof -nP -iTCP -sTCP:LISTEN', (err, stdout) => {
        const map = new Map<number, number>()
        if (err || !stdout) return resolve(map)
        const lines = stdout.split('\n').slice(1)
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length < 9) continue
          const pid = parseInt(parts[1], 10)
          const addr = parts[8]
          const match = addr.match(/:(\d+)$/)
          if (match && !isNaN(pid)) {
            map.set(parseInt(match[1], 10), pid)
          }
        }
        resolve(map)
      })
    })
  }

  /** Collects the root PID and all its descendant PIDs. */
  private getProcessTreePids(rootPid: number): Promise<Set<number>> {
    return new Promise((resolve) => {
      exec(`pgrep -P ${rootPid}`, (err, stdout) => {
        const pids = new Set<number>([rootPid])
        if (err || !stdout.trim()) return resolve(pids)
        const children = stdout.trim().split('\n').map((p) => parseInt(p, 10)).filter((p) => !isNaN(p))
        let pending = children.length
        if (pending === 0) return resolve(pids)
        for (const child of children) {
          pids.add(child)
          this.getProcessTreePids(child).then((desc) => {
            for (const p of desc) pids.add(p)
            pending -= 1
            if (pending === 0) resolve(pids)
          })
        }
      })
    })
  }

  /**
   * For a service without a declared port, polls until its process tree
   * opens a listening TCP port and auto-fills port + webUrl.
   */
  private watchForListeningPort(
    serviceId: string,
    rootPid: number,
    baseline: Set<number>
  ): void {
    const item = this.processes.get(serviceId)
    if (!item) return
    let elapsed = 0
    const intervalMs = 700
    const maxMs = 60000

    const tick = async (): Promise<void> => {
      if (!item.process || elapsed > maxMs) return
      const [tree, portMap] = await Promise.all([
        this.getProcessTreePids(rootPid),
        this.getListeningPortMap()
      ])

      const candidates: number[] = []
      for (const [port, pid] of portMap) {
        if (tree.has(pid) && !baseline.has(port)) candidates.push(port)
      }
      // Prefer common dev-server ports, otherwise the lowest candidate.
      candidates.sort((a, b) => {
        const pref = (p: number): number => {
          if (p >= 5173 && p <= 5199) return 0
          if (p >= 3000 && p <= 3999) return 1
          if (p >= 8000 && p <= 8999) return 2
          return 3
        }
        return pref(a) - pref(b) || a - b
      })

      if (candidates.length > 0) {
        const port = candidates[0]
        const webUrl = `http://127.0.0.1:${port}`
        item.config.port = port
        item.config.webUrl = webUrl
        if (!item.config.healthCheck || item.config.healthCheck.type === 'none') {
          item.config.healthCheck = { type: 'tcp' }
        }
        this.appendLog(
          serviceId,
          `\x1b[32m[ServiceHub]\x1b[0m 自动嗅探到监听端口 :${port}\n`
        )
        for (const listener of this.portListeners) {
          listener(serviceId, { port, webUrl })
        }
        return
      }

      elapsed += intervalMs
      item.portWatchTimer = setTimeout(tick, intervalMs)
    }

    tick()
  }

  public async stop(serviceId: string): Promise<{ success: boolean; error?: string }> {
    const item = this.processes.get(serviceId)
    if (!item) return { success: false, error: 'Service not found' }

    if (item.healthCheckTimer) {
      clearTimeout(item.healthCheckTimer)
      item.healthCheckTimer = undefined
    }
    if (item.portWatchTimer) {
      clearTimeout(item.portWatchTimer)
      item.portWatchTimer = undefined
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
