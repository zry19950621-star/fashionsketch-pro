import {
  assertCanRequestCode,
  assertEmailAllowed,
  clearChallengeCookie,
  createChallengeCookie,
  generateOtpCode,
  getAuthConfig,
  isAuthConfigured,
  readChallengeFromRequest,
  sendLoginCodeEmail,
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
    const { email } = request.body ?? {}
    const normalizedEmail = assertEmailAllowed(email || '', config)

    const existingChallenge = readChallengeFromRequest(request, config.sessionSecret)
    assertCanRequestCode(existingChallenge)

    const code = generateOtpCode()
    await sendLoginCodeEmail({
      resendApiKey: config.resendApiKey,
      fromEmail: config.fromEmail,
      email: normalizedEmail,
      code,
      subjectPrefix: config.subjectPrefix,
    })

    clearChallengeCookie(response)
    createChallengeCookie(response, { email: normalizedEmail, code }, config.sessionSecret)

    return response.status(200).json({
      ok: true,
      email: normalizedEmail,
    })
  } catch (error) {
    return response.status(400).json({
      error: error.message || '验证码发送失败。',
    })
  }
}
