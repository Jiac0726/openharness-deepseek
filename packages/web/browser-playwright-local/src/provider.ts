/** Local Playwright implementation of the interactive browser capability. */

import { chromium } from 'playwright'
import type { Browser, BrowserContext, Locator, Page } from 'playwright'
import { BrowserError, browserTabId } from '@deepseek-ai/dsh-browser'
import type { BrowserProvider, BrowserSnapshot, BrowserTab, BrowserTabId } from '@deepseek-ai/dsh-browser'

/** Complete local provider configuration. */
export interface PlaywrightBrowserOptions {
  /** Read the current navigation blocklist without recreating the browser context. */
  readonly blockedHosts: readonly string[] | (() => readonly string[])
  readonly headless: boolean
  readonly actionTimeoutMs: number
  readonly maxSnapshotChars: number
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly executablePath?: string
  readonly channel?: string
}

interface PageRecord {
  readonly id: BrowserTabId
  readonly page: Page
}

const INTERACTIVE_SELECTOR = 'a[href],button,input,textarea,select,[role="button"],[role="link"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])'

/** Isolated Playwright provider that rejects requests to configured hostnames. */
export class PlaywrightBrowserProvider implements BrowserProvider {
  readonly id = 'playwright-local'

  private browser: Browser | undefined
  private context: BrowserContext | undefined
  private readonly pages = new Map<BrowserTabId, Page>()
  private nextTab = 1

  constructor(private readonly options: PlaywrightBrowserOptions) {}

  /** Playwright is installed with this provider; browser launch is deferred until first use. */
  available(): boolean {
    return true
  }

  async open(url: string | undefined, signal?: AbortSignal): Promise<BrowserTab> {
    this.throwIfAborted(signal)
    const context = await this.ensureContext()
    const page = await context.newPage()
    const id = browserTabId(`tab-${this.nextTab++}`)
    this.pages.set(id, page)
    try {
      if (url !== undefined) await this.goto(page, url, signal)
      return await this.describe({ id, page })
    } catch (error) {
      this.pages.delete(id)
      await page.close().catch(() => undefined)
      throw error
    }
  }

  async tabs(signal?: AbortSignal): Promise<readonly BrowserTab[]> {
    this.throwIfAborted(signal)
    return Promise.all([...this.pages].map(([id, page]) => this.describe({ id, page })))
  }

  async navigate(tabId: BrowserTabId, url: string, signal?: AbortSignal): Promise<BrowserTab> {
    const page = this.requirePage(tabId)
    await this.goto(page, url, signal)
    return this.describe({ id: tabId, page })
  }

  async snapshot(tabId: BrowserTabId, signal?: AbortSignal): Promise<BrowserSnapshot> {
    this.throwIfAborted(signal)
    const page = this.requirePage(tabId)
    const raw = await page.evaluate<string>(`(() => {
      const marker = 'data-dsh-browser-node'
      for (const element of document.querySelectorAll('[' + marker + ']')) element.removeAttribute(marker)
      const visible = (element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
      }
      const label = (element) => element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.innerText || element.value || element.getAttribute('title') || ''
      const lines = []
      let index = 1
      for (const element of document.querySelectorAll(${JSON.stringify(INTERACTIVE_SELECTOR)})) {
        if (!visible(element)) continue
        const nodeId = String(index++)
        element.setAttribute(marker, nodeId)
        const role = element.getAttribute('role') || element.tagName.toLowerCase()
        lines.push('[node=' + nodeId + '] ' + role + ' "' + String(label(element)).replace(/\\s+/g, ' ').trim().slice(0, 240) + '"')
      }
      const bodyText = document.body ? document.body.innerText.replace(/\\n{3,}/g, '\\n\\n').trim() : ''
      return 'URL: ' + location.href + '\\nTITLE: ' + document.title + '\\n\\nINTERACTIVE ELEMENTS\\n' + lines.join('\\n') + '\\n\\nVISIBLE TEXT\\n' + bodyText
    })()`)
    const truncated = raw.length > this.options.maxSnapshotChars
    const text = truncated ? raw.slice(0, this.options.maxSnapshotChars) : raw
    return { tab: await this.describe({ id: tabId, page }), text, truncated }
  }

  async click(tabId: BrowserTabId, nodeId: string, signal?: AbortSignal): Promise<BrowserTab> {
    const page = this.requirePage(tabId)
    this.throwIfAborted(signal)
    await this.clickWithVirtualPointer(page, nodeId, signal)
    return this.describe({ id: tabId, page })
  }

