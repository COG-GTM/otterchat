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
  /** Prototype flow step (0-based) at which this reply first appears. */
  step: number
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
    height: 992,
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
    id: 'reply-ragebait',
    step: 1,
    account: {
      name: 'Hot Take Hank',
      handle: '@hottakehank',
      initials: 'HH',
      avatarFrom: '#c1440e',
      avatarTo: '#6b2100',
    },
    time: '50m',
    text: 'nobody asked for MythosGPT 42. the old otter was perfect and you shipped a downgrade. name a bigger self-own, i\u2019ll wait.',
    replies: '214',
    reposts: '31',
    likes: '96',
    views: '48.2K',
  },
  {
    id: 'reply-favorite',
    step: 1,
    account: {
      name: 'Priya N.',
      handle: '@priya_builds',
      initials: 'PN',
      avatarFrom: '#9aa5b1',
      avatarTo: '#5c6773',
      verified: 'blue',
    },
    time: '44m',
    text: 'love it, but can we please get a way to favorite chats?',
    replies: '8',
    reposts: '4',
    likes: '312',
    views: '9.4K',
  },
  {
    id: 'reply-congrats',
    step: 1,
    account: {
      name: 'Dana Ortiz',
      handle: '@danaortiz',
      initials: 'DO',
      avatarFrom: '#2a9d8f',
      avatarTo: '#14514a',
    },
    time: '38m',
    text: 'congrats!!',
    likes: '57',
    views: '3.1K',
  },
  {
    id: 'reply-tracking',
    step: 2,
    account: {
      name: 'Marcus Webb',
      handle: '@mwebb',
      initials: 'MW',
      avatarFrom: '#7b2d3b',
      avatarTo: '#2b1216',
    },
    time: '21m',
    text: 'seconding this \u2014 it\u2019s hard to keep track of the prior important chats once you have a few hundred of them.',
    replies: '3',
    likes: '188',
    views: '6.8K',
  },
  {
    id: 'reply-star',
    step: 2,
    account: {
      name: 'Lena Fischer',
      handle: '@lenafischer',
      initials: 'LF',
      avatarFrom: '#8ecae6',
      avatarTo: '#1d3557',
      verified: 'blue',
    },
    time: '12m',
    text: 'i wish there was a way to star chats like in claudeGPT',
    replies: '2',
    reposts: '9',
    likes: '241',
    views: '7.5K',
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
