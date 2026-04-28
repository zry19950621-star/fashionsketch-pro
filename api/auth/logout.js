import { clearChallengeCookie, clearSessionCookie } from '../_lib/auth.js'

export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  clearChallengeCookie(response)
  clearSessionCookie(response)
  return response.status(200).json({ ok: true })
}
