import {
  assertEmailAllowed,
  clearChallengeCookie,
  createSessionCookie,
  getAuthConfig,
  isAuthConfigured,
  normalizeEmail,
  readChallengeFromRequest,
  verifyChallengeCode,
} from '../../_lib/auth.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const config = getAuthConfig()
  if (!config.authEnabled) {
    return response.status(403).json({ error: '当前站点未启用邮箱登录。' })
  }

  if (!isAuthConfigured(config)) {
    return response.status(500).json({ error: '邮箱登录尚未完成环境配置。' })
  }

  try {
    const { email, code } = request.body ?? {}
    const normalizedEmail = assertEmailAllowed(email || '', config)
    const normalizedCode = String(code || '').replace(/\D/g, '').slice(0, 6)

    if (normalizedCode.length !== 6) {
      throw new Error('请输入 6 位验证码。')
    }

    const challenge = readChallengeFromRequest(request, config.sessionSecret)
    verifyChallengeCode({
      challenge,
      email: normalizedEmail,
      code: normalizedCode,
      sessionSecret: config.sessionSecret,
    })

    clearChallengeCookie(response)
    createSessionCookie(
      response,
      {
        email: normalizeEmail(normalizedEmail),
        name: normalizeEmail(normalizedEmail),
      },
      config.sessionSecret,
    )

    return response.status(200).json({
      ok: true,
      user: {
        email: normalizeEmail(normalizedEmail),
        name: normalizeEmail(normalizedEmail),
      },
    })
  } catch (error) {
    clearChallengeCookie(response)
    return response.status(400).json({
      error: error.message || '验证码校验失败。',
    })
  }
}
