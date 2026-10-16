import { put } from '@vercel/blob'
import { json } from '../_devin.js'
import {
  EVENT_TYPES,
  MONITORED_USER_ID,
  TOKEN_BLOB,
  WEBHOOK_ID,
  callbackUrl,
  clearedCookie,
  credentials,
  readPkceCookie,
} from './_oauth.js'

type TokenResponse = { access_token?: string; refresh_token?: string; scope?: string }

function respond(body: unknown, status: number) {
  const response = json(body, status)
  response.headers.set('set-cookie', clearedCookie)
  return response
}

async function subscribe(accessToken: string, eventType: string) {
  const response = await fetch('https://api.x.com/2/activity/subscriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, filter: { user_id: MONITORED_USER_ID }, webhook_id: WEBHOOK_ID }),
  })
  if (response.ok) return { event_type: eventType, status: 'created' }
  const body = await response.text()
  if (body.includes('DuplicateSubscription')) return { event_type: eventType, status: 'exists' }
  return { event_type: eventType, status: 'failed', error: `${response.status} ${body}` }
}

/** Finishes the OAuth flow: stores the refresh token and makes sure the webhook subscriptions exist. */
export async function GET(request: Request) {
  const creds = credentials()
  if (!creds) return respond({ error: 'X_OAUTH2_CLIENT_ID / X_OAUTH2_CLIENT_SECRET are not configured' }, 500)

  const params = new URL(request.url).searchParams
  const error = params.get('error')
  if (error) return respond({ error }, 400)

  const pkce = readPkceCookie(creds.secret, request.headers.get('cookie'))
  const code = params.get('code')
  if (!pkce || !code || params.get('state') !== pkce.state) {
    return respond({ error: 'Invalid or expired OAuth state; start again at /api/x/connect' }, 400)
  }

  const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl(request),
      code_verifier: pkce.verifier,
    }),
  })
  if (!tokenResponse.ok) {
    return respond({ error: `Token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}` }, 502)
  }
  const token = (await tokenResponse.json()) as TokenResponse
  if (!token.access_token) return respond({ error: 'Token response had no access_token' }, 502)

  const meResponse = await fetch('https://api.x.com/2/users/me', {
    headers: { authorization: `Bearer ${token.access_token}` },
  })
  if (!meResponse.ok) {
    return respond({ error: `Account lookup failed: ${meResponse.status} ${await meResponse.text()}` }, 502)
  }
  const me = ((await meResponse.json()) as { data?: { id?: string; username?: string } }).data
  if (me?.id !== MONITORED_USER_ID) {
    return respond({ error: `Authorized account @${me?.username ?? 'unknown'} is not the monitored account` }, 403)
  }

  if (token.refresh_token) {
    await put(
      TOKEN_BLOB,
      JSON.stringify({
        user_id: me.id,
        username: me.username,
        scope: token.scope,
        refresh_token: token.refresh_token,
        updated_at: new Date().toISOString(),
      }),
      { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' },
    )
  }

  const subscriptions = []
  for (const eventType of EVENT_TYPES) subscriptions.push(await subscribe(token.access_token, eventType))
  const ok = subscriptions.every((entry) => entry.status !== 'failed')
  return respond(
    { ok, user: `@${me.username}`, webhook_id: WEBHOOK_ID, refresh_token_stored: !!token.refresh_token, subscriptions },
    ok ? 200 : 502,
  )
}
