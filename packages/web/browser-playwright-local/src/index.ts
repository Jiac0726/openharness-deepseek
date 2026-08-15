/** Local Playwright provider plugin for `ctx.browser`. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-browser'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { PlaywrightBrowserProvider } from './provider.ts'
import type { PlaywrightBrowserOptions } from './provider.ts'

export { PlaywrightBrowserProvider } from './provider.ts'
export type { PlaywrightBrowserOptions } from './provider.ts'
export { BrowserControlGateway } from './gateway.ts'

export const name = 'browser-playwright-local'
export const inject = ['browser']

/** Settings namespace containing the browser navigation blocklist. */
export const BROWSER_PLAYWRIGHT_LOCAL_SETTINGS_NAMESPACE = settingsNamespace('browser-playwright-local')

/** Local browser process, navigation-policy, action, and snapshot limits. */
export interface Config {
  /** Exact hostnames the browser must not navigate to or request. */
  blockedHosts?: string[]
  /** Run without a visible browser window. */
  headless?: boolean
  /** Playwright action and navigation timeout. */
  actionTimeoutMs?: number
  /** Maximum DOM snapshot characters returned to a consumer. */
  maxSnapshotChars?: number
  /** Browser viewport width. */
  viewportWidth?: number
  /** Browser viewport height. */
  viewportHeight?: number
  /** Explicit browser executable. Mutually exclusive with `channel`. */
  executablePath?: string
  /** Installed Playwright browser channel, such as `chrome` or `msedge`. */
  channel?: string
}

export const Config: z<Config> = z.object({
  blockedHosts: z.array(z.string()).default([]),
  headless: z.boolean().default(true),
  actionTimeoutMs: z.number().default(15_000),
  maxSnapshotChars: z.number().default(50_000),
  viewportWidth: z.number().default(1280),
  viewportHeight: z.number().default(720),
  executablePath: z.string(),
  channel: z.string(),
})

function positiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`browser-playwright-local: ${name} must be a positive integer`)
}

type ResolvedConfig = Required<Omit<Config, 'executablePath' | 'channel'>> & Pick<Config, 'executablePath' | 'channel'>

function normalizeBlockedHosts(value: readonly string[]): string[] {
  const hosts = value.map(host => host.trim().toLowerCase())
  if (hosts.some(host => host === '' || !/^[a-z0-9.-]+$/.test(host))) {
    throw new Error('browser-playwright-local: blockedHosts must contain exact non-empty hostnames')
  }
  if (new Set(hosts).size !== hosts.length) {
    throw new Error('browser-playwright-local: blockedHosts must not contain duplicate hostnames')
  }
  return hosts
}

/**
 * Resolve defaults and validate the configured browser policy.
 * @param config - deployment configuration before defaults are applied.
 * @returns validated configuration ready for the local provider.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const resolved = Config(config) as ResolvedConfig
  if (resolved.executablePath !== undefined && resolved.channel !== undefined) {
    throw new Error('browser-playwright-local: executablePath and channel are mutually exclusive')
  }
  positiveInteger('actionTimeoutMs', resolved.actionTimeoutMs)
  positiveInteger('maxSnapshotChars', resolved.maxSnapshotChars)
  positiveInteger('viewportWidth', resolved.viewportWidth)
  positiveInteger('viewportHeight', resolved.viewportHeight)
  return { ...resolved, blockedHosts: normalizeBlockedHosts(resolved.blockedHosts) }
}

/** Validate config and register the local provider. */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  let current: () => Config = () => resolved
  installSettingsSection(ctx, BROWSER_PLAYWRIGHT_LOCAL_SETTINGS_NAMESPACE, Config, resolved, {
    setSource: (source) => { current = source },
    onChange: () => {},
    validate: (value) => { normalizeBlockedHosts(value.blockedHosts ?? []) },
  })
  const options: PlaywrightBrowserOptions = {
    blockedHosts: () => normalizeBlockedHosts(current().blockedHosts ?? []),
    headless: resolved.headless,
    actionTimeoutMs: resolved.actionTimeoutMs,
    maxSnapshotChars: resolved.maxSnapshotChars,
    viewportWidth: resolved.viewportWidth,
    viewportHeight: resolved.viewportHeight,
    ...resolved.executablePath !== undefined ? { executablePath: resolved.executablePath } : {},
    ...resolved.channel !== undefined ? { channel: resolved.channel } : {},
  }
  ctx.inject(['browser'], (browserCtx) => {
    browserCtx.browser.registerProvider(new PlaywrightBrowserProvider(options))
  })
}

export default apply
