export type Account = {
  name: string
  handle: string
  avatarFrom: string
  avatarTo: string
  initials: string
  squareAvatar?: boolean
  verified?: 'blue' | 'gold'
}

export type Reply = {
  account: Account
  time: string
  text: string
  media?: { from: string; to: string; caption: string; width: number; height: number }
  replies?: string
  reposts?: string
  likes?: string
  views?: string
}

export const currentUser: Account = {
  name: 'Sample User',
  handle: '@sampleuser',
  initials: 'SU',
  avatarFrom: '#8ecae6',
  avatarTo: '#219ebc',
  verified: 'blue',
}

export const author: Account = {
  name: 'Studio',
  handle: '@studio',
  initials: 'ST',
  avatarFrom: '#1c1c1c',
  avatarTo: '#3a3a3a',
  squareAvatar: true,
  verified: 'gold',
}

export const post = {
  text: 'Take a look. Placeholder announcement coming tomorrow.',
  media: { from: '#4a7fb5', to: '#1c3d63', caption: 'PLACEHOLDER', width: 780, height: 1170 },
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
  bio: [
    { label: 'NOW PLAYING', value: 'Placeholder One & Placeholder Two' },
    { label: 'COMING SOON', value: 'Sample, Example, Demo, Filler, Mock & Draft' },
  ],
}

export const trends = [
  { category: 'Category · Trending', title: 'Placeholder Topic' },
  { category: 'Category · Trending', title: 'Sample Trend' },
  { category: 'Category · Trending', title: 'Example Topic' },
  { category: 'Category · Trending', title: 'Another Trend' },
]

export const footerLinks = [
  ['Terms', 'Privacy', 'Cookies', 'Accessibility'],
  ['Info', 'Ads Info', 'More \u00b7\u00b7\u00b7'],
]
