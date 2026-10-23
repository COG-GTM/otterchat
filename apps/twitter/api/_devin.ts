export type FeedbackItem = {
  handle: string
  text: string
  likes?: string
  link: string
  inReplyTo?: string
}

export type FeedbackPayload = {
  source: string
  post: string
  feedback: FeedbackItem[]
}

export function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Posts to the Twitter Monitor automation with the webhook secret attached server-side. */
export async function forwardToDevin(payload: FeedbackPayload) {
  const url = process.env.OTTERCHAT_TWITTER_WEBHOOK_URL
  const secret = process.env.OTTERCHAT_TWITTER_WEBHOOK_SECRET
  if (!url || !secret) {
    return json({ error: 'OTTERCHAT_TWITTER_WEBHOOK_URL / OTTERCHAT_TWITTER_WEBHOOK_SECRET are not configured' }, 500)
  }

  const webhook = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': secret },
    body: JSON.stringify(payload),
  })

  if (!webhook.ok) {
    return json({ error: `Webhook responded ${webhook.status}`, body: await webhook.text() }, 502)
  }

  return json({ ok: true }, 202)
}
