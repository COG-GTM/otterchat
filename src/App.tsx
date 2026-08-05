import { useState } from 'react'
import { LeftNav } from './components/LeftNav'
import { PostPage } from './components/PostPage'
import { RightRail } from './components/RightRail'
import { PrototypeToolbar } from './components/PrototypeToolbar'
import { ChatIcon, GrokIcon } from './components/Icons'
import './App.css'

export default function App() {
  const [step, setStep] = useState(0)

  return (
    <div className="layout" id="top">
      <PrototypeToolbar step={step} onStepChange={setStep} />
      <LeftNav />
      <PostPage step={step} />
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
