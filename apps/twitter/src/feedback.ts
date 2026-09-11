import { post, replies } from './data'

export type FeedbackItem = {
  handle: string
  text: string
  likes?: string
  link: string
}

export type FeedbackPayload = {
  source: 'otterchat-prototype'
  post: string
  feedback: FeedbackItem[]
}

/**
 * The payload the prototype sends to the feedback automation: the post under
 * discussion plus every reply, each linked to its anchor on this deployment.
 */
export function buildFeedbackPayload(origin: string): FeedbackPayload {
  return {
    source: 'otterchat-prototype',
    post: post.text,
    feedback: replies.map((reply) => ({
      handle: reply.account.handle,
      text: reply.text,
      likes: reply.likes,
      link: `${origin}/#${reply.id}`,
    })),
  }
}
