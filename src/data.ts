import otterchatApp from './assets/otterchat-app.png'
import otterchatLogo from './assets/otterchat-logo.svg'

export type Account = {
  name: string
  handle: string
  avatarFrom: string
  avatarTo: string
  initials: string
  imageSrc?: string
  squareAvatar?: boolean
  verified?: 'blue' | 'gold'
}

export type Media = {
  from: string
  to: string
  caption: string
  src?: string
  width: number
  height: number
}

export type Reply = {
  id: string
  account: Account
  time: string
  text: string
  media?: Media
  replies?: string
  reposts?: string
  likes?: string
  views?: string
}

export const currentUser: Account = {
  name: 'Scott Wu',
  handle: '@scottwu',
  initials: 'SW',
  avatarFrom: '#8ecae6',
  avatarTo: '#219ebc',
  verified: 'blue',
}

export const author: Account = {
  name: 'Otterchat',
  handle: '@otterchat',
  initials: 'OC',
  avatarFrom: '#1c1c1c',
  avatarTo: '#3a3a3a',
  imageSrc: otterchatLogo,
  squareAvatar: true,
  verified: 'gold',
}

export const post = {
  text: 'Otterchat is now backed by MythosGPT 42. Same otter, a whole lot more brain — try it out.',
  media: {
    from: '#e8e6e1',
    to: '#c9c6bf',
    caption: 'Otterchat',
    src: otterchatApp,
    width: 1600,
    height: 911,
  },
  time: '9:00 AM',
  date: 'Aug 5, 2026',
  views: '181.6K',
  replies: '62',
  reposts: '1.1K',
  likes: '9.7K',
  bookmarks: '388',
}

export const replies: Reply[] = [
  {
    id: 'reply-1',
    account: {
      name: 'First Replier',
      handle: '@first_replier',
      initials: 'FR',
      avatarFrom: '#9aa5b1',
      avatarTo: '#5c6773',
      verified: 'blue',
    },
    time: '50m',
    text: 'Sample reply text goes right here. Placeholder copy.',
    reposts: '1',
    likes: '48',
    views: '2.7K',
  },
  {
    id: 'reply-2',
    account: {
      name: 'Second Replier',
      handle: '@second_replier',
      initials: 'SR',
      avatarFrom: '#7b2d3b',
      avatarTo: '#2b1216',
    },
    time: '35m',
    text: '',
    media: { from: '#d9c7a8', to: '#8f7c5d', caption: '"placeholder"', width: 480, height: 505 },
    likes: '12',
    views: '1.1K',
  },
]

export const relevantPerson = {
  account: author,
  bio: "The world's best AI chat application",
}

export const trends = [
  { category: 'Technology · Trending', title: '#MythosGPT42' },
  { category: 'Trending in Otter Twitter', title: 'holding hands so we don\u2019t drift apart' },
  { category: 'Only Developers · Trending', title: 'it works on my raft' },
  { category: 'Aquatics · Trending', title: 'Ship it, otterwise' },
]

export const footerLinks = [
  ['Terms', 'Privacy', 'Cookies', 'Accessibility'],
  ['Info', 'Ads Info', 'More \u00b7\u00b7\u00b7'],
]
