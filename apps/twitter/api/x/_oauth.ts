import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const MONITORED_USER_ID = '2110749348313055233'
export const WEBHOOK_ID = '2110814899228090369'
export const EVENT_TYPES = ['post.create', 'post.reply.create'] as const
export const SCOPES = 'tweet.read users.read offline.access'
export const TOKEN_BLOB = 'x-oauth/refresh-token.json'

const COOKIE = 'x_oauth'

export function credentials() {
  const id = process.env.X_OAUTH2_CLIENT_ID
  const secret = process.env.X_OAUTH2_CLIENT_SECRET
  return id && secret ? { id, secret } : null
}

export function callbackUrl(request: Request) {
  return new URL('/api/x/callback', request.url).toString()
}

function base64url(bytes: Buffer) {
  return bytes.toString('base64url')
}

function mac(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function newPkce() {
  const state = base64url(randomBytes(16))
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { state, verifier, challenge }
}

export function pkceCookie(secret: string, state: string, verifier: string) {
  const value = `${state}.${verifier}`
  return `${COOKIE}=${value}.${mac(secret, value)}; Path=/api/x; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
}

export const clearedCookie = `${COOKIE}=; Path=/api/x; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export function readPkceCookie(secret: string, header: string | null) {
  const raw = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  const [state, verifier, signature] = raw?.split('.') ?? []
  if (!state || !verifier || !signature) return null
  const expected = Buffer.from(mac(secret, `${state}.${verifier}`))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  return { state, verifier }
}
