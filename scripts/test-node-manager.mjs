import net from 'node:net'
import { spawn } from 'node:child_process'
import treeKill from 'tree-kill'

console.log('=== ServiceHub AIClient2API 多进程架构生命周期验证 ===')

const config = {
  id: 'aiclient2api',
  cwd: '/Users/aatrox/.oh-my-zzhub/core/AIClient2API',
  command: 'node src/core/master.js',
  port: 55777
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

async function runTest() {
  console.log(`1. 检查端口 ${config.port} 初始状态...`)
  const initialOccupied = await checkPort(config.port)
  console.log(`- 初始端口占用: ${initialOccupied}`)

  console.log(`2. 启动 Node Master/Worker 主从服务 (node src/core/master.js)...`)
  const child = spawn(config.command, {
    cwd: config.cwd,
    shell: true,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let output = ''
  child.stdout.on('data', (d) => { output += d.toString() })
  child.stderr.on('data', (d) => { output += d.toString() })

  console.log(`- Master 进程已启动，PID: ${child.pid}`)

  console.log(`3. 等待子 Worker 启动并监听端口 ${config.port}...`)
  let ready = false
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600))
    ready = await checkPort(config.port)
    if (ready) break
  }

  if (!ready) {
    console.error('❌ 服务在指定时间内未监听端口！')
    process.exit(1)
  }
  console.log(`✅ 检测到端口 ${config.port} 正在监听！`)

  console.log(`4. 执行 tree-kill 终止整个进程树 (PID: ${child.pid})...`)
  await new Promise((resolve) => {
    treeKill(child.pid, 'SIGTERM', () => resolve())
  })

  await new Promise((r) => setTimeout(r, 1200))

  console.log(`5. 验证 Master 及其 Worker 退出后端口是否完全释放...`)
  const finalOccupied = await checkPort(config.port)
  console.log(`- 停止后端口占用: ${finalOccupied} (预期为 false)`)

  if (!finalOccupied) {
    console.log('🎉 验证成功！Node 主从进程树均被完整清理，端口已彻底释放！')
  } else {
    console.error('❌ 端口仍然被占用，Worker 变成孤儿进程！')
    process.exit(1)
  }
}

runTest()
