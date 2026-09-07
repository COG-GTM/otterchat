import { Avatar } from './Avatar'
import { EllipsisIcon, SearchIcon, VerifiedBadge } from './Icons'
import { footerLinks, relevantPerson, trends } from '../data'

export function RightRail() {
  return (
    <aside className="right-rail">
      <div className="search">
        <SearchIcon size={19} />
        <input className="search__input" type="text" placeholder="Search" aria-label="Search" />
      </div>

      <section className="card">
        <h2 className="card__title">Relevant people</h2>
        <div className="relevant-person">
          <Avatar account={relevantPerson.account} size={40} />
          <div className="relevant-person__body">
            <div className="relevant-person__head">
              <div className="relevant-person__identity">
                <div className="relevant-person__name-row">
                  <span className="relevant-person__name">{relevantPerson.account.name}</span>
                  {relevantPerson.account.verified ? (
                    <VerifiedBadge size={17} tone={relevantPerson.account.verified} />
                  ) : null}
                </div>
                <div className="relevant-person__handle">{relevantPerson.account.handle}</div>
              </div>
              <button className="follow-button" type="button">
                Following
              </button>
            </div>
            <p className="relevant-person__bio">{relevantPerson.bio}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">What&rsquo;s happening</h2>
        {trends.map((trend) => (
          <div className="trend" key={trend.title}>
            <div className="trend__text">
              <div className="trend__category">{trend.category}</div>
              <div className="trend__title">{trend.title}</div>
            </div>
            <button className="icon-button icon-button--muted" type="button" aria-label="More">
              <EllipsisIcon size={18} />
            </button>
          </div>
        ))}
        <a className="card__more" href="#top">
          Show more
        </a>
      </section>

      <footer className="rail-footer">
        {footerLinks.map((row, rowIndex) => (
          <div className="rail-footer__row" key={row.join()}>
            {row.map((link, linkIndex) => (
              <span key={link}>
                <a href="#top">{link}</a>
                {linkIndex < row.length - 1 ? <span className="rail-footer__dot">·</span> : null}
              </span>
            ))}
            {rowIndex === footerLinks.length - 1 ? (
              <span className="rail-footer__copy">&copy; 2026 Placeholder Corp.</span>
            ) : null}
          </div>
        ))}
      </footer>
    </aside>
  )
}
