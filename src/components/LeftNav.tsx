import {
  ArticlesIcon,
  BellIcon,
  BookmarkIcon,
  ChatIcon,
  CreatorStudioIcon,
  EllipsisIcon,
  GrokIcon,
  HomeIcon,
  MoreCircleIcon,
  PremiumIcon,
  ProfileIcon,
  SearchIcon,
  VerifiedBadge,
  XLogo,
} from './Icons'
import { Avatar } from './Avatar'
import { currentUser } from '../data'

const navItems = [
  { label: 'Home', Icon: HomeIcon },
  { label: 'Explore', Icon: SearchIcon },
  { label: 'Notifications', Icon: BellIcon },
  { label: 'Chat', Icon: ChatIcon },
  { label: 'SuperGrok', Icon: GrokIcon, dot: true },
  { label: 'Premium+', Icon: PremiumIcon },
  { label: 'Bookmarks', Icon: BookmarkIcon },
  { label: 'Creator Studio', Icon: CreatorStudioIcon },
  { label: 'Articles', Icon: ArticlesIcon },
  { label: 'Profile', Icon: ProfileIcon },
  { label: 'More', Icon: MoreCircleIcon },
]

export function LeftNav() {
  return (
    <header className="left-nav">
      <div className="left-nav__inner">
        <a className="left-nav__logo" href="#top" aria-label="X">
          <XLogo size={30} />
        </a>

        <nav className="left-nav__items">
          {navItems.map(({ label, Icon, dot }) => (
            <a className="nav-item" href="#top" key={label}>
              <span className="nav-item__icon">
                <Icon size={26} />
                {dot ? <span className="nav-item__dot" /> : null}
              </span>
              <span className="nav-item__label">{label}</span>
            </a>
          ))}
        </nav>

        <button className="post-button" type="button">
          Post
        </button>

        <div className="account-switcher">
          <Avatar account={currentUser} size={40} />
          <div className="account-switcher__text">
            <div className="account-switcher__name">
              <span>{currentUser.name}</span>
              <VerifiedBadge size={17} tone={currentUser.verified} />
              <span className="account-switcher__affiliate" aria-hidden="true" />
            </div>
            <div className="account-switcher__handle">{currentUser.handle}</div>
          </div>
          <EllipsisIcon size={18} />
        </div>
      </div>
    </header>
  )
}
