# Agent Note: Text-route Qwen-VL image fallback

Status: implemented

English | [中文](2026-08-14-text-route-qwen-vl-image-fallback.zh.md)

## Problem

A Web prompt with an image could not continue when the selected route did not explicitly advertise image input. Refusing the prompt preserved the route's native request format but required the user to switch models even when the installed Qwen-VL skill could analyze the same attachment.

## Decision

The Web host validates and persists an admitted image before it creates the durable user message. For a route that does not explicitly advertise image input, it records a text declaration containing the durable attachment metadata and an instruction to load `qwen-vl-image-analysis` and call `analyze_image`; the message contains no `ImageBlock`, so the text route can continue. This extends the host admission rule in the [Web multimodal image-input note](2026-07-22-web-multimodal-image-input-and-durable-attachments.md).

`@deepseek-ai/dsh-tool-fs` registers `analyze_image` with the attachment service. The tool accepts only metadata that exactly matches a fallback declaration in the calling session, re-reads the verified attachment bytes, sends them to the configured DashScope-compatible endpoint, and returns only Qwen-VL's text result. The endpoint, API-key environment-variable name, and default model are validated `tool-fs` configuration fields.

## Alternatives considered

**Reject the upload for every text-only route.** This keeps the route pure but leaves a configured image-analysis capability unavailable and requires an unnecessary model switch.

**Place a native image block in text-route history.** The next model request would still contain unsupported multimodal content, so the fallback must be durable text instead.

**Expose a file path or API key to the model.** A path would let the model bypass attachment authorization and a key must never enter model-visible or session content. The host-owned attachment service and configured environment variable keep both private.

## Consequences

Routes without an explicit image capability receive an explicit, replayable recovery path for image prompts. Using that path sends the selected image to DashScope and therefore requires `DASHSCOPE_API_KEY` or the configured replacement; a missing key becomes a model-visible tool error. An adapter must explicitly advertise image input to receive a native image block.

## Verification

`api-proxy-models.spec.ts` covers durable fallback admission for text-only and unadvertised routes. `analyze-image.spec.ts` covers session-scoped attachment matching, the configured DashScope request, and text-only result projection.
