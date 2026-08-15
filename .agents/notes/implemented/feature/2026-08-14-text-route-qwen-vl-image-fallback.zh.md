# Agent Note: Text-route Qwen-VL image fallback

Status: implemented

[English](2026-08-14-text-route-qwen-vl-image-fallback.md) | 中文

## Problem

当选中的 Web 路由未明确声明支持图片输入时，带图片的提示词无法继续。拒绝提示词能保持该路由的原生请求格式，却会要求用户切换模型，即使已安装的 Qwen-VL Skill（技能）能够分析同一附件。

## Decision

Web Host（宿主）在创建持久用户消息前验证并保存获准图片。若路由未明确声明支持图片输入，它会记录包含持久附件元数据的文本声明，并指示模型加载 `qwen-vl-image-analysis` 后调用 `analyze_image`；该消息不含 `ImageBlock`，因此纯文本路由可以继续。这扩展了[Web 多模态图片输入 Note](2026-07-22-web-multimodal-image-input-and-durable-attachments.md)中的宿主准入规则。

`@deepseek-ai/dsh-tool-fs` 会随附件服务注册 `analyze_image`。该工具只接受与调用会话中回退声明精确匹配的元数据，重新读取已验证的附件字节，将其发送到配置的 DashScope 兼容端点，并只返回 Qwen-VL 的文字结果。端点、API Key 环境变量名和默认模型都是经过校验的 `tool-fs` 配置字段。

## Alternatives considered

**对每个纯文本路由都拒绝上传。** 这能保持路由纯粹，却会让已配置的图片分析能力不可用，并要求不必要的模型切换。

**在纯文本路由历史中放入原生图片块。** 下一次模型请求仍会包含不受支持的多模态内容，因此回退必须是持久文本。

**向模型暴露文件路径或 API Key。** 路径会让模型绕过附件授权，密钥则绝不能进入模型可见或会话内容。由 Host 持有的附件服务和配置的环境变量会使二者保持私有。

## Consequences

未明确具备图片能力的路由会收到图片提示词的明确且可回放恢复路径。使用该路径会把选定图片发送给 DashScope，因而需要 `DASHSCOPE_API_KEY` 或配置的替代变量；缺少密钥会成为模型可见的工具错误。适配器必须明确声明图片输入能力，才能接收原生图片块。

## Verification

`api-proxy-models.spec.ts` 覆盖纯文本路由和未声明能力路由的持久回退准入。`analyze-image.spec.ts` 覆盖会话范围的附件匹配、配置的 DashScope 请求和仅文字的结果投影。
