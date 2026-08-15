/** Opaque identifiers used by the interactive browser capability. */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Opaque identity of one live browser tab. */
export type BrowserTabId = Branded<'BrowserTabId'>

/**
 * Construct a browser tab id at the provider boundary.
 * @param value - provider-owned raw identifier.
 * @returns the opaque browser tab identifier.
 */
export const browserTabId = (value: string): BrowserTabId => value as BrowserTabId
