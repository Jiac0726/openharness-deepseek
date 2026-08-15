import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import BrowserRuntime, { browserTabId } from '@deepseek-ai/dsh-browser'
import type { BrowserProvider, BrowserTab } from '@deepseek-ai/dsh-browser'
import * as ToolBrowser from '@deepseek-ai/dsh-tool-browser'

const signal = new AbortController().signal

async function mount() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(BrowserRuntime, { provider: 'stub' })
  const tab: BrowserTab = { id: browserTabId('tab-1'), title: 'Page', url: 'https://example.test' }
  const calls: string[] = []
  const provider: BrowserProvider = {
    id: 'stub',
    available: () => true,
    open: () => { calls.push('open'); return Promise.resolve(tab) },
    tabs: () => Promise.resolve([tab]),
    navigate: () => Promise.resolve(tab),
    snapshot: () => Promise.resolve({ tab, text: '[node=1] button "Go"', truncated: false }),
    click: () => { calls.push('click'); return Promise.resolve(tab) },
    fill: () => Promise.resolve(tab),
    press: () => Promise.resolve(tab),
    scroll: () => Promise.resolve(tab),
    close: () => Promise.resolve(),
    dispose: () => Promise.resolve(),
  }
  ctx.browser.registerProvider(provider)
  await ctx.plugin(ToolBrowser)
  let counter = 0
  const call = (arguments_: unknown) => ctx.tools.execute({ signal, callId: CallId(`browser-${++counter}`), name: 'browser', arguments: arguments_ })
  return { ctx, calls, call }
}

describe('browser tool', () => {
  it('opens, snapshots, and clicks through the real tool registry', async () => {
    const { calls, call } = await mount()
    expect((await call({ action: 'open' })).isError).toBe(false)
    const snapshot = await call({ action: 'snapshot', tabId: 'tab-1' })
    expect(snapshot.content).toEqual([{ type: 'text', text: '[node=1] button "Go"' }])
    expect((await call({ action: 'click', tabId: 'tab-1', nodeId: '1' })).isError).toBe(false)
    expect(calls).toEqual(['open', 'click'])
  })

  it('rejects missing action-specific arguments as structured tool errors', async () => {
    const { call } = await mount()
    const result = await call({ action: 'navigate', tabId: 'tab-1' })
    expect(result.isError).toBe(true)
    expect(result.content[0]).toMatchObject({ type: 'text' })
  })

  it('registers exactly one browser schema and has no default export', async () => {
    const { ctx } = await mount()
    expect(ctx.tools.schemas().filter(schema => schema.name === 'browser')).toHaveLength(1)
    expect('default' in ToolBrowser).toBe(false)
  })
})
