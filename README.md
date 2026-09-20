# ServiceHub (本地服务容器管理平台)

ServiceHub 是一个专为本地开发者及私域用户设计的轻量级微服务管理客户端。基于 **Electron + Vite + Vue 3 + TypeScript + Tailwind CSS** 构建。

解决本地多个 Go / Node / Python 等零散服务的痛点：
1. **防止遗忘启停方式**：统一注册、配置工作目录（CWD）、启动命令和参数，一键启动/停止/重启。
2. **彻底杜绝僵尸进程与端口占用**：基于进程组（Process Group）与 `tree-kill` 彻底清除派生子进程树。
3. **实时彩色终端输出**：集成 `xterm.js`，完整呈现 ANSI 彩色日志与流式输出。
4. **原生内嵌各服务的 Web 界面**：采用 Electron `WebContentsView` 架构，无缝保留登录 Cookie 与 Session，天然免疫浏览器的 `X-Frame-Options` 与 `CSP` 防嵌拦截。
5. **本地凭证保险箱**：本地 AES-256-GCM 加密存储管理员密码与 API Key，提供一键脱敏复制抽屉。
6. **标准化 Manifest 与一键导入**：支持服务根目录放置 `service.manifest.json`，或直接选择工程目录自动嗅探识别。

---

## 快速上手

### 1. 开发模式启动
```bash
cd service-hub
pnpm install
pnpm dev
```

### 2. 打包生成桌面端安装包 (.dmg)
```bash
pnpm build:mac
```
生成的安装包将位于 `service-hub/release` 目录下。

---

## 标准服务契约 (`service.manifest.json`)

在任意微服务或应用根目录下放置此文件，ServiceHub 即可一键识别并导入：

```json
{
  "id": "my-service",
  "name": "我的微服务",
  "version": "1.0.0",
  "description": "服务简要说明",
  "type": "go", // go | node | python | binary | custom
  "command": "go run ./cmd/server",
  "port": 8080,
  "webUrl": "http://127.0.0.1:8080",
  "healthCheck": {
    "type": "http", // http | tcp | none
    "endpoint": "http://127.0.0.1:8080/health",
    "timeoutMs": 3000
  },
  "credentials": [
    {
      "id": "admin-account",
      "label": "超级管理员账号",
      "username": "admin",
      "password": "my_secure_password",
      "note": "首次登录使用"
    }
  ]
}
```

---

## 已预置联调测试服务

- **`image-gateway` (Go)**：生图聚合网关，命令 `go run ./cmd/server`，端口 `18787`，包含健康检查与中文管理页。
- **`AIClient2API` (Node)**：客户端模型转代理服务，命令 `node src/core/master.js`，端口 `55777`，包含 Web 管理页与 API Key 凭证。
