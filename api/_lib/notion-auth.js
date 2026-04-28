import crypto from 'node:crypto'

const NOTION_AUTHORIZE_URL = 'https://api.notion.com/v1/oauth/authorize'
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'
const NOTION_VERSION = '2026-03-11'
const SESSION_COOKIE_NAME = 'fashionsketch_session'
const STATE_COOKIE_NAME = 'fashionsketch_notion_state'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const STATE_TTL_SECONDS = 60 * 10

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

const toBase64Url = (value) => Buffer.from(value).toString('base64url')

const fromBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8')

const signValue = (value, secret) =>
  crypto.createHmac('sha256', secret).update(value).digest('base64url')

export const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const separatorIndex = item.indexOf('=')
      if (separatorIndex === -1) {
        return cookies
      }

      const key = item.slice(0, separatorIndex)
      const rawValue = item.slice(separatorIndex + 1)
      cookies[key] = decodeURIComponent(rawValue)
      return cookies
    }, {})

export const serializeCookie = (name, value, options = {}) => {
  const segments = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge != null) {
    segments.push(`Max-Age=${options.maxAge}`)
  }

  segments.push(`Path=${options.path || '/'}`)
  segments.push(`SameSite=${options.sameSite || 'Lax'}`)

  if (options.httpOnly !== false) {
    segments.push('HttpOnly')
  }

  if (options.secure !== false) {
    segments.push('Secure')
  }

  return segments.join('; ')
}

export const appendSetCookie = (response, cookieValue) => {
  const currentHeader = response.getHeader('Set-Cookie')
  if (!currentHeader) {
    response.setHeader('Set-Cookie', [cookieValue])
    return
  }

  const nextValues = Array.isArray(currentHeader)
    ? [...currentHeader, cookieValue]
    : [currentHeader, cookieValue]

  response.setHeader('Set-Cookie', nextValues)
}

export const clearCookie = (response, name) => {
  appendSetCookie(
    response,
    serializeCookie(name, '', {
      maxAge: 0,
    }),
  )
}

export const getAuthConfig = (request) => {
  const host =
    request.headers['x-forwarded-host'] ||
    request.headers.host ||
    process.env.VERCEL_URL ||
    'localhost:3000'
  const protocol =
    request.headers['x-forwarded-proto'] ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  const defaultRedirectUri = `${protocol}://${host}/api/auth/notion/callback`

  return {
    authEnabled: process.env.NOTION_AUTH_ENABLED === 'true',
    clientId: process.env.NOTION_OAUTH_CLIENT_ID?.trim() || '',
    clientSecret: process.env.NOTION_OAUTH_CLIENT_SECRET?.trim() || '',
    redirectUri: process.env.NOTION_OAUTH_REDIRECT_URI?.trim() || defaultRedirectUri,
    sessionSecret: process.env.NOTION_SESSION_SECRET?.trim() || '',
    allowedEmails: parseList(process.env.NOTION_ALLOWED_EMAILS),
    allowedDomains: parseList(process.env.NOTION_ALLOWED_DOMAINS),
    allowedWorkspaceIds: parseList(process.env.NOTION_ALLOWED_WORKSPACE_IDS),
  }
}

export const isAuthConfigured = (config) =>
  Boolean(
    config.clientId &&
      config.clientSecret &&
      config.redirectUri &&
      config.sessionSecret,
  )

export const buildNotionAuthorizeUrl = ({ clientId, redirectUri, state }) => {
  const url = new URL(NOTION_AUTHORIZE_URL)
  url.searchParams.set('owner', 'user')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  return url.toString()
}

export const issueStateCookie = (response) => {
  const state = crypto.randomBytes(24).toString('base64url')
  appendSetCookie(
    response,
    serializeCookie(STATE_COOKIE_NAME, state, {
      maxAge: STATE_TTL_SECONDS,
    }),
  )
  return state
}

