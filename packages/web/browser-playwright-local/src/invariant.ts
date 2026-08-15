/** Package-owned invariant companion for `@deepseek-ai/dsh-browser-playwright-local`. */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-browser-playwright-local'
export const name = 'browser-playwright-local-invariant'
export const inject = ['invariants']
/** No runtime invariant: Playwright owns process/page state and the provider validates every lookup. */
const install: InvariantInstaller = () => {}
/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
