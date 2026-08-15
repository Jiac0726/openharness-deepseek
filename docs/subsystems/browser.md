# Interactive Browser

English | [中文](browser.zh.md)

The interactive browser capability lets a model inspect and operate web pages without coupling tool schemas to Playwright or another automation backend. The Service Definition is [`dsh-browser`](../../packages/web/browser), the local provider is [`dsh-browser-playwright-local`](../../packages/web/browser-playwright-local), and [`dsh-tool-browser`](../../packages/web/tool-browser) registers the model-facing `browser` tool.

## Tabs and snapshots

`BrowserTabId` is an opaque provider-owned identifier. A snapshot returns bounded visible text plus numbered interactive elements. The provider assigns each node id to the current DOM; consumers take another snapshot after navigation or an interaction instead of reusing stale ids.

The first operation set covers tab creation and listing, navigation, DOM snapshots, clicking, text replacement, keyboard input, scrolling, and tab closure. Screenshots and downloads are not part of this version.

## Provider selection

`BrowserRuntime` selects the configured provider or auto-selects exactly one usable provider. Missing, unavailable, ambiguous, and duplicate providers raise `BrowserError` with `BROWSER_*` codes. Providers own browser processes, contexts, tab state, and cleanup.

## Local Playwright provider

The local provider launches one isolated Chromium context lazily. It disables downloads and service workers and applies `allowedHosts` to every HTTP or HTTPS request, including subresources. Clicks use Playwright's browser-local virtual pointer, not the host operating system pointer. `allowedHosts` is required; `*` is an explicit unrestricted deployment choice. The checked-in opt-in overlay permits only `localhost` and `127.0.0.1`.

Install Chromium with `pnpm exec playwright install chromium`, or configure an installed browser with `channel` or `executablePath`. Enable the source-tree overlay with:

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
