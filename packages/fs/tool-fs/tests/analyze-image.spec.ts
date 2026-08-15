/** Qwen-VL fallback attachment authorization and external result projection. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import LocalAttachmentStore from '@deepseek-ai/dsh-attachment-local'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import * as FsPolicy from '@deepseek-ai/dsh-fs-observation-policy'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import * as ToolFs from '@deepseek-ai/dsh-tool-fs'
import { announcedImageAttachment } from '../src/analyze-image.ts'

/** A valid 1×1 PNG that the local attachment store accepts. */
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')
const API_KEY_ENV = 'DSH_TOOL_FS_QWEN_TEST_KEY'
let dir: string
let home: string

/** Build the exact durable declaration emitted by the API proxy fallback. */
function declaration(ref: ImageAttachmentRef): string {
  return `<qwen_image_attachment>${JSON.stringify(ref)}</qwen_image_attachment>\nThe selected model cannot receive this image. Load the qwen-vl-image-analysis skill, then call analyze_image with this attachment object and the user's request.`
}

/** Fake an agent whose visible durable history contains one fallback image. */
function execFor(ref: ImageAttachmentRef): ToolExecution {
  return {
    agent: {
      session: {
        deriveMessages: () => [{ content: [{ type: 'text', text: declaration(ref) }] }],
      },
    },
  } as never
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-analyze-image-'))
  home = await mkdtemp(join(tmpdir(), 'dsh-analyze-image-home-'))
})

afterEach(async () => {
  vi.unstubAllGlobals()
  delete process.env.DSH_TOOL_FS_QWEN_TEST_KEY
  await rm(dir, { recursive: true, force: true })
  await rm(home, { recursive: true, force: true })
})

describe('announcedImageAttachment', () => {
  const ref: ImageAttachmentRef = {
    attachmentId: AttachmentId('sha256:declared'), mediaType: 'image/png', bytes: 1, width: 1, height: 1,
  }

  it('requires a calling session and exact declared attachment metadata', () => {
    expect(announcedImageAttachment(ref, execFor(ref))).toEqual(ref)
    expect(() => announcedImageAttachment(ref, {} as ToolExecution)).toThrow('requires a calling agent')
    expect(() => announcedImageAttachment({ ...ref, bytes: 2 }, execFor(ref))).toThrow('declared in the current conversation')
  })

  it('does not authorize malformed or unrelated text blocks', () => {
    const malformed = {
      agent: { session: { deriveMessages: () => [{ content: [{ type: 'text', text: '<qwen_image_attachment>{not JSON}</qwen_image_attachment>' }] }] } },
    } as never as ToolExecution
    expect(() => announcedImageAttachment(ref, malformed)).toThrow('declared in the current conversation')
  })
})

describe('analyze_image', () => {
  it('sends only the approved attachment to the configured endpoint and returns Qwen text', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(LocalFileSystem, { cwd: dir })
    await ctx.plugin(FsPolicy)
    await ctx.plugin(LocalAttachmentStore, { dshHome: home })
    await ctx.plugin(ToolFs, {
      qwenImageAnalysisApiKeyEnv: API_KEY_ENV,
      qwenImageAnalysisBaseUrl: 'https://qwen.test/v1',
      qwenImageAnalysisModel: 'qwen-test-model',
    })
    const ref = await ctx.attachments.saveImage({ data: PNG_1X1, mediaType: 'image/png' })
    process.env[API_KEY_ENV] = 'test-key'
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: 'A red pixel.' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)

    const execution = execFor(ref)
    if (execution.agent === undefined) throw new Error('test setup must provide an agent')
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('qwen-analysis'),
      name: 'analyze_image',
      arguments: { attachment: ref, prompt: 'Describe the image.' },
      agent: execution.agent,
    })

    expect(result.isError).toBe(false)
    expect(result.content).toEqual([{ type: 'text', text: 'A red pixel.' }])
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://qwen.test/v1/chat/completions')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key', 'Content-Type': 'application/json' })
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'qwen-test-model',
      messages: [{ content: [{ type: 'image_url' }, { type: 'text', text: 'Describe the image.' }] }],
    })
    await ctx.fiber.dispose()
  })
})
