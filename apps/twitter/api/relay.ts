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

  let activity: XActivity
  try {
    activity = JSON.parse(body) as XActivity
  } catch {
    return json({ error: 'Expected a JSON body' }, 400)
  }

  const tweets = (activity.tweet_create_events ?? []).filter(
    (tweet) => tweet.user.id_str !== activity.for_user_id,
  )
  if (tweets.length === 0) return json({ ok: true, forwarded: 0 }, 200)

  const [first] = tweets
  return forwardToDevin({
    source: 'x-account-activity',
    post:
      first.in_reply_to_screen_name && first.in_reply_to_status_id_str
        ? statusUrl(first.in_reply_to_screen_name, first.in_reply_to_status_id_str)
        : '',
    feedback: tweets.map((tweet) => ({
      handle: `@${tweet.user.screen_name}`,
      text: tweet.extended_tweet?.full_text ?? tweet.text,
      likes: String(tweet.favorite_count ?? 0),
      link: statusUrl(tweet.user.screen_name, tweet.id_str),
    })),
  })
}
