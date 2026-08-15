/** Provider-neutral vocabulary for interactive browser automation. */

import type { BrowserTabId } from './brand.ts'

/** Public metadata for one live browser tab. */
export interface BrowserTab {
  readonly id: BrowserTabId
  readonly title: string
  readonly url: string
}

/** Bounded DOM-derived state returned to an automation consumer. */
export interface BrowserSnapshot {
  readonly tab: BrowserTab
  readonly text: string
  readonly truncated: boolean
}

/** Provider implementation registered with {@link BrowserRuntime}. */
export interface BrowserProvider {
  readonly id: string
  /** Cheap local usability check with no browser launch or network access. */
  available(): boolean
  /** Create a tab and optionally navigate it. */
  open(url: string | undefined, signal?: AbortSignal): Promise<BrowserTab>
  /** Return all tabs owned by this provider. */
  tabs(signal?: AbortSignal): Promise<readonly BrowserTab[]>
  /** Navigate one tab to a permitted URL. */
  navigate(tabId: BrowserTabId, url: string, signal?: AbortSignal): Promise<BrowserTab>
  /** Capture bounded visible text and stable ids for interactive elements. */
  snapshot(tabId: BrowserTabId, signal?: AbortSignal): Promise<BrowserSnapshot>
  /** Click the interactive element assigned by the latest snapshot. */
  click(tabId: BrowserTabId, nodeId: string, signal?: AbortSignal): Promise<BrowserTab>
  /** Replace the value of an editable element assigned by the latest snapshot. */
  fill(tabId: BrowserTabId, nodeId: string, value: string, signal?: AbortSignal): Promise<BrowserTab>
  /** Send one keyboard key or chord to a tab. */
  press(tabId: BrowserTabId, key: string, signal?: AbortSignal): Promise<BrowserTab>
  /** Scroll a tab by viewport pixel deltas. */
  scroll(tabId: BrowserTabId, deltaX: number, deltaY: number, signal?: AbortSignal): Promise<BrowserTab>
  /** Close one tab. */
  close(tabId: BrowserTabId, signal?: AbortSignal): Promise<void>
  /** Release every provider-owned browser resource. */
  dispose(): Promise<void>
}
