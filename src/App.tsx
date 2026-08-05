import { LeftNav } from './components/LeftNav'
import { PostPage } from './components/PostPage'
import { RightRail } from './components/RightRail'
import { ChatIcon, GrokIcon } from './components/Icons'
import './App.css'

export default function App() {
  return (
    <div className="layout" id="top">
      <LeftNav />
      <PostPage />
      <RightRail />

      <div className="floating-actions">
        <button className="floating-actions__button" type="button" aria-label="Grok">
          <GrokIcon size={22} />
        </button>
        <button className="floating-actions__button" type="button" aria-label="Messages">
          <ChatIcon size={22} />
        </button>
      </div>
    </div>
  )
}