  async fill(tabId: BrowserTabId, nodeId: string, value: string, signal?: AbortSignal): Promise<BrowserTab> {
    const page = this.requirePage(tabId)
    this.throwIfAborted(signal)
    await page.locator(`[data-dsh-browser-node=${JSON.stringify(nodeId)}]`).fill(value, { timeout: this.options.actionTimeoutMs })
    return this.describe({ id: tabId, page })
  }

  async press(tabId: BrowserTabId, key: string, signal?: AbortSignal): Promise<BrowserTab> {
    const page = this.requirePage(tabId)
    this.throwIfAborted(signal)
    await page.keyboard.press(key)
    return this.describe({ id: tabId, page })
  }

  async scroll(tabId: BrowserTabId, deltaX: number, deltaY: number, signal?: AbortSignal): Promise<BrowserTab> {
    const page = this.requirePage(tabId)
    this.throwIfAborted(signal)
    await page.mouse.wheel(deltaX, deltaY)
    return this.describe({ id: tabId, page })
  }

  async close(tabId: BrowserTabId, signal?: AbortSignal): Promise<void> {
    this.throwIfAborted(signal)
    const page = this.requirePage(tabId)
    this.pages.delete(tabId)
    await page.close()
  }

  async dispose(): Promise<void> {
    this.pages.clear()
    const browser = this.browser
    this.browser = undefined
    this.context = undefined
    if (browser !== undefined) await browser.close()
  }

  private async ensureContext(): Promise<BrowserContext> {
    if (this.context !== undefined) return this.context
    try {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        ...this.options.executablePath !== undefined ? { executablePath: this.options.executablePath } : {},
        ...this.options.channel !== undefined ? { channel: this.options.channel } : {},
      })
      this.context = await this.browser.newContext({
        viewport: { width: this.options.viewportWidth, height: this.options.viewportHeight },
        acceptDownloads: false,
        serviceWorkers: 'block',
      })
      await this.context.route('**/*', async (route) => {
        if (this.isPermittedUrl(route.request().url())) await route.continue()
        else await route.abort('blockedbyclient')
      })
      return this.context
    } catch (cause) {
      await this.dispose().catch(() => undefined)
      throw new BrowserError('failed to launch Playwright Chromium; install it with `pnpm exec playwright install chromium` or configure executablePath/channel', 'BROWSER_LAUNCH_FAILED', { cause })
    }
  }

  private async goto(page: Page, url: string, signal?: AbortSignal): Promise<void> {
    this.throwIfAborted(signal)
    if (!this.isPermittedUrl(url)) {
      throw new BrowserError(`navigation to ${JSON.stringify(url)} is blocked by blockedHosts`, 'BROWSER_URL_BLOCKED')
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.actionTimeoutMs })
  }

  /** Move Playwright's browser-local pointer to a snapshot node and click it. */
  private async clickWithVirtualPointer(page: Page, nodeId: string, signal?: AbortSignal): Promise<void> {
    const locator = page.locator(`[data-dsh-browser-node=${JSON.stringify(nodeId)}]`)
    await locator.scrollIntoViewIfNeeded({ timeout: this.options.actionTimeoutMs })
    const box = await this.requirePointerTarget(locator, nodeId)
    this.throwIfAborted(signal)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    this.throwIfAborted(signal)
    await page.mouse.down()
    await page.mouse.up()
  }

  /** Return the viewport box required by the browser-local pointer. */
  private async requirePointerTarget(locator: Locator, nodeId: string): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await locator.boundingBox()
    if (box === null || box.width <= 0 || box.height <= 0) {
      throw new BrowserError(`browser node ${JSON.stringify(nodeId)} is not visible for pointer input`, 'BROWSER_NODE_NOT_INTERACTABLE')
    }
    return box
  }

  private isPermittedUrl(raw: string): boolean {
    if (raw === 'about:blank' || raw.startsWith('blob:') || raw.startsWith('data:')) return true
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      return false
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const blockedHosts = typeof this.options.blockedHosts === 'function'
      ? this.options.blockedHosts()
      : this.options.blockedHosts
    return !blockedHosts.includes(url.hostname.toLowerCase())
  }

  private requirePage(tabId: BrowserTabId): Page {
    const page = this.pages.get(tabId)
    if (page === undefined || page.isClosed()) {
      this.pages.delete(tabId)
      throw new BrowserError(`browser tab ${JSON.stringify(tabId)} does not exist`, 'BROWSER_TAB_NOT_FOUND')
    }
    return page
  }

  private async describe(record: PageRecord): Promise<BrowserTab> {
    return { id: record.id, title: await record.page.title(), url: record.page.url() }
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted === true) {
      const error = new BrowserError('browser operation aborted', 'BROWSER_ABORTED')
      error.name = 'AbortError'
      throw error
    }
  }
}
