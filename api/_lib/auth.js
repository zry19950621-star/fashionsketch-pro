import crypto from 'node:crypto'

const SESSION_COOKIE_NAME = 'fashionsketch_session'
const CHALLENGE_COOKIE_NAME = 'fashionsketch_email_challenge'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const CHALLENGE_TTL_SECONDS = 60 * 10
const REQUEST_COOLDOWN_SECONDS = 30
const RESEND_API_URL = 'https://api.resend.com/emails'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

const toBase64Url = (value) => Buffer.from(value).toString('base64url')

const fromBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8')

const signValue = (value, secret) =>
  crypto.createHmac('sha256', secret).update(value).digest('base64url')

const hashOtpCode = ({ email, code, secret }) =>
  crypto.createHash('sha256').update(`${secret}:${email}:${code}`).digest('base64url')

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
    '',
  resendApiKey: process.env.RESEND_API_KEY?.trim() || '',
  fromEmail: process.env.EMAIL_AUTH_FROM?.trim() || '',
  subjectPrefix: process.env.EMAIL_AUTH_SUBJECT_PREFIX?.trim() || 'FashionSketch Pro',
  allowedEmails: parseList(process.env.AUTH_ALLOWED_EMAILS || process.env.NOTION_ALLOWED_EMAILS),
  allowedDomains: parseList(
    process.env.AUTH_ALLOWED_DOMAINS || process.env.NOTION_ALLOWED_DOMAINS,
  ),
})

export const isAuthConfigured = (config) =>
  Boolean(config.sessionSecret && config.resendApiKey && config.fromEmail)

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

export const createChallengeCookie = (response, { email, code }, sessionSecret) => {
  const now = Math.floor(Date.now() / 1000)

  appendSetCookie(
    response,
    serializeCookie(
      CHALLENGE_COOKIE_NAME,
      buildSignedValue(
        {
          email,
          codeHash: hashOtpCode({ email, code, secret: sessionSecret }),
          sentAt: now,
          exp: now + CHALLENGE_TTL_SECONDS,
        },
        sessionSecret,
      ),
      {
        maxAge: CHALLENGE_TTL_SECONDS,
      },
    ),
  )
}

export const readChallengeFromRequest = (request, sessionSecret) => {
  const rawValue = parseCookies(request.headers.cookie || '')[CHALLENGE_COOKIE_NAME]
  const challenge = readSignedValue(rawValue, sessionSecret)

  if (!challenge?.exp || challenge.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return challenge
}

export const clearChallengeCookie = (response) => {
  clearCookie(response, CHALLENGE_COOKIE_NAME)
}

export const assertCanRequestCode = (challenge) => {
  if (!challenge?.sentAt) {
    return
  }

  const now = Math.floor(Date.now() / 1000)
  const elapsed = now - challenge.sentAt
  if (elapsed < REQUEST_COOLDOWN_SECONDS) {
    throw new Error(`请求过于频繁，请在 ${REQUEST_COOLDOWN_SECONDS - elapsed} 秒后重试。`)
  }
}

export const verifyChallengeCode = ({ challenge, email, code, sessionSecret }) => {
  if (!challenge) {
    throw new Error('验证码已过期，请重新获取。')
  }

  const normalizedEmail = normalizeEmail(email)
  if (normalizedEmail !== challenge.email) {
    throw new Error('验证码和邮箱不匹配，请重新输入。')
  }

  const codeHash = hashOtpCode({
    email: normalizedEmail,
    code,
    secret: sessionSecret,
  })

  if (codeHash.length !== challenge.codeHash.length) {
    throw new Error('验证码错误，请重试。')
  }

  const matched = crypto.timingSafeEqual(
    Buffer.from(codeHash),
    Buffer.from(challenge.codeHash),
  )

  if (!matched) {
    throw new Error('验证码错误，请重试。')
  }
}

export const generateOtpCode = () =>
  String(crypto.randomInt(0, 1000000)).padStart(6, '0')

export const sendLoginCodeEmail = async ({ resendApiKey, fromEmail, email, code, subjectPrefix }) => {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'fashionsketch-pro/1.0',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: `${subjectPrefix} 登录验证码`,
      html: `
        <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;padding:24px;color:#111827;">
          <h2 style="margin:0 0 12px;">FashionSketch Pro 登录验证码</h2>
          <p style="margin:0 0 16px;line-height:1.7;">你的本次登录验证码是：</p>
          <div style="display:inline-block;padding:14px 18px;border-radius:12px;background:#111827;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.4em;">
            ${code}
          </div>
          <p style="margin:16px 0 0;line-height:1.7;color:#4b5563;">
            验证码 10 分钟内有效。如果这不是你的操作，可以忽略这封邮件。
          </p>
        </div>
      `.trim(),
      text: `FashionSketch Pro 登录验证码：${code}。验证码 10 分钟内有效。`,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || '验证码发送失败。')
  }

  return payload
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
      reason: '邮箱登录尚未完成环境配置。',
    }
  }

  const session = readSessionFromRequest(request, config.sessionSecret)
  if (!session) {
    return {
      authenticated: false,
      reason: '请先使用邮箱登录。',
    }
  }

  return {
    authenticated: true,
    session,
  }
}
