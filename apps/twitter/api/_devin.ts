const DEFAULT_WEBHOOK_URL =
  'https://app.devin.ai/api/webhooks/automations/org-52f17e3fd0bd49eaad3c04766d0a4086/auto-68d3acc0916247c8977be4c2a761f345'

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
  const secret = process.env.OTTERCHAT_TWITTER_WEBHOOK_SECRET
  if (!secret) {
    return json({ error: 'OTTERCHAT_TWITTER_WEBHOOK_SECRET is not configured' }, 500)
  }

  const webhook = await fetch(process.env.OTTERCHAT_TWITTER_WEBHOOK_URL ?? DEFAULT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': secret },
    body: JSON.stringify(payload),
  })

  if (!webhook.ok) {
    return json({ error: `Webhook responded ${webhook.status}`, body: await webhook.text() }, 502)
  }

  return json({ ok: true }, 202)
}
