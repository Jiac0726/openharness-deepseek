# @deepseek-ai/dsh-browser

English | [中文](README.zh.md)

Provider-neutral Service Definition for interactive browser automation. `BrowserRuntime` owns provider registration and selection; providers own browser processes and tabs, while `dsh-tool-browser` owns the model-facing schema.

## Service API

`ctx.browser` exposes `open`, `tabs`, `navigate`, `snapshot`, `click`, `fill`, `press`, `scroll`, and `close`. `BrowserTabId` is opaque across package boundaries. Interactive node ids are valid only for the latest snapshot of their tab.

## Model Experience

Indirectly, through `dsh-tool-browser`, which renders bounded page state and browser operation outcomes while this registry contributes no prompt or schema itself.

#### KV Cache effect

No direct invalidation; the named consumer owns request-prefix changes.

## Known Limitations and Deferred Work

- **No provider observation surface** — provider availability is resolved only when an operation executes.
