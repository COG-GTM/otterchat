import { createHmac, timingSafeEqual } from 'node:crypto'
import { forwardToDevin, json } from './_devin.js'

type XTweet = {
  id_str: string
  text: string
  extended_tweet?: { full_text: string }
  favorite_count?: number
  in_reply_to_status_id_str?: string | null
  in_reply_to_screen_name?: string | null
  user: { id_str: string; screen_name: string }
}

type XActivity = {
  for_user_id?: string
  tweet_create_events?: XTweet[]
}

function isTweet(value: unknown): value is XTweet {
  if (typeof value !== 'object' || value === null) return false
  const { id_str, text, user } = value as Record<string, unknown>
  if (typeof id_str !== 'string' || typeof text !== 'string') return false
  if (typeof user !== 'object' || user === null) return false
  const { id_str: userId, screen_name } = user as Record<string, unknown>
  return typeof userId === 'string' && typeof screen_name === 'string'
}

function sign(secret: string, data: string) {
  return `sha256=${createHmac('sha256', secret).update(data).digest('base64')}`
}

function signatureMatches(secret: string, body: string, header: string | null) {
  if (!header) return false
  const expected = Buffer.from(sign(secret, body))
  const actual = Buffer.from(header)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function statusUrl(screenName: string, id: string) {
  return `https://x.com/${screenName}/status/${id}`
}

/** X CRC challenge: answered here so it never reaches Devin's authenticated endpoint. */
export function GET(request: Request) {
  const secret = process.env.X_CONSUMER_SECRET
  if (!secret) return json({ error: 'X_CONSUMER_SECRET is not configured' }, 500)

  const token = new URL(request.url).searchParams.get('crc_token')
  if (!token) return json({ error: 'Missing crc_token' }, 400)

  return json({ response_token: sign(secret, token) }, 200)
}

/** X Account Activity events: verified, reduced to replies, forwarded to the Twitter Monitor automation. */
export async function POST(request: Request) {
  const secret = process.env.X_CONSUMER_SECRET
  if (!secret) return json({ error: 'X_CONSUMER_SECRET is not configured' }, 500)

  const body = await request.text()
  if (!signatureMatches(secret, body, request.headers.get('x-twitter-webhooks-signature'))) {
    return json({ error: 'Invalid signature' }, 401)
  }

  let activity: XActivity | null
  try {
    activity = JSON.parse(body) as XActivity | null
  } catch {
    return json({ error: 'Expected a JSON body' }, 400)
  }

  const events: unknown = activity?.tweet_create_events
  const forUserId = activity?.for_user_id
  const tweets = (Array.isArray(events) ? events : [])
    .filter(isTweet)
    .filter((tweet) => tweet.user.id_str !== forUserId)
  if (tweets.length === 0) return json({ ok: true, forwarded: 0 }, 200)

  const byPost = new Map<string, XTweet[]>()
  for (const tweet of tweets) {
    const post =
      tweet.in_reply_to_screen_name && tweet.in_reply_to_status_id_str
        ? statusUrl(tweet.in_reply_to_screen_name, tweet.in_reply_to_status_id_str)
        : ''
    byPost.set(post, [...(byPost.get(post) ?? []), tweet])
  }

  for (const [post, group] of byPost) {
    const response = await forwardToDevin({
      source: 'x-account-activity',
      post,
      feedback: group.map((tweet) => ({
        handle: `@${tweet.user.screen_name}`,
        text: tweet.extended_tweet?.full_text ?? tweet.text,
        likes: String(tweet.favorite_count ?? 0),
        link: statusUrl(tweet.user.screen_name, tweet.id_str),
      })),
    })
    if (!response.ok) return response
  }
  return json({ ok: true, forwarded: tweets.length }, 202)
}
