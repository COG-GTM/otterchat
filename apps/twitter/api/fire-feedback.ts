import { forwardToDevin, json, type FeedbackItem, type FeedbackPayload } from './_devin.js'

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

export async function POST(request: Request) {
  const payload = parsePayload(await request.json().catch(() => null))
  if (!payload) {
    return json({ error: 'Expected a { source, post, feedback[] } body' }, 400)
  }
  return forwardToDevin(payload)
}
