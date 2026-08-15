/**
 * Service Definition for the interactive browser capability seam (`ctx.browser`).
 * @module @deepseek-ai/dsh-browser
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { BrowserTabId } from './brand.ts'
import { BrowserError } from './error.ts'
import type { BrowserProvider, BrowserSnapshot, BrowserTab } from './types.ts'

export { browserTabId } from './brand.ts'
export { BrowserError } from './error.ts'
export type { BrowserTabId } from './brand.ts'
export type { BrowserProvider, BrowserSnapshot, BrowserTab } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    browser: BrowserRuntime
  }
}

/** Browser provider selection config. */
export interface BrowserRuntimeConfig {
  /** Explicit provider id; omitted only when exactly one usable provider is mounted. */
  readonly provider?: string
}

/** Provider-neutral interactive browser runtime. */
export class BrowserRuntime extends Service {
  /** Runtime configuration schema. */
  static Config: z<BrowserRuntimeConfig> = z.object({ provider: z.string() })

  private readonly providers = new Map<string, BrowserProvider>()
  private readonly providerId: string | undefined

  constructor(ctx: Context, config: BrowserRuntimeConfig = {}) {
    super(ctx, 'browser')
    this.providerId = config.provider
  }

  /**
   * Register a provider and bind its cleanup to the contributing fiber.
   * @param provider - provider implementation keyed by its stable id.
   * @returns a disposer that unregisters and releases the provider.
   */
  registerProvider(provider: BrowserProvider): () => void {
    if (this.providers.has(provider.id)) {
      throw new BrowserError(`a browser provider with id "${provider.id}" is already registered`, 'BROWSER_DUPLICATE_PROVIDER')
    }
    const providers = this.providers
    const dispose = this.ctx.effect(function* () {
      providers.set(provider.id, provider)
      yield async () => {
        providers.delete(provider.id)
        await provider.dispose()
      }
    }, 'browser.registerProvider()')
    return () => void dispose()
  }

  /**
   * Create a tab and optionally navigate it.
   * @param url - initial URL; omitted to open a blank tab.
   * @param signal - optional caller cancellation signal.
   * @returns the created tab metadata.
   */
  async open(url?: string, signal?: AbortSignal): Promise<BrowserTab> {
    return await this.resolveProvider().open(url, signal)
  }

  /**
   * List provider-owned tabs.
   * @param signal - optional caller cancellation signal.
   * @returns metadata for every live tab.
   */
  async tabs(signal?: AbortSignal): Promise<readonly BrowserTab[]> {
    return await this.resolveProvider().tabs(signal)
  }

  /**
   * Navigate one tab.
   * @param tabId - provider-owned tab identifier.
   * @param url - destination URL.
   * @param signal - optional caller cancellation signal.
   * @returns updated tab metadata.
   */
  async navigate(tabId: BrowserTabId, url: string, signal?: AbortSignal): Promise<BrowserTab> {
    return await this.resolveProvider().navigate(tabId, url, signal)
  }

  /**
   * Capture bounded page state.
   * @param tabId - provider-owned tab identifier.
   * @param signal - optional caller cancellation signal.
   * @returns visible text and numbered interactive nodes.
   */
  async snapshot(tabId: BrowserTabId, signal?: AbortSignal): Promise<BrowserSnapshot> {
    return await this.resolveProvider().snapshot(tabId, signal)
  }

  /**
   * Click a snapshot-assigned node.
   * @param tabId - provider-owned tab identifier.
   * @param nodeId - node id from the latest snapshot.
   * @param signal - optional caller cancellation signal.
   * @returns updated tab metadata.
   */
  async click(tabId: BrowserTabId, nodeId: string, signal?: AbortSignal): Promise<BrowserTab> {
    return await this.resolveProvider().click(tabId, nodeId, signal)
  }

  /**
   * Fill a snapshot-assigned node.
   * @param tabId - provider-owned tab identifier.
   * @param nodeId - node id from the latest snapshot.
   * @param value - replacement field value.
   * @param signal - optional caller cancellation signal.
   * @returns updated tab metadata.
   */
  async fill(tabId: BrowserTabId, nodeId: string, value: string, signal?: AbortSignal): Promise<BrowserTab> {
    return await this.resolveProvider().fill(tabId, nodeId, value, signal)
  }

  /**
   * Send one keyboard key or chord.
   * @param tabId - provider-owned tab identifier.
   * @param key - Playwright-compatible key or chord.
   * @param signal - optional caller cancellation signal.
   * @returns updated tab metadata.
   */
  async press(tabId: BrowserTabId, key: string, signal?: AbortSignal): Promise<BrowserTab> {
    return await this.resolveProvider().press(tabId, key, signal)
  }

  /**
   * Scroll one tab.
   * @param tabId - provider-owned tab identifier.
   * @param deltaX - horizontal pixel delta.
   * @param deltaY - vertical pixel delta.
   * @param signal - optional caller cancellation signal.
   * @returns updated tab metadata.
   */
  async scroll(tabId: BrowserTabId, deltaX: number, deltaY: number, signal?: AbortSignal): Promise<BrowserTab> {
    return await this.resolveProvider().scroll(tabId, deltaX, deltaY, signal)
  }

  /**
   * Close one tab.
   * @param tabId - provider-owned tab identifier.
   * @param signal - optional caller cancellation signal.
   * @returns completion after the tab closes.
   */
  async close(tabId: BrowserTabId, signal?: AbortSignal): Promise<void> {
    await this.resolveProvider().close(tabId, signal)
  }

  private resolveProvider(): BrowserProvider {
    if (this.providerId !== undefined) {
      const provider = this.providers.get(this.providerId)
      if (provider === undefined) {
        throw new BrowserError(`configured browser provider "${this.providerId}" is not registered`, 'BROWSER_PROVIDER_CONFIGURED_MISSING')
      }
      if (!provider.available()) {
        throw new BrowserError(`configured browser provider "${this.providerId}" is unavailable`, 'BROWSER_PROVIDER_CONFIGURED_UNAVAILABLE')
      }
      return provider
    }
    const usable = [...this.providers.values()].filter(provider => provider.available())
    if (usable.length === 0) throw new BrowserError('no usable browser provider is registered', 'BROWSER_PROVIDER_UNAVAILABLE')
    if (usable.length > 1) {
      throw new BrowserError(`multiple usable browser providers are registered (${usable.map(provider => provider.id).join(', ')}); configure one explicitly`, 'BROWSER_PROVIDER_AMBIGUOUS')
    }
    return usable[0] as BrowserProvider
  }
}

export default BrowserRuntime
