/** Browser navigation blocklist card controller. */

import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { CardForm, hostnameListField, type CardActions, type CardFieldState, type CardShell } from './card-form.ts'

/** Namespace shared with the Host browser provider. */
export const BROWSER_PLAYWRIGHT_LOCAL_NS = 'browser-playwright-local'

/** Browser settings this client may edit. */
export interface BrowserSettings { blockedHosts?: string[] }

/** Browser card render state. */
export interface BrowserCardState extends CardShell { blockedHosts: CardFieldState }

/** Render face for the browser blocklist card. */
export interface BrowserCardFace extends CardActions { hooks: { browserCard: SnapshotStore<BrowserCardState> } }

/** Bridges the browser settings scope to the staged card form. */
export class BrowserCardController {
  private readonly form: CardForm<BrowserSettings>
  private readonly store: SnapshotStore<BrowserCardState>

  /** @param scope - browser-provider settings scope. */
  constructor(scope: SettingsScope<BrowserSettings>) {
    this.form = new CardForm(scope, [hostnameListField('blockedHosts', true)])
    this.store = this.form.bind(() => ({ ...this.form.shell(), blockedHosts: this.form.field('blockedHosts') }))
  }

  /**
   * Return render hooks and staged form actions.
   * @returns render hooks and staged form actions.
   */
  inject(): BrowserCardFace { return { hooks: { browserCard: this.store }, ...this.form.actions() } }
}
