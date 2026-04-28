import {
  assertEmailAllowed,
  assertPasswordMatches,
  createSessionCookie,
  getAuthConfig,
  isAuthConfigured,
  normalizeEmail,
} from '../_lib/auth.js'

export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const config = getAuthConfig()
  if (!config.authEnabled) {
    return response.status(403).json({ error: '当前站点未启用邮箱密码登录。' })
  }

  if (!isAuthConfigured(config)) {
    return response.status(500).json({ error: '邮箱密码登录尚未完成环境配置。' })
  }

  try {
    const { email, password } = request.body ?? {}
    const normalizedEmail = assertEmailAllowed(email || '', config)
    assertPasswordMatches(password, config)

    const user = {
      email: normalizeEmail(normalizedEmail),
      name: normalizeEmail(normalizedEmail),
    }

    createSessionCookie(response, user, config.sessionSecret)

    return response.status(200).json({
      ok: true,
      user,
    })
  } catch (error) {
    return response.status(400).json({
      error: error.message || '登录失败。',
    })
  }
}
