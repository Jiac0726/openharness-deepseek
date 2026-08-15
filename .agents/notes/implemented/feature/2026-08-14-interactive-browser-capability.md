# Agent Note: Interactive browser capability

Status: implemented

English | [中文](2026-08-14-interactive-browser-capability.zh.md)

## Problem

Web search and HTTP fetch cannot operate an interactive application, inspect its live controls, or verify state after user-interface actions. Binding a model-facing tool directly to Playwright would also make browser process ownership, provider replacement, and navigation policy part of one consumer package.

## Decision

Interactive browser automation is a separate `ctx.browser` capability with Service Definition, Service Provider, and Consumer packages. `dsh-browser` owns branded tab identities, provider selection, operation contracts, and shared errors. `dsh-browser-playwright-local` owns an isolated Chromium context, tab lifecycle, DOM-derived snapshots, and request host filtering. `dsh-tool-browser` owns one discriminated model tool whose actions call the service.

The capability is installed but disabled in `dsh-base`. A profile or `--patch` overlay enables the service, provider, and tool together and supplies `blockedHosts`. The list contains exact hostnames to reject; an empty list permits all HTTP and HTTPS hostnames. The browser-control card exposes the same setting only when the provider is composed and the Host serves its namespace.

Snapshot node ids are ephemeral. The Playwright provider marks visible interactive elements during a snapshot and resolves later node operations against those marks. An interaction or navigation requires another snapshot before the model selects a new element.

## Alternatives considered

**Extend `ctx.web`.** Search and fetch return stateless resources, while interactive tabs are live resources with process ownership and teardown. Combining them would make provider selection and result types serve unrelated lifecycles.

**Expose Playwright directly from the tool package.** This removes the replaceable provider role and prevents a later CDP, remote-browser, or Computer Use implementation from retaining the model contract.

**Reuse the Codex Desktop browser client.** That client belongs to the Codex application runtime and is not a public DeepSeek Harness dependency. The capability reproduces the portable operation model through Playwright instead.

## Consequences

DeepSeek Harness agents can inspect and operate browser pages not blocked by the configured host list through ordinary logged tool calls, and Code Mode receives the same tool automatically. Browser state is process-local and disappears when the provider fiber is disposed. The first version does not persist authenticated profiles, screenshots, or downloads; adding those requires durable attachment and presentation decisions rather than expanding snapshot text without bounds.
