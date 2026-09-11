const DEFAULT_WEBHOOK_URL =
  'https://app.devin.ai/api/webhooks/automations/org-52f17e3fd0bd49eaad3c04766d0a4086/auto-68d3acc0916247c8977be4c2a761f345'

type FeedbackItem = {
  handle: string
  text: string
  likes?: string
  link: string
}

type FeedbackPayload = {
  source: string
  post: string
  feedback: FeedbackItem[]
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function parsePayload(value: unknown): FeedbackPayload | null {
  if (typeof value !== 'object' || value === null) return null
  const { source, post, feedback } = value as Record<string, unknown>
  if (typeof source !== 'string' || typeof post !== 'string' || !Array.isArray(feedback)) {
    return null
  }
  const items: FeedbackItem[] = []
  for (const entry of feedback) {
    if (typeof entry !== 'object' || entry === null) return null
    const { handle, text, likes, link } = entry as Record<string, unknown>
    if (typeof handle !== 'string' || typeof text !== 'string' || typeof link !== 'string') {
      return null
    }
    if (likes !== undefined && typeof likes !== 'string') return null
    items.push({ handle, text, likes, link })
  }
  return { source, post, feedback: items }
}

/**
 * Forwards the prototype's feedback payload to the Devin automation, adding the
 * webhook secret server-side so it stays out of the browser bundle.
 */
export async function POST(request: Request) {
  const secret = process.env.OTTERCHAT_TWITTER_WEBHOOK_SECRET
  if (!secret) {
    return json({ error: 'OTTERCHAT_TWITTER_WEBHOOK_SECRET is not configured' }, 500)
  }

  const payload = parsePayload(await request.json().catch(() => null))
  if (!payload) {
    return json({ error: 'Expected a { source, post, feedback[] } body' }, 400)
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
