# 交互式浏览器

[English](browser.md) | 中文

交互式浏览器能力让模型检查和操作网页，同时不把工具结构绑定到 Playwright 或其他自动化后端。Service Definition 是 [`dsh-browser`](../../packages/web/browser)，本地提供方是 [`dsh-browser-playwright-local`](../../packages/web/browser-playwright-local)，[`dsh-tool-browser`](../../packages/web/tool-browser) 注册面向模型的 `browser` 工具。

## 标签页与快照

`BrowserTabId` 是提供方拥有的不透明标识。快照返回有界的可见文本和带编号的交互元素。提供方把每个节点 ID 分配给当前 DOM；导航或交互后，消费者应重新获取快照，而不是复用过期 ID。

首版操作包括创建和列出标签页、导航、DOM 快照、点击、替换文本、键盘输入、滚动和关闭标签页。截图与下载不属于此版本。

## 提供方选择

`BrowserRuntime` 选择配置指定的提供方，或在只有一个可用提供方时自动选择。提供方缺失、不可用、存在歧义或重复注册时，运行时抛出带 `BROWSER_*` 代码的 `BrowserError`。提供方负责浏览器进程、上下文、标签页状态和清理。

## 本地 Playwright 提供方

本地提供方延迟启动一个隔离的 Chromium 上下文。它禁用下载和 Service Worker，并对包括子资源在内的每个 HTTP 或 HTTPS 请求应用 `allowedHosts`。点击使用 Playwright 在浏览器内的虚拟指针，而不是宿主操作系统的鼠标指针。`allowedHosts` 必填；`*` 表示部署明确选择不限制主机。仓库中的可选 overlay 只允许 `localhost` 和 `127.0.0.1`。

运行 `pnpm exec playwright install chromium` 安装 Chromium，或通过 `channel`、`executablePath` 配置已安装的浏览器。使用以下命令启用源码树中的 overlay：

```sh
pnpm dsh web --patch examples/browser-playwright/cordis.yml
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxbrowser--browserruntime"></a>

### `ctx.browser` — `BrowserRuntime`

Provider-neutral interactive browser runtime.

```ts cordis-catalog
/**
 * Register a provider and bind its cleanup to the contributing fiber.
 * @param provider - provider implementation keyed by its stable id.
 * @returns a disposer that unregisters and releases the provider.
 */
registerProvider(provider: BrowserProvider): () => void

/**
 * Create a tab and optionally navigate it.
 * @param url - initial URL; omitted to open a blank tab.
 * @param signal - optional caller cancellation signal.
 * @returns the created tab metadata.
 */
async open(url?: string, signal?: AbortSignal): Promise<BrowserTab>

/**
 * List provider-owned tabs.
 * @param signal - optional caller cancellation signal.
 * @returns metadata for every live tab.
 */
async tabs(signal?: AbortSignal): Promise<readonly BrowserTab[]>

/**
 * Navigate one tab.
 * @param tabId - provider-owned tab identifier.
 * @param url - destination URL.
 * @param signal - optional caller cancellation signal.
 * @returns updated tab metadata.
 */
async navigate(tabId: BrowserTabId, url: string, signal?: AbortSignal): Promise<BrowserTab>

/**
 * Capture bounded page state.
 * @param tabId - provider-owned tab identifier.
 * @param signal - optional caller cancellation signal.
 * @returns visible text and numbered interactive nodes.
 */
async snapshot(tabId: BrowserTabId, signal?: AbortSignal): Promise<BrowserSnapshot>

/**
 * Click a snapshot-assigned node.
 * @param tabId - provider-owned tab identifier.
 * @param nodeId - node id from the latest snapshot.
 * @param signal - optional caller cancellation signal.
 * @returns updated tab metadata.
 */
async click(tabId: BrowserTabId, nodeId: string, signal?: AbortSignal): Promise<BrowserTab>

/**
 * Fill a snapshot-assigned node.
 * @param tabId - provider-owned tab identifier.
 * @param nodeId - node id from the latest snapshot.
 * @param value - replacement field value.
 * @param signal - optional caller cancellation signal.
 * @returns updated tab metadata.
 */
async fill(tabId: BrowserTabId, nodeId: string, value: string, signal?: AbortSignal): Promise<BrowserTab>

/**
 * Send one keyboard key or chord.
 * @param tabId - provider-owned tab identifier.
 * @param key - Playwright-compatible key or chord.
 * @param signal - optional caller cancellation signal.
 * @returns updated tab metadata.
 */
async press(tabId: BrowserTabId, key: string, signal?: AbortSignal): Promise<BrowserTab>

/**
 * Scroll one tab.
 * @param tabId - provider-owned tab identifier.
 * @param deltaX - horizontal pixel delta.
 * @param deltaY - vertical pixel delta.
 * @param signal - optional caller cancellation signal.
 * @returns updated tab metadata.
 */
async scroll(tabId: BrowserTabId, deltaX: number, deltaY: number, signal?: AbortSignal): Promise<BrowserTab>

/**
 * Close one tab.
 * @param tabId - provider-owned tab identifier.
 * @param signal - optional caller cancellation signal.
 * @returns completion after the tab closes.
 */
async close(tabId: BrowserTabId, signal?: AbortSignal): Promise<void>
```

Source: [`packages/web/browser/src/index.ts:30`](../../packages/web/browser/src/index.ts)
<!-- END GENERATED cordis-surface -->
