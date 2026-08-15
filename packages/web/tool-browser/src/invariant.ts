/** Package-owned invariant companion for `@deepseek-ai/dsh-tool-browser`. */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-tool-browser'
export const name = 'tool-browser-invariant'
export const inject = ['invariants']
/** No runtime invariant: the tool has no independent lifecycle state outside the browser seam. */
const install: InvariantInstaller = () => {}
/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
