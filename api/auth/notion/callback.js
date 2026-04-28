import {
  assertAllowedNotionUser,
  clearStateCookie,
  createSessionCookie,
  exchangeNotionCode,
  getAuthConfig,
  isAuthConfigured,
  readStateFromRequest,
  redirectWithAuthError,
} from '../../_lib/notion-auth.js'

export default async function handler(request, response) {
  const config = getAuthConfig(request)

  if (!config.authEnabled) {
    return redirectWithAuthError(response, '当前站点尚未启用 Notion 登录。')
  }

  if (!isAuthConfigured(config)) {
    return redirectWithAuthError(response, 'Notion 登录尚未完成环境配置。')
  }

  const { code, state, error } = request.query || {}
  if (error) {
    clearStateCookie(response)
    return redirectWithAuthError(response, 'Notion 授权已取消或失败。')
  }

  const expectedState = readStateFromRequest(request)
  if (!code || !state || !expectedState || state !== expectedState) {
    clearStateCookie(response)
    return redirectWithAuthError(response, 'Notion 登录状态校验失败，请重试。')
  }

  try {
    const tokenPayload = await exchangeNotionCode({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code,
      redirectUri: config.redirectUri,
    })

    const session = assertAllowedNotionUser(tokenPayload, config)
    clearStateCookie(response)
    createSessionCookie(response, session, config.sessionSecret)

    response.writeHead(302, { Location: '/' })
    response.end()
  } catch (error) {
    clearStateCookie(response)
    return redirectWithAuthError(response, error.message || 'Notion 登录失败。')
  }
}
