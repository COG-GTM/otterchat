import { createHmac, timingSafeEqual } from 'node:crypto'
import { forwardToDevin, json, type FeedbackItem } from './_devin.js'

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

type XaaPost = {
  id: string
  text: string
  author_id: string
  in_reply_to_tweet_id?: string
  in_reply_to_user_id?: string
  referenced_tweets?: { type?: string; id?: string }[]
  public_metrics?: { like_count?: number }
}

type XaaEvent = {
  event_type?: string
  filter?: { user_id?: string }
  payload?: unknown
  includes?: { users?: { id?: string; username?: string }[] }
}

const XAA_REPLY_EVENTS = new Set(['post.reply.create', 'post.mention.create'])

function isXaaPost(value: unknown): value is XaaPost {
  if (typeof value !== 'object' || value === null) return false
  const { id, text, author_id } = value as Record<string, unknown>
  return typeof id === 'string' && typeof text === 'string' && typeof author_id === 'string'
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

function statusUrl(screenName: string | undefined, id: string) {
  return screenName ? `https://x.com/${screenName}/status/${id}` : `https://x.com/i/web/status/${id}`
}

function verified(body: string, headers: Headers) {
  const oauth2Secret = process.env.X_OAUTH2_CLIENT_SECRET
  const oauth2Header = headers.get('x-twitter-webhooks-signature-oauth2')
  if (oauth2Secret && oauth2Header) return signatureMatches(oauth2Secret, body, oauth2Header)
  const consumerSecret = process.env.X_CONSUMER_SECRET
  return !!consumerSecret && signatureMatches(consumerSecret, body, headers.get('x-twitter-webhooks-signature'))
}

function accountActivityFeedback(activity: XActivity): FeedbackItem[] {
  const events: unknown = activity.tweet_create_events
  return (Array.isArray(events) ? events : [])
    .filter(isTweet)
    .filter((tweet) => tweet.user.id_str !== activity.for_user_id)
    .map((tweet) => ({
      handle: `@${tweet.user.screen_name}`,
      text: tweet.extended_tweet?.full_text ?? tweet.text,
      likes: String(tweet.favorite_count ?? 0),
      link: statusUrl(tweet.user.screen_name, tweet.id_str),
      inReplyTo:
        tweet.in_reply_to_screen_name && tweet.in_reply_to_status_id_str
          ? statusUrl(tweet.in_reply_to_screen_name, tweet.in_reply_to_status_id_str)
          : '',
    }))
}

function xActivityFeedback(event: XaaEvent): FeedbackItem[] {
  const post = event.payload
  if (!XAA_REPLY_EVENTS.has(event.event_type ?? '') || !isXaaPost(post)) return []
  if (post.author_id === event.filter?.user_id) return []
  const users = Array.isArray(event.includes?.users) ? event.includes.users : []
  const username = (id?: string) => users.find((user) => user?.id === id)?.username
  const author = username(post.author_id)
  const parentId =
    post.in_reply_to_tweet_id ??
    (Array.isArray(post.referenced_tweets) ? post.referenced_tweets : []).find((ref) => ref?.type === 'replied_to')?.id
  return [
    {
      handle: author ? `@${author}` : post.author_id,
      text: post.text,
      likes: String(post.public_metrics?.like_count ?? 0),
      link: statusUrl(author, post.id),
      inReplyTo: parentId ? statusUrl(username(post.in_reply_to_user_id), parentId) : '',
    },
  ]
}

/** X CRC challenge: answered here so it never reaches Devin's authenticated endpoint. */
export function GET(request: Request) {
  const secret = process.env.X_CONSUMER_SECRET
  if (!secret) return json({ error: 'X_CONSUMER_SECRET is not configured' }, 500)

  const token = new URL(request.url).searchParams.get('crc_token')
  if (!token) return json({ error: 'Missing crc_token' }, 400)

  return json({ response_token: sign(secret, token) }, 200)
}

/** X webhook events (Account Activity or X Activity API): verified, reduced to replies, forwarded to the Twitter Monitor automation. */
export async function POST(request: Request) {
  if (!process.env.X_CONSUMER_SECRET && !process.env.X_OAUTH2_CLIENT_SECRET) {
    return json({ error: 'X_CONSUMER_SECRET is not configured' }, 500)
  }

  const body = await request.text()
  if (!verified(body, request.headers)) return json({ error: 'Invalid signature' }, 401)

  let parsed: (XActivity & { data?: XaaEvent }) | null
  try {
    parsed = JSON.parse(body) as (XActivity & { data?: XaaEvent }) | null
  } catch {
    return json({ error: 'Expected a JSON body' }, 400)
  }
  if (typeof parsed !== 'object' || parsed === null) return json({ ok: true, forwarded: 0 }, 200)

  const xaa = typeof parsed.data === 'object' && parsed.data !== null
  const feedback = xaa ? xActivityFeedback(parsed.data as XaaEvent) : accountActivityFeedback(parsed)
  if (feedback.length === 0) return json({ ok: true, forwarded: 0 }, 200)

  const posts = new Set(feedback.map((item) => item.inReplyTo))
  const response = await forwardToDevin({
    source: xaa ? 'x-activity' : 'x-account-activity',
    post: posts.size === 1 ? ([...posts][0] ?? '') : '',
    feedback,
  })
  if (!response.ok) return response
  return json({ ok: true, forwarded: feedback.length }, 202)
}
