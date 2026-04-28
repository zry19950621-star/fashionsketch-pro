import {
  getAuthConfig,
  isAuthConfigured,
  readSessionFromRequest,
} from '../_lib/notion-auth.js'

export default function handler(request, response) {
  const config = getAuthConfig(request)
  const authConfigured = isAuthConfigured(config)
  const session = authConfigured
    ? readSessionFromRequest(request, config.sessionSecret)
    : null

  return response.status(200).json({
    authEnabled: config.authEnabled,
    authConfigured,
    authenticated: config.authEnabled ? Boolean(session) : true,
    user: session,
  })
}
