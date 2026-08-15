# @deepseek-ai/dsh-browser-playwright-local

[English](README.md) | 中文

这是 `ctx.browser` 的本地 Playwright 提供方。它延迟启动隔离的 Chromium 上下文，拥有其中的标签页，阻止下载和 Service Worker，并拒绝主机名出现在 `blockedHosts` 中的所有网络请求。点击会移动并按下 Playwright 在浏览器内的虚拟指针，绝不操作宿主操作系统的鼠标指针。

首次使用前运行 `pnpm exec playwright install chromium` 安装内置浏览器。部署也可以改为配置 `executablePath` 或已安装的 `channel`。

## 配置

`blockedHosts` 默认是空列表，即允许所有 HTTP 和 HTTPS 主机名。每一项都是一个精确主机名；URL 路径和通配符无效。`headless`、`actionTimeoutMs`、`maxSnapshotChars`、`viewportWidth` 和 `viewportHeight` 具有受限的运行默认值。`executablePath` 与 `channel` 互斥。

## 模型体验

间接通过 `dsh-tool-browser` 生效；该工具呈现此提供方产生的有界快照和操作结果。

#### KV 缓存影响

不直接导致失效；请求前缀的变化由上述消费者负责。

## 已知限制与延期工作

- **没有持久化认证配置**——每个提供方生命周期都使用全新的隔离浏览器上下文。
- **仅在 Playwright 操作之间检查取消**——已经运行的 Playwright 操作由 `actionTimeoutMs` 限制，但之后到达的取消信号不会中断它。
- **没有截图结果**——首版提供方仅公开由 DOM 派生的快照；图片附件存储留待后续实现。
