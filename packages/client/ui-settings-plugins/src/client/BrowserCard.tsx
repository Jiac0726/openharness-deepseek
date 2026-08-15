/** Browser navigation blocklist settings card. */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { TextareaField } from './fields.tsx'
import { PluginCard } from './PluginCard.tsx'
import type { BrowserCardFace } from './browser-card-controller.ts'
import type {} from './slot-contract.ts'

/** Props bound for the browser settings card. */
export type BrowserCardProps = PropsRuntime<'settings.plugin.item'> & PropsLocale<'settings.plugins'> & InjectFace<BrowserCardFace>

/** Render browser navigation policy settings. */
export function BrowserCard(props: BrowserCardProps) {
  const state = props.useBrowserCard(snapshot => snapshot)
  return <PluginCard t={props.t} titleKey="browserTitle" descriptionKey="browserDescription" state={state} onSave={props.save} onDiscard={props.discard}>
    <TextareaField id="plugin-config-browser-blocked-hosts" label={props.t('browserBlockedHosts')} hint={props.t('browserBlockedHostsHint')} placeholder="tracker.example\nads.example" overriddenLabel={props.t('overridden')} resetLabel={props.t('reset')} invalidLabel={props.t('browserBlockedHostsInvalid')} disabled={!state.writable} {...state.blockedHosts} onEdit={(text) => { props.edit('blockedHosts', text) }} onReset={() => { props.resetField('blockedHosts') }} />
  </PluginCard>
}
