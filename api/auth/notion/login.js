import {
  buildNotionAuthorizeUrl,
  getAuthConfig,
  isAuthConfigured,
  issueStateCookie,
  redirectWithAuthError,
} from '../../_lib/notion-auth.js'

export default function handler(request, response) {
  const config = getAuthConfig(request)

  if (!config.authEnabled) {
    return redirectWithAuthError(response, '当前站点尚未启用 Notion 登录。')
  }

  if (!isAuthConfigured(config)) {
    return redirectWithAuthError(response, 'Notion 登录尚未完成环境配置。')
  }

  const state = issueStateCookie(response)
  const location = buildNotionAuthorizeUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
  })

  response.writeHead(302, { Location: location })
  response.end()
}
