/** Local Web Remote projection for the isolated browser. */

import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { BrowserTabId } from '@deepseek-ai/dsh-browser/brand'
import type { BrowserSnapshot, BrowserTab } from '@deepseek-ai/dsh-browser/types'

/** Browser controls exposed through the local Web application's Remote bridge. */
export class BrowserControlGateway extends TypertRemoteService {
  static inject = ['browser']
  /** @param ctx - context carrying the selected browser provider. */
  constructor(ctx: Context) { super(ctx, 'browserControl') }
  /**
   * List all tabs owned by the isolated browser.
   * @returns all tabs owned by the isolated browser.
   */
  @Remote('tabs') async tabs(): Promise<readonly BrowserTab[]> { return await this.ctx.browser.tabs() }
  /**
   * Open a tab in the isolated browser.
   * @param url - optional initial URL.
   * @returns the opened tab.
   */
  @Remote('open') async open(url?: string): Promise<BrowserTab> { return await this.ctx.browser.open(url) }
  /**
   * Navigate a tab to a permitted destination.
   * @param tabId - target tab.
   * @param url - destination URL.
   * @returns updated tab metadata.
   */
  @Remote('navigate') async navigate(tabId: BrowserTabId, url: string): Promise<BrowserTab> { return await this.ctx.browser.navigate(tabId, url) }
  /**
   * Capture the current interactive state of a tab.
   * @param tabId - target tab.
   * @returns the current interactive snapshot.
   */
  @Remote('snapshot') async snapshot(tabId: BrowserTabId): Promise<BrowserSnapshot> { return await this.ctx.browser.snapshot(tabId) }
  /**
   * Click a node from the latest tab snapshot.
   * @param tabId - target tab.
   * @param nodeId - latest snapshot node identifier.
   * @returns updated tab metadata.
   */
  @Remote('click') async click(tabId: BrowserTabId, nodeId: string): Promise<BrowserTab> { return await this.ctx.browser.click(tabId, nodeId) }
  /**
   * Replace the value of an editable snapshot node.
   * @param tabId - target tab.
   * @param nodeId - latest snapshot node identifier.
   * @param value - replacement value.
   * @returns updated tab metadata.
   */
  @Remote('fill') async fill(tabId: BrowserTabId, nodeId: string, value: string): Promise<BrowserTab> { return await this.ctx.browser.fill(tabId, nodeId, value) }
  /**
   * Send a key or chord to a tab.
   * @param tabId - target tab.
   * @param key - Playwright-compatible key or chord.
   * @returns updated tab metadata.
   */
  @Remote('press') async press(tabId: BrowserTabId, key: string): Promise<BrowserTab> { return await this.ctx.browser.press(tabId, key) }
  /**
   * Scroll a tab vertically.
   * @param tabId - target tab.
   * @param deltaY - vertical scroll pixels.
   * @returns updated tab metadata.
   */
  @Remote('scroll') async scroll(tabId: BrowserTabId, deltaY: number): Promise<BrowserTab> { return await this.ctx.browser.scroll(tabId, 0, deltaY) }
  /**
   * Close an isolated browser tab.
   * @param tabId - target tab.
   * @returns completion after the tab closes.
   */
  @Remote('close') async close(tabId: BrowserTabId): Promise<void> { await this.ctx.browser.close(tabId) }
}
