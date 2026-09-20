import net from 'node:net'
import http from 'node:http'
import { spawn, exec } from 'node:child_process'
import treeKill from 'tree-kill'

console.log('=== ServiceHub 进程管理与生命周期核心验证 ===')

const config = {
  id: 'image-gateway',
  cwd: '/Users/aatrox/.oh-my-zzhub/core/image-gateway',
  command: 'go run ./cmd/server',
  port: 18787
}

function checkPort(port) {
  return new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', () => resolve(true))
    s.once('listening', () => {
      s.close(() => resolve(false))
    })
    s.listen(port, '127.0.0.1')
  })
}

function probeHttp(url) {
  return new Promise((resolve) => {
    http.get(url, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200)
    }).on('error', () => resolve(false))
  })
}

async function runTest() {
  console.log('1. 检查端口 18787 初始状态...')
  const initialOccupied = await checkPort(config.port)
  console.log(`- 初始端口占用: ${initialOccupied}`)

  console.log('2. 使用进程组启动 Go 服务 (go run ./cmd/server)...')
  const child = spawn(config.command, {
    cwd: config.cwd,
    shell: true,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let output = ''
  child.stdout.on('data', (d) => {
    output += d.toString()
  })
  child.stderr.on('data', (d) => {
    output += d.toString()
  })

  console.log(`- 进程已创建，PID: ${child.pid}`)

  // Wait for healthz
  console.log('3. 等待服务就绪并探测 http://127.0.0.1:18787/healthz ...')
  let ready = false
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600))
    ready = await probeHttp('http://127.0.0.1:18787/healthz')
    if (ready) break
  }

  if (!ready) {
    console.error('❌ 服务在指定时间内未就绪！日志输出:\n' + output)
    process.exit(1)
  }
  console.log('✅ 服务健康检查通过！HTTP 200 OK')

  console.log('4. 验证端口已被占用...')
  const runningOccupied = await checkPort(config.port)
  console.log(`- 运行状态端口占用: ${runningOccupied} (预期为 true)`)

  console.log('5. 执行 tree-kill 终止整个进程树 (PID: ' + child.pid + ')...')
  await new Promise((resolve) => {
    treeKill(child.pid, 'SIGTERM', () => resolve())
  })

  await new Promise((r) => setTimeout(r, 1000))

  console.log('6. 验证服务退出后端口是否完全释放（杜绝孤儿进程）...')
  const finalOccupied = await checkPort(config.port)
  console.log(`- 停止后端口占用: ${finalOccupied} (预期为 false)`)

  if (!finalOccupied) {
    console.log('🎉 验证成功！所有深层子进程均已彻底销毁，无残留端口占用！')
  } else {
    console.error('❌ 端口仍然被占用，存在孤儿进程！')
    process.exit(1)
  }
}

runTest()
