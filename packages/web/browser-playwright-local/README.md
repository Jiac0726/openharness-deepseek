# @deepseek-ai/dsh-browser-playwright-local

English | [中文](README.zh.md)

Local Playwright provider for `ctx.browser`. It launches an isolated Chromium context lazily, owns its tabs, blocks downloads and service workers, and rejects every network request whose hostname occurs in `blockedHosts`. Clicks move and press Playwright's browser-local virtual pointer, never the host operating system pointer.

Install the bundled browser once with `pnpm exec playwright install chromium`. A deployment may instead configure `executablePath` or an installed `channel`.

## Configuration

`blockedHosts` defaults to an empty list, which permits every HTTP and HTTPS hostname. Each entry is one exact hostname; URL paths and wildcards are invalid. `headless`, `actionTimeoutMs`, `maxSnapshotChars`, `viewportWidth`, and `viewportHeight` have bounded operational defaults. `executablePath` and `channel` are mutually exclusive.

## Model Experience

Indirectly, through `dsh-tool-browser`, which renders this provider's bounded snapshots and operation outcomes.

#### KV Cache effect

No direct invalidation; the named consumer owns request-prefix changes.

## Known Limitations and Deferred Work

- **No persistent authenticated profile** — each provider lifetime uses a fresh isolated browser context.
- **Abort is checked between Playwright operations** — an already-running Playwright action is bounded by `actionTimeoutMs` but is not interrupted by a later abort signal.
- **No screenshot result** — the first provider surface exposes DOM-derived snapshots; image attachment storage is deferred.