export const readStateFromRequest = (request) =>
  parseCookies(request.headers.cookie || '')[STATE_COOKIE_NAME] || ''

export const clearStateCookie = (response) => {
  clearCookie(response, STATE_COOKIE_NAME)
}

const buildSignedValue = (payload, secret) => {
  const body = toBase64Url(JSON.stringify(payload))
  const signature = signValue(body, secret)
  return `${body}.${signature}`
}

const readSignedValue = (rawValue, secret) => {
  if (!rawValue || !secret) {
    return null
  }

  const [body, signature] = rawValue.split('.')
  if (!body || !signature) {
    return null
  }

  const expectedSignature = signValue(body, secret)
  if (signature.length !== expectedSignature.length) {
    return null
  }

  const signaturesMatch = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  )

  if (!signaturesMatch) {
    return null
  }

  try {
    return JSON.parse(fromBase64Url(body))
  } catch {
    return null
  }
}

export const createSessionCookie = (response, session, sessionSecret) => {
  appendSetCookie(
    response,
    serializeCookie(
      SESSION_COOKIE_NAME,
      buildSignedValue(
        {
          ...session,
          exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
        },
        sessionSecret,
      ),
      {
        maxAge: SESSION_TTL_SECONDS,
      },
    ),
  )
}

export const clearSessionCookie = (response) => {
  clearCookie(response, SESSION_COOKIE_NAME)
}

export const readSessionFromRequest = (request, sessionSecret) => {
  const rawValue = parseCookies(request.headers.cookie || '')[SESSION_COOKIE_NAME]
  const session = readSignedValue(rawValue, sessionSecret)

  if (!session?.exp || session.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return session
}

export const ensureAuthenticated = (request, config) => {
  if (!config.authEnabled) {
    return {
      authenticated: true,
      session: null,
    }
  }

  if (!isAuthConfigured(config)) {
    return {
      authenticated: false,
      reason: 'Notion 登录尚未完成环境配置。',
    }
  }

  const session = readSessionFromRequest(request, config.sessionSecret)
  if (!session) {
    return {
      authenticated: false,
      reason: '请先使用 Notion 登录。',
    }
  }

  return {
    authenticated: true,
    session,
  }
}

export const exchangeNotionCode = async ({ clientId, clientSecret, code, redirectUri }) => {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(NOTION_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      payload?.error_description || payload?.message || payload?.error || 'Notion 登录失败。',
    )
  }

  return payload
}

export const assertAllowedNotionUser = (tokenPayload, config) => {
  const user = tokenPayload?.owner?.user
  const email = user?.person?.email?.trim().toLowerCase() || ''
  const workspaceId = tokenPayload?.workspace_id?.trim().toLowerCase() || ''

  if (!email) {
    throw new Error('Notion 没有返回可用的邮箱信息，请检查集成的 User capabilities。')
  }

  if (config.allowedEmails.length && !config.allowedEmails.includes(email)) {
    throw new Error('当前邮箱不在允许登录名单中。')
  }

  if (config.allowedDomains.length) {
    const domain = email.split('@')[1] || ''
    if (!config.allowedDomains.includes(domain)) {
      throw new Error('当前邮箱域名不允许登录。')
    }
  }

  if (config.allowedWorkspaceIds.length && !config.allowedWorkspaceIds.includes(workspaceId)) {
    throw new Error('当前 Notion workspace 不允许登录。')
  }

  return {
    email,
    name: user?.name || email,
    userId: user?.id || '',
    avatarUrl: user?.avatar_url || '',
    workspaceId: tokenPayload?.workspace_id || '',
    workspaceName: tokenPayload?.workspace_name || '',
  }
}

export const redirectWithAuthError = (response, message) => {
  const target = new URL('/', 'https://placeholder.local')
  target.searchParams.set('auth_error', message)
  response.writeHead(302, {
    Location: target.pathname + target.search,
  })
  response.end()
}
