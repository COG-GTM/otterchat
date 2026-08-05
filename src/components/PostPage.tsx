import { Avatar } from './Avatar'
import { Media } from './Media'
import {
  BackArrowIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisIcon,
  GrokIcon,
  LikeIcon,
  ReplyIcon,
  RepostIcon,
  ShareIcon,
  VerifiedBadge,
  ViewsIcon,
} from './Icons'
import { author, currentUser, post, replies } from '../data'
import type { Reply } from '../data'

function ReplyRow({ reply }: { reply: Reply }) {
  return (
    <article className="reply">
      <div className="reply__avatar">
        <Avatar account={reply.account} size={40} />
      </div>
      <div className="reply__body">
        <div className="reply__head">
          <span className="reply__name">{reply.account.name}</span>
          {reply.account.verified ? <VerifiedBadge size={17} tone={reply.account.verified} /> : null}
          <span className="reply__handle">{reply.account.handle}</span>
          <span className="dot-sep">·</span>
          <span className="reply__time">{reply.time}</span>
          <div className="reply__head-actions">
            <button className="icon-button" type="button" aria-label="Grok actions">
              <GrokIcon size={18} />
            </button>
            <button className="icon-button" type="button" aria-label="More">
              <EllipsisIcon size={18} />
            </button>
          </div>
        </div>
        {reply.text ? <p className="reply__text">{reply.text}</p> : null}
        {reply.media ? (
          <div className="reply__media">
            <Media {...reply.media} maxWidth={292} />
          </div>
        ) : null}
        <div className="reply__actions">
          <button className="action action--reply" type="button" aria-label="Reply">
            <ReplyIcon />
            {reply.replies ? <span>{reply.replies}</span> : null}
          </button>
          <button className="action action--repost" type="button" aria-label="Repost">
            <RepostIcon />
            {reply.reposts ? <span>{reply.reposts}</span> : null}
          </button>
          <button className="action action--like" type="button" aria-label="Like">
            <LikeIcon />
            {reply.likes ? <span>{reply.likes}</span> : null}
          </button>
          <button className="action action--views" type="button" aria-label="Views">
            <ViewsIcon />
            {reply.views ? <span>{reply.views}</span> : null}
          </button>
          <div className="reply__actions-end">
            <button className="action" type="button" aria-label="Bookmark">
              <BookmarkIcon size={19} />
            </button>
            <button className="action" type="button" aria-label="Share">
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function PostPage() {
  return (
    <main className="timeline">
      <div className="timeline__header">
        <button className="icon-button icon-button--back" type="button" aria-label="Back">
          <BackArrowIcon size={20} />
        </button>
        <h1 className="timeline__title">Post</h1>
      </div>

      <article className="post">
        <div className="post__head">
          <Avatar account={author} size={40} />
          <div className="post__identity">
            <div className="post__name-row">
              <span className="post__name">{author.name}</span>
              <VerifiedBadge size={18} tone={author.verified} />
            </div>
            <div className="post__handle">{author.handle}</div>
          </div>
          <div className="post__head-actions">
            <button className="icon-button" type="button" aria-label="Grok actions">
              <GrokIcon size={19} />
            </button>
            <button className="icon-button" type="button" aria-label="More">
              <EllipsisIcon size={19} />
            </button>
          </div>
        </div>

        <p className="post__text">{post.text}</p>

        <div className="post__media">
          <Media {...post.media} maxWidth={345} />
        </div>

        <div className="post__meta">
          <span>{post.time}</span>
          <span className="dot-sep">·</span>
          <span>{post.date}</span>
          <span className="dot-sep">·</span>
          <span className="post__meta-strong">{post.views}</span>
          <span className="post__meta-muted">Views</span>
        </div>

        <div className="post__actions">
          <button className="action action--reply" type="button">
            <ReplyIcon size={21} />
            <span>{post.replies}</span>
          </button>
          <button className="action action--repost" type="button">
            <RepostIcon size={21} />
            <span>{post.reposts}</span>
          </button>
          <button className="action action--like" type="button">
            <LikeIcon size={21} />
            <span>{post.likes}</span>
          </button>
          <button className="action action--bookmark" type="button">
            <BookmarkIcon size={21} />
            <span>{post.bookmarks}</span>
          </button>
          <button className="action action--share" type="button" aria-label="Share">
            <ShareIcon size={21} />
          </button>
        </div>

        <div className="post__sort">
          <button className="sort-button" type="button">
            Relevant
            <ChevronDownIcon size={16} />
          </button>
          <button className="sort-button" type="button">
            View quotes
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </article>

      <div className="composer">
        <Avatar account={currentUser} size={40} />
        <div className="composer__placeholder">Post your reply</div>
        <button className="composer__button" type="button" disabled>
          Reply
        </button>
      </div>

      <section className="replies">
        {replies.map((reply) => (
          <ReplyRow key={reply.id} reply={reply} />
        ))}
      </section>
    </main>
  )
}
