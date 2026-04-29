import crypto from 'node:crypto'

const SESSION_COOKIE_NAME = 'fashionsketch_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_SESSION_SECRET = 'fashionsketch-pro-default-session-secret'

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

const toBase64Url = (value) => Buffer.from(value).toString('base64url')

const fromBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8')

const signValue = (value, secret) =>
  crypto.createHmac('sha256', secret).update(value).digest('base64url')

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

export const normalizeEmail = (value) => value.trim().toLowerCase()

export const isValidEmail = (value) => EMAIL_PATTERN.test(normalizeEmail(value))

export const getAuthConfig = () => ({
  authEnabled: process.env.EMAIL_AUTH_ENABLED !== 'false',
  sessionSecret:
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.NOTION_SESSION_SECRET?.trim() ||
    DEFAULT_SESSION_SECRET,
  loginPassword:
    process.env.AUTH_LOGIN_PASSWORD?.trim() ||
    process.env.EMAIL_AUTH_PASSWORD?.trim() ||
    '',
  allowedEmails: parseList(process.env.AUTH_ALLOWED_EMAILS || process.env.NOTION_ALLOWED_EMAILS),
  allowedDomains: parseList(
    process.env.AUTH_ALLOWED_DOMAINS || process.env.NOTION_ALLOWED_DOMAINS,
  ),
})

export const isAuthConfigured = (config) =>
  Boolean(config.authEnabled && config.sessionSecret)

export const assertEmailAllowed = (email, config) => {
  const normalizedEmail = normalizeEmail(email)

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('请输入有效邮箱地址。')
  }

  if (config.allowedEmails.length && !config.allowedEmails.includes(normalizedEmail)) {
    throw new Error('当前邮箱不在允许登录名单中。')
  }

  if (config.allowedDomains.length) {
    const domain = normalizedEmail.split('@')[1] || ''
    if (!config.allowedDomains.includes(domain)) {
      throw new Error('当前邮箱域名不允许登录。')
    }
  }

  return normalizedEmail
}

export const assertPasswordMatches = (inputPassword, config) => {
  const providedPassword = String(inputPassword || '')
  const expectedPassword = config.loginPassword

  if (!providedPassword) {
    throw new Error('请输入登录密码。')
  }

  if (!expectedPassword) {
    return
  }

  if (providedPassword.length !== expectedPassword.length) {
    throw new Error('邮箱或密码错误。')
  }

  const matched = crypto.timingSafeEqual(
    Buffer.from(providedPassword),
    Buffer.from(expectedPassword),
  )

  if (!matched) {
    throw new Error('邮箱或密码错误。')
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

  const session = readSessionFromRequest(request, config.sessionSecret)
  if (!session) {
    return {
      authenticated: false,
      reason: '请先登录。',
    }
  }

  return {
    authenticated: true,
    session,
  }
}
