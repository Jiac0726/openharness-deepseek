/** Qwen-VL analysis tool for durable image attachments. */

import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'

const ATTACHMENT_OPEN = '<qwen_image_attachment>'
const ATTACHMENT_CLOSE = '</qwen_image_attachment>'

/** Deployment-selected credentials and endpoint for Qwen-VL analysis. */
export interface QwenImageAnalysisOptions {
  /** Environment variable that contains the DashScope API key. */
  readonly apiKeyEnv: string
  /** DashScope-compatible API root, without the `/chat/completions` suffix. */
  readonly baseUrl: string
  /** Qwen-VL model used unless a tool call explicitly selects another one. */
  readonly model: string
}

/** Extract the host-generated attachment declaration from one fallback text block. */
function fallbackAttachmentIn(text: string): ImageAttachmentRef | undefined {
  if (!text.startsWith(ATTACHMENT_OPEN)) return undefined
  const close = text.indexOf(ATTACHMENT_CLOSE, ATTACHMENT_OPEN.length)
  if (close === -1) return undefined
  try {
    const value: unknown = JSON.parse(text.slice(ATTACHMENT_OPEN.length, close))
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    const ref = value as Partial<ImageAttachmentRef>
    if (
      typeof ref.attachmentId !== 'string'
      || typeof ref.mediaType !== 'string'
      || !Number.isInteger(ref.bytes)
      || !Number.isInteger(ref.width)
      || !Number.isInteger(ref.height)
      || (ref.name !== undefined && typeof ref.name !== 'string')
    ) return undefined
    return ref as ImageAttachmentRef
  } catch {
    // User-authored text can resemble the marker. It never authorizes an attachment.
    return undefined
  }
}

/**
 * Match a tool argument to an attachment declaration recorded in the calling
 * session. This keeps the model from using the attachment service as an
 * arbitrary object reader.
 * @param input - attachment reference supplied to the tool.
 * @param exec - current tool execution and calling session.
 * @returns the matching durable attachment reference.
 */
export function announcedImageAttachment(input: ImageAttachmentRef, exec: ToolExecution): ImageAttachmentRef {
  if (exec.agent === undefined) throw new Error('analyze_image requires a calling agent')
  for (const message of exec.agent.session.deriveMessages()) {
    for (const block of message.content) {
      if (block.type !== 'text') continue
      const ref = fallbackAttachmentIn(block.text)
      if (
        ref !== undefined
        && ref.attachmentId === input.attachmentId
        && ref.mediaType === input.mediaType
        && ref.bytes === input.bytes
        && ref.width === input.width
        && ref.height === input.height
        && ref.name === input.name
      ) return ref
    }
  }
  throw new Error('attachment must be a Qwen-VL fallback image declared in the current conversation')
}

/**
 * Register the Qwen-VL image analysis tool.
 * @param ctx - tool runtime and attachment store.
 * @param options - Qwen endpoint and model settings.
 */
export function applyAnalyzeImageTool(ctx: Context, options: QwenImageAnalysisOptions): void {
  ctx.tools.register(defineTool({
    name: 'analyze_image',
    description: 'Analyze a user-uploaded image with Qwen-VL. Load the qwen-vl-image-analysis skill before using this tool. The attachment must be one announced in the current conversation.',
    parameters: {
      attachment: {
        type: 'object', required: true, additionalProperties: false,
        properties: {
          attachmentId: { type: 'string', required: true }, mediaType: { type: 'string', required: true },
          bytes: { type: 'integer', required: true }, width: { type: 'integer', required: true }, height: { type: 'integer', required: true }, name: { type: 'string' },
        },
      },
      prompt: { type: 'string', required: true, description: 'Question or analysis instruction for the image.' },
      model: { type: 'string', description: 'Optional Qwen-VL model; defaults to qwen-vl-max.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { analysis: { type: 'string', required: true } } },
      render: (_args, value) => [{ type: 'text', text: value.analysis }],
    },
    async execute(args, exec) {
      const attachment = args.attachment as ImageAttachmentRef
      if (!String(attachment.attachmentId).startsWith('sha256:')) throw new Error('attachment.attachmentId must be an announced sha256 attachment id')
      if (args.prompt.trim() === '') throw new Error('prompt must not be empty')
      const announced = announcedImageAttachment(attachment, exec)
      const key = process.env[options.apiKeyEnv]
      if (key === undefined || key === '') throw new Error(`${options.apiKeyEnv} is not configured; configure it before using Qwen-VL image analysis`)
      const stored = await ctx.attachments.readImage({
        ...announced,
        attachmentId: AttachmentId(String(announced.attachmentId)),
      }, exec.signal)
      const image = `data:${stored.ref.mediaType};base64,${Buffer.from(stored.data).toString('base64')}`
      const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', signal: exec.signal,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: args.model?.trim() || options.model, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: args.prompt }] }] }),
      })
      if (!response.ok) throw new Error(`DashScope image analysis failed: HTTP ${response.status}`)
      const body = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
      const analysis = body.choices?.[0]?.message?.content
      if (typeof analysis !== 'string' || analysis === '') throw new Error('DashScope image analysis returned no text result')
      return { analysis }
    },
    presentCall: () => ({ card: 'generic', title: 'Analyze image with Qwen-VL', kind: 'read' }),
  }))
}
