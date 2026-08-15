import { afterEach, describe, expect, it } from 'vitest'
import { PlaywrightBrowserProvider, resolveConfig } from '@deepseek-ai/dsh-browser-playwright-local'

const providers: PlaywrightBrowserProvider[] = []

function provider(blockedHosts: readonly string[] = []) {
  const instance = new PlaywrightBrowserProvider({
    blockedHosts,
    headless: true,
    actionTimeoutMs: 10_000,
    maxSnapshotChars: 20_000,
    viewportWidth: 800,
    viewportHeight: 600,
    ...process.platform === 'win32' ? { channel: 'msedge' } : {},
  })
  providers.push(instance)
  return instance
}

afterEach(async () => {
  await Promise.all(providers.splice(0).map(provider => provider.dispose()))
})

describe('PlaywrightBrowserProvider', () => {
  it('defaults to an empty blacklist and rejects malformed entries', () => {
    expect(resolveConfig({})).toMatchObject({ blockedHosts: [] })
    expect(() => resolveConfig({ blockedHosts: ['https://example.com'] })).toThrow('exact non-empty hostnames')
    expect(() => resolveConfig({ blockedHosts: ['EXAMPLE.com', 'example.com'] })).toThrow('duplicate hostnames')
  })

  it('opens a page, assigns interactive node ids, fills, clicks, and closes the tab', async () => {
    const browser = provider()
    const page = await browser.open('data:text/html,<input aria-label="Name"><button onpointermove="document.title=\'pointer moved\'" onclick="document.title+=\' clicked\'">Go</button>')
    const snapshot = await browser.snapshot(page.id)
    expect(snapshot.text).toContain('[node=1] input "Name"')
    expect(snapshot.text).toContain('[node=2] button "Go"')
    await browser.fill(page.id, '1', 'Ada')
    expect((await browser.click(page.id, '2')).title).toBe('pointer moved clicked')
    expect(await browser.tabs()).toHaveLength(1)
    await browser.close(page.id)
    await expect(browser.snapshot(page.id)).rejects.toThrow(expect.objectContaining({ code: 'BROWSER_TAB_NOT_FOUND' }))
  })

  it('blocks navigation to a configured hostname', async () => {
    const browser = provider(['example.com'])
    await expect(browser.open('https://example.com')).rejects.toThrow(expect.objectContaining({ code: 'BROWSER_URL_BLOCKED' }))
  })

  it('truncates complete snapshots at the configured character cap', async () => {
    const browser = new PlaywrightBrowserProvider({
      blockedHosts: [],
      headless: true,
      actionTimeoutMs: 10_000,
      maxSnapshotChars: 100,
      viewportWidth: 800,
      viewportHeight: 600,
      ...process.platform === 'win32' ? { channel: 'msedge' } : {},
    })
    providers.push(browser)
    const page = await browser.open(`data:text/html,<p>${'x'.repeat(500)}</p>`)
    const snapshot = await browser.snapshot(page.id)
    expect(snapshot.text).toHaveLength(100)
    expect(snapshot.truncated).toBe(true)
  })
})
