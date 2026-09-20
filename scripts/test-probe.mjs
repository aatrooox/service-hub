import http from 'node:http'
import { exec } from 'node:child_process'

async function probeHttp(urlStr) {
  return new Promise((resolve) => {
    try {
      const req = http.get(urlStr, { timeout: 1500 }, (res) => {
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

function findPidByPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -i :${port} -sTCP:LISTEN -t`, (err, stdout) => {
      if (!err && stdout.trim()) {
        const lines = stdout.trim().split('\n')
        resolve(parseInt(lines[0], 10))
      } else {
        resolve(undefined)
      }
    })
  })
}

async function test() {
  console.log('测试 AIClient2API 探测逻辑:')
  const alive = await probeHttp('http://127.0.0.1:55777')
  console.log(`- HTTP 探测结果: ${alive}`)
  const pid = await findPidByPort(55777)
  console.log(`- PID 探测结果: ${pid}`)
  if (alive && pid) {
    console.log('✅ 探测完全正确！状态将被置为 RUNNING，PID 为 ' + pid)
  } else {
    console.error('❌ 探测失败')
  }
}

test()
