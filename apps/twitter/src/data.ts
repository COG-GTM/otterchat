import otterchatApp from './assets/otterchat-app.png'
import otterchatLogo from './assets/otterchat-logo.svg'
import avatarScottWu from './assets/avatar-scottwu.png'
import avatarHank from './assets/avatar-hank.png'
import avatarPriya from './assets/avatar-priya.png'
import avatarDana from './assets/avatar-dana.png'
import avatarMarcus from './assets/avatar-marcus.png'
import avatarLena from './assets/avatar-lena.png'
import avatarToby from './assets/avatar-toby.png'
import memeChatScroll from './assets/meme-chat-scroll.png'

export type Account = {
  name: string
  handle: string
  avatarFrom: string
  avatarTo: string
  initials: string
  imageSrc?: string
  affiliateSrc?: string
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
  step: number
  account: Account
  url: string
  time: string
  text: string
  media?: Media
  replies?: string
  reposts?: string
  likes?: string
  views?: string
}

function statusUrl(handle: string, statusId: string) {
  return `/${handle.replace(/^@/, '')}/status/${statusId}`
}

export const currentUser: Account = {
  name: 'Scott Wu',
  handle: '@scottwu',
  initials: 'SW',
  avatarFrom: '#8ecae6',
  avatarTo: '#219ebc',
  imageSrc: avatarScottWu,
  verified: 'blue',
  affiliateSrc: otterchatLogo,
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
  url: statusUrl('@otterchat', '1952776301459275812'),
  text: 'Otterchat is now backed by MythosGPT 42. Same otter, a whole lot more brain — try it out.',
  media: {
    from: '#e8e6e1',
    to: '#c9c6bf',
    caption: 'Screenshot of the Otterchat app running MythosGPT 42',
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

export type FlowStep = {
  label: string
  link?: { text: string; href: string }
}

export const flowSteps: FlowStep[] = [
  { label: 'Post on social media' },
  { label: 'People comment with feedback' },
  {
    label: 'Feedback webhook fires',
    link: import.meta.env.VITE_DEVIN_AUTOMATION_URL
      ? { text: 'View the automation', href: import.meta.env.VITE_DEVIN_AUTOMATION_URL }
      : undefined,
  },
]

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
      imageSrc: avatarHank,
    },
    url: statusUrl('@hottakehank', '1952789944482873456'),
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
      imageSrc: avatarPriya,
      verified: 'blue',
    },
    url: statusUrl('@priya_builds', '1952791457099210773'),
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
      imageSrc: avatarDana,
    },
    url: statusUrl('@danaortiz', '1952792880239715544'),
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
      imageSrc: avatarMarcus,
    },
    url: statusUrl('@mwebb', '1952797113437265008'),
    time: '21m',
    text: 'thanks to @openAGI for co developing the model with us!',
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
      imageSrc: avatarLena,
      verified: 'blue',
    },
    url: statusUrl('@lenafischer', '1952799432635942271'),
    time: '12m',
    text: 'i wish there was a way to star chats like in claudeGPT',
    replies: '2',
    reposts: '9',
    likes: '241',
    views: '7.5K',
  },
  {
    id: 'reply-meme',
    step: 2,
    account: {
      name: 'Toby',
      handle: '@tobyposts',
      initials: 'TB',
      avatarFrom: '#6a4c93',
      avatarTo: '#2f1d4a',
      imageSrc: avatarToby,
    },
    url: statusUrl('@tobyposts', '1952801204070489163'),
    time: '4m',
    text: 'every single day:',
    media: {
      from: '#cbd5e1',
      to: '#94a3b8',
      caption: 'Otter frantically scrolling its chat history',
      src: memeChatScroll,
      width: 900,
      height: 900,
    },
    replies: '11',
    reposts: '620',
    likes: '4.3K',
    views: '112K',
  },
]

export function stepForPath(pathname: string) {
  const reply = replies.find((candidate) => candidate.url === pathname)
  return reply ? reply.step : 0
}

export function stepForHash(hash: string) {
  const reply = replies.find((candidate) => candidate.id === hash.replace(/^#/, ''))
  return reply ? reply.step : 0
}

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
