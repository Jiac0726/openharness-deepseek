#!/usr/bin/env python3
"""Call DashScope's OpenAI-compatible Qwen-VL endpoint for local images."""

import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DEFAULT_MODEL = "qwen-vl-max"
DEFAULT_PROMPT = "请详细描述这张图片的内容。"


def image_to_data_url(path: str) -> str:
    """Convert a local image into a data URL accepted by the API."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"图片不存在: {path}")
    mime, _ = mimetypes.guess_type(path)
    with open(path, "rb") as handle:
        encoded = base64.b64encode(handle.read()).decode("utf-8")
    return f"data:{mime or 'image/png'};base64,{encoded}"


def call_qwen_vl(api_key: str, base_url: str, images: list[str], prompt: str, model: str, temperature: float) -> str:
    """Send image and text content to Qwen-VL and return its answer."""
    content = [{"type": "image_url", "image_url": {"url": image_to_data_url(image)}} for image in images]
    content.append({"type": "text", "text": prompt})
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps({"model": model, "messages": [{"role": "user", "content": content}], "temperature": temperature}).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"API 调用失败 HTTP {error.code}: {error.read().decode('utf-8', errors='replace')}") from error
    try:
        return result["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as error:
        raise RuntimeError(f"响应格式异常: {json.dumps(result, ensure_ascii=False)}") from error


def main() -> int:
    """Parse arguments and print Qwen-VL's response."""
    parser = argparse.ArgumentParser(description="Qwen-VL 多模态图片分析")
    parser.add_argument("images", nargs="+", help="图片文件路径")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--temperature", type=float, default=0.7)
    args = parser.parse_args()
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        print("错误: 未设置环境变量 DASHSCOPE_API_KEY。", file=sys.stderr)
        return 1
    try:
        base_url = os.environ.get("DASHSCOPE_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        print(call_qwen_vl(api_key, base_url, args.images, args.prompt, args.model, args.temperature))
    except (FileNotFoundError, RuntimeError) as error:
        print(f"错误: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
