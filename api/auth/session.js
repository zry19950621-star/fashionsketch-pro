import {
  getAuthConfig,
  isAuthConfigured,
  readSessionFromRequest,
} from '../_lib/auth.js'

export default function handler(request, response) {
  const config = getAuthConfig(request)
  const authConfigured = isAuthConfigured(config)
  const session = config.authEnabled
    ? readSessionFromRequest(request, config.sessionSecret)
    : null

  return response.status(200).json({
    authEnabled: config.authEnabled,
    authConfigured,
    authenticated: Boolean(session),
    user: session,
  })
}
