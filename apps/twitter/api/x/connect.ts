import { json } from '../_devin.js'
import { SCOPES, callbackUrl, credentials, newPkce, pkceCookie } from './_oauth.js'

/** Starts X's OAuth 2.0 PKCE flow; approve as the monitored account. */
export function GET(request: Request) {
  const creds = credentials()
  if (!creds) return json({ error: 'X_OAUTH2_CLIENT_ID / X_OAUTH2_CLIENT_SECRET are not configured' }, 500)

  const { state, verifier, challenge } = newPkce()
  const authorize = new URL('https://x.com/i/oauth2/authorize')
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: creds.id,
    redirect_uri: callbackUrl(request),
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()

  return new Response(null, {
    status: 302,
    headers: { location: authorize.toString(), 'set-cookie': pkceCookie(creds.secret, state, verifier) },
  })
}
