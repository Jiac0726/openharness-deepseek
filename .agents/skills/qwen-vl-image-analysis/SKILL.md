---
name: "qwen-vl-image-analysis"
description: "调用阿里云百炼 Qwen-VL 多模态大模型分析用户发送的图片（图像描述、视觉问答、OCR、物体定位等）。需要环境变量 DASHSCOPE_API_KEY。"
---

# Qwen-VL 图片分析

当用户发送图片，或要求分析、描述、识别、OCR、提取表格/公式、定位或计数图片中的对象时，使用本 Skill。

## 前提条件

1. 环境变量 `DASHSCOPE_API_KEY` 已设置。
2. 本机可运行 Python 3；脚本只依赖标准库。

此 Skill 将图片内容发送到阿里云百炼 DashScope API。未设置 API Key 时，告知用户配置密钥，不要尝试调用。

## 使用

从用户消息获得图片完整路径。未说明意图时使用提示词“请详细描述这张图片的内容。”；否则使用用户原话。

当会话提供 `<qwen_image_attachment>` 时，不要访问文件路径或环境变量。调用 `analyze_image`，将该 JSON 对象作为 `attachment`、把用户意图作为 `prompt`；Host 会安全读取附件并调用 Qwen-VL。

可传入多张图片，并可用 `--model`（默认 `qwen-vl-max`）或 `--temperature` 调整调用。返回标准输出；错误时说明错误但不得泄露 API Key。
