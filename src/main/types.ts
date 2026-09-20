export type ServiceType = 'go' | 'node' | 'python' | 'binary' | 'custom'

export type ServiceStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'CRASHED'

export interface ServiceCredential {
  id: string
  label: string
  username?: string
  password?: string
  apiKey?: string
  note?: string
}

export interface HealthCheckConfig {
  type: 'http' | 'tcp' | 'none'
  endpoint?: string
  timeoutMs?: number
}

export interface ServiceConfig {
  id: string
  name: string
  description?: string
  type: ServiceType
  icon?: string
  cwd: string
  command: string
  args?: string[]
  env?: Record<string, string>
  port?: number
  webUrl?: string
  healthCheck?: HealthCheckConfig
  credentials: ServiceCredential[]
  autoStart?: boolean
}

export interface ServiceRuntime {
  id: string
  status: ServiceStatus
  pid?: number
  startTime?: number
  error?: string
}

export interface ServiceItem extends ServiceConfig {
  runtime: ServiceRuntime
}

export interface WebViewBounds {
  x: number
  y: number
  width: number
  height: number
}
