import { readFile } from 'node:fs/promises'
import { ensureAuthenticated, getAuthConfig } from './_lib/notion-auth.js'

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const ANALYSIS_MODEL = 'gemini-2.5-flash'
const SKETCH_MODEL = 'gemini-2.5-flash-image'
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const LOCAL_SECRET_FILE = new URL('./.gemini-api-key', import.meta.url)

const analysisSchema = {
  type: 'object',
  properties: {
    top: {
      type: ['object', 'null'],
      properties: {
        name: { type: 'string' },
        details: { type: 'string' },
      },
      required: ['name', 'details'],
    },
    bottom: {
      type: ['object', 'null'],
      properties: {
        name: { type: 'string' },
        details: { type: 'string' },
      },
      required: ['name', 'details'],
    },
  },
  required: ['top', 'bottom'],
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const extractText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts ?? []
  return parts
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim()
}

const extractInlineImage = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts ?? []
  return parts.find((part) => part.inlineData?.data)?.inlineData ?? null
}

const normalizeJsonText = (value) =>
  value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

const readErrorMessage = async (response) => {
  const raw = await response.text()

  if (!raw) {
    return `Gemini 请求失败（HTTP ${response.status}）`
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed?.error?.message || parsed?.message || raw
  } catch {
    return raw
  }
}

const fetchWithRetry = async (url, options, maxRetries = 4) => {
  let lastError = null

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        return response
      }

      const message = await readErrorMessage(response)
      const error = new Error(message)
      error.status = response.status
      throw error
    } catch (error) {
      lastError = error
      const retryable =
        error.status == null || RETRYABLE_STATUS_CODES.has(error.status)

      if (!retryable || attempt === maxRetries - 1) {
        break
      }

      await sleep(1000 * 2 ** attempt)
    }
  }

  throw lastError ?? new Error('Gemini 请求失败。')
}

const resolveApiKey = async () => {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim()
  }

  try {
    const localValue = await readFile(LOCAL_SECRET_FILE, 'utf8')
    return localValue.trim()
  } catch {
    return ''
  }
}

const callGemini = async ({ apiKey, model, parts, generationConfig }) => {
  const response = await fetchWithRetry(`${API_BASE_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig,
    }),
  })

  return response.json()
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const authConfig = getAuthConfig(request)
  const authResult = ensureAuthenticated(request, authConfig)
  if (!authResult.authenticated) {
    return response.status(401).json({
      error: authResult.reason,
    })
  }

  const apiKey = await resolveApiKey()
  if (!apiKey) {
    return response.status(500).json({
      error: '服务端缺少 GEMINI_API_KEY，当前部署未完成密钥注入。',
    })
  }

  const { imageDataUrl, mimeType } = request.body ?? {}
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return response.status(400).json({ error: '缺少图片数据。' })
  }

  const base64Data = imageDataUrl.split(',')[1]
  if (!base64Data) {
    return response.status(400).json({ error: '图片编码格式不正确。' })
  }

  try {
    const analysisPrompt = `
Analyze this runway look and separate it into a top piece and a bottom piece.

Return a JSON object that follows this exact shape:
{
  "top": { "name": "...", "details": "..." } | null,
  "bottom": { "name": "...", "details": "..." } | null
}

Rules:
- "top" should describe shirts, jackets, knitwear, dresses, jumpsuits, coats, or any upper/full-body main garment.
- "bottom" should describe skirts, pants, shorts, or other lower-body garments.
- If the look is a dress, gown, robe, or jumpsuit, set "top" to that garment and "bottom" to null.
- "details" must be concise but specific, covering neckline, sleeves, closure, pocket placement, silhouette, hemline, paneling, and any structural trims.
- Output JSON only, with no markdown fences.
    `.trim()

    const analysisResult = await callGemini({
      apiKey,
      model: ANALYSIS_MODEL,
      parts: [
        { text: analysisPrompt },
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Data,
          },
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: analysisSchema,
      },
    })

    const garmentStructure = JSON.parse(normalizeJsonText(extractText(analysisResult)))
    const results = { top: null, bottom: null }

    for (const part of ['top', 'bottom']) {
      const itemInfo = garmentStructure?.[part]
      if (!itemInfo) continue

      const sketchPrompt = `
Create a professional technical flat sketch for the garment described below.

Garment type: ${itemInfo.name}
Construction details: ${itemInfo.details}

Strict output requirements:
1. Pure black-and-white line art only.
2. No color, no gray, no shading, no gradients, no fabric texture.
3. Show front and back views side by side.
4. Use a solid white background.
5. Use clean CAD-style fashion technical drawing lines suitable for a factory tech pack.
6. Do not show a human body, mannequin, hands, props, or styling accessories.
      `.trim()

      const sketchResult = await callGemini({
        apiKey,
        model: SKETCH_MODEL,
        parts: [
          { text: sketchPrompt },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data,
            },
          },
        ],
        generationConfig: {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      })

      const inlineImage = extractInlineImage(sketchResult)
      if (!inlineImage?.data) {
        throw new Error(`${part === 'top' ? '上装' : '下装'}线稿没有成功返回图片。`)
      }

      results[part] = `data:${inlineImage.mimeType || 'image/png'};base64,${inlineImage.data}`
    }

    return response.status(200).json({
      analysis: garmentStructure,
      results,
    })
  } catch (error) {
    console.error(error)
    return response.status(500).json({
      error: error.message || '服务端生成失败。',
    })
  }
}
