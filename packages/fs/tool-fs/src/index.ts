/**
 * Model-facing read, read_image, write, and edit tools over `ctx.fs`. This package owns schemas, validation,
 * read windows, formatting, and observation events, never a concrete provider. An optional
 * event policy supplies mutation guards; without one the tools use unconditional provider calls.
 * @module @deepseek-ai/dsh-tool-fs
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-user-approval'
import { applyReadTool, READ_LIMIT, STREAM_MIN_SIZE } from './read.ts'
import { applyWriteTool } from './write.ts'
import { applyEditTool } from './edit.ts'
import { applyReadImageTool } from './read-image.ts'
import { applyAnalyzeImageTool } from './analyze-image.ts'
import type { QwenImageAnalysisOptions } from './analyze-image.ts'
import { READ_MAX_BYTES, READ_MAX_LINE_LENGTH } from './read-render.ts'
import { FsSandboxController } from './sandbox.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-fs'

/** Default DashScope-compatible endpoint for the installed Qwen-VL skill. */
const DEFAULT_QWEN_IMAGE_ANALYSIS_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
/** Default environment variable holding the installed skill's DashScope key. */
const DEFAULT_QWEN_IMAGE_ANALYSIS_API_KEY_ENV = 'DASHSCOPE_API_KEY'
/** Default Qwen-VL model selected by the installed image-analysis skill. */
const DEFAULT_QWEN_IMAGE_ANALYSIS_MODEL = 'qwen-vl-max'

/** Services required by the filesystem tool suite. */
export const inject = ['tools', 'fs', 'systemPrompt']

/** Plugin config (all optional — `Config` supplies the defaults). */
export interface Config {
  /** Default and maximum number of lines returned by one `read` call. */
  readLimit?: number
  /** Maximum characters returned for a single line before truncation. */
  readMaxLineLength?: number
  /** Maximum bytes returned for the selected lines of one `read` call. */
  readMaxBytes?: number
  /** Files at or above this size stream instead of loading whole into memory. */
  readStreamMinSize?: number
  /** Environment variable holding the DashScope key used by `analyze_image`. */
  qwenImageAnalysisApiKeyEnv?: string
  /** DashScope-compatible API root used by `analyze_image`. */
  qwenImageAnalysisBaseUrl?: string
  /** Qwen-VL model selected by `analyze_image` when its call omits `model`. */
  qwenImageAnalysisModel?: string
}

export const Config: z<Config> = z.object({
  readLimit: z.number().default(READ_LIMIT),
  readMaxLineLength: z.number().default(READ_MAX_LINE_LENGTH),
  readMaxBytes: z.number().default(READ_MAX_BYTES),
  readStreamMinSize: z.number().default(STREAM_MIN_SIZE),
  qwenImageAnalysisApiKeyEnv: z.string().default(DEFAULT_QWEN_IMAGE_ANALYSIS_API_KEY_ENV),
  qwenImageAnalysisBaseUrl: z.string().default(DEFAULT_QWEN_IMAGE_ANALYSIS_BASE_URL),
  qwenImageAnalysisModel: z.string().default(DEFAULT_QWEN_IMAGE_ANALYSIS_MODEL),
})

/** The shape after schemastery applied the defaults. */
type ResolvedConfig = Required<Config>

/** Every read cap counts lines/chars/bytes — a positive integer, or windowing arithmetic misbehaves silently. */
function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`tool-fs: ${name} must be a positive integer`)
  }
}

/** Reject a blank service endpoint, model, or environment-variable name at load time. */
function assertNonBlank(name: string, value: string): void {
  if (value.trim() === '') throw new Error(`tool-fs: ${name} must not be blank`)
}

/** Register the full `read`/`write`/`edit` filesystem tool suite, plus `read_image` while `attachments` is mounted. */
export function apply(ctx: Context, config: Config): void {
  // schemastery (Config) has already filled every defaulted field.
  const resolved = config as ResolvedConfig
  assertPositiveInteger('readLimit', resolved.readLimit)
  assertPositiveInteger('readMaxLineLength', resolved.readMaxLineLength)
  assertPositiveInteger('readMaxBytes', resolved.readMaxBytes)
  assertPositiveInteger('readStreamMinSize', resolved.readStreamMinSize)
  assertNonBlank('qwenImageAnalysisApiKeyEnv', resolved.qwenImageAnalysisApiKeyEnv)
  assertNonBlank('qwenImageAnalysisBaseUrl', resolved.qwenImageAnalysisBaseUrl)
  assertNonBlank('qwenImageAnalysisModel', resolved.qwenImageAnalysisModel)
  applyReadTool(ctx, {
    limit: resolved.readLimit,
    maxLineLength: resolved.readMaxLineLength,
    maxBytes: resolved.readMaxBytes,
    streamMinSize: resolved.readStreamMinSize,
  })
  // read_image is composition-conditional: without a mounted attachment store
  // the deployment cannot durably commit image bytes, so the tool never
  // registers; the execute body keeps a defensive re-check for direct callers.
  ctx.inject(['attachments'], (imageCtx) => {
    applyReadImageTool(imageCtx)
    const qwen: QwenImageAnalysisOptions = {
      apiKeyEnv: resolved.qwenImageAnalysisApiKeyEnv,
      baseUrl: resolved.qwenImageAnalysisBaseUrl,
      model: resolved.qwenImageAnalysisModel,
    }
    applyAnalyzeImageTool(imageCtx, qwen)
  })
  // One escalation API shared by both mutating tools: advertisement gating,
  // per-call policy resolution, and denial-marker mapping, all keyed off whether
  // the mounted ctx.fs confines (ctx.fs.sandboxMode).
  const sandbox = new FsSandboxController(ctx)
  applyWriteTool(ctx, sandbox)
  applyEditTool(ctx, sandbox)
}
