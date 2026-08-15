import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import BrowserRuntime, { BrowserError, browserTabId } from '@deepseek-ai/dsh-browser'
import type { BrowserProvider, BrowserTab } from '@deepseek-ai/dsh-browser'

function provider(id: string, usable = true): BrowserProvider {
  const tab: BrowserTab = { id: browserTabId('tab-1'), title: 'Test', url: 'about:blank' }
  return {
    id,
    available: () => usable,
    open: () => Promise.resolve(tab),
    tabs: () => Promise.resolve([tab]),
    navigate: (_tabId, url) => Promise.resolve({ ...tab, url }),
    snapshot: () => Promise.resolve({ tab, text: 'snapshot', truncated: false }),
    click: () => Promise.resolve(tab),
    fill: () => Promise.resolve(tab),
    press: () => Promise.resolve(tab),
    scroll: () => Promise.resolve(tab),
    close: () => Promise.resolve(),
    dispose: () => Promise.resolve(),
  }
}

async function mount(config: ConstructorParameters<typeof BrowserRuntime>[1] = {}) {
  const ctx = new Context()
  await ctx.plugin(BrowserRuntime, config)
  return { ctx, browser: ctx.browser }
}

describe('BrowserRuntime', () => {
  it('auto-selects one provider and forwards operations', async () => {
    const { browser } = await mount()
    browser.registerProvider(provider('local'))
    await expect(browser.open()).resolves.toMatchObject({ id: 'tab-1' })
    await expect(browser.navigate(browserTabId('tab-1'), 'https://example.test')).resolves.toMatchObject({ url: 'https://example.test' })
    await expect(browser.snapshot(browserTabId('tab-1'))).resolves.toMatchObject({ text: 'snapshot' })
  })

  it('rejects missing, unusable, ambiguous, and duplicate providers', async () => {
    const missing = await mount({ provider: 'missing' })
    await expect(missing.browser.open()).rejects.toThrow(expect.objectContaining({ code: 'BROWSER_PROVIDER_CONFIGURED_MISSING' }))
    const unavailable = await mount({ provider: 'local' })
    unavailable.browser.registerProvider(provider('local', false))
    await expect(unavailable.browser.open()).rejects.toThrow(expect.objectContaining({ code: 'BROWSER_PROVIDER_CONFIGURED_UNAVAILABLE' }))
    const ambiguous = await mount()
    ambiguous.browser.registerProvider(provider('a'))
    ambiguous.browser.registerProvider(provider('b'))
    await expect(ambiguous.browser.open()).rejects.toThrow(expect.objectContaining({ code: 'BROWSER_PROVIDER_AMBIGUOUS' }))
    expect(() => ambiguous.browser.registerProvider(provider('a'))).toThrow(expect.objectContaining({ code: 'BROWSER_DUPLICATE_PROVIDER' }))
  })

  it('unregisters and disposes a provider with its contributing fiber', async () => {
    const { ctx, browser } = await mount()
    let disposed = false
    const mounted = { ...provider('local'), dispose: () => { disposed = true; return Promise.resolve() } }
    const fiber = await ctx.plugin(Object.assign((inner: Context) => {
      inner.browser.registerProvider(mounted)
    }, { inject: ['browser'] }))
    await expect(browser.open()).resolves.toBeDefined()
    await fiber.dispose()
    expect(disposed).toBe(true)
    await expect(browser.open()).rejects.toThrow(expect.objectContaining({ code: 'BROWSER_PROVIDER_UNAVAILABLE' }))
  })

  it('BrowserError retains its machine code', () => {
    expect(new BrowserError('boom', 'BROWSER_FAILURE').code).toBe('BROWSER_FAILURE')
  })
})
