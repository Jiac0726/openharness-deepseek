# @deepseek-ai/dsh-tool-browser

English | [中文](README.zh.md)

Model-facing Consumer for interactive browser automation. It registers one `browser` tool with discriminated actions for tab creation, navigation, bounded DOM snapshots, interaction, scrolling, keyboard input, listing, and cleanup.

Call `snapshot` before node-based actions. Snapshot node ids are provider-owned ephemeral handles and must not be reused after the page changes.

## Model Experience

### Browser tool schema and results

#### What the model sees

The [`browser`](../../../docs/tool-catalog.md#deepseek-aidsh-tool-browser) schema plus bounded visible page text, interactive node ids, tab metadata, and operation failures.

#### Token effect

The tool schema is a fixed request-prefix contribution while the tool is mounted. Snapshot results add up to the provider's configured `maxSnapshotChars`; other results contain bounded tab metadata.

#### KV Cache effect

Mounting, removing, or changing the tool definition changes the request prefix. Individual results append to the session log without changing an already-reusable earlier prefix.

## Known Limitations and Deferred Work

- **One generic UI card** — browser-specific call and result cards are deferred.
- **No screenshot action** — image attachment persistence and replay-safe presentation are deferred to a later capability revision.
