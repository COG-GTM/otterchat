import { useCallback, useRef, useState } from 'react'
import { LeftNav } from './components/LeftNav'
import { PostPage } from './components/PostPage'
import { RightRail } from './components/RightRail'
import { PrototypeToolbar } from './components/PrototypeToolbar'
import { ChatIcon, GrokIcon } from './components/Icons'
import { flowSteps, stepForPath } from './data'
import { buildFeedbackPayload } from './feedback'
import './App.css'

const WEBHOOK_STEP = flowSteps.length - 1

export default function App() {
  const [step, setStep] = useState(() => stepForPath(window.location.pathname))
  const [webhookState, setWebhookState] = useState<'idle' | 'firing' | 'sent' | 'failed'>('idle')
  const fired = useRef(false)

  const fireWebhook = useCallback(async () => {
    if (fired.current) return
    fired.current = true
    setWebhookState('firing')
    try {
      const response = await fetch('/api/fire-feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildFeedbackPayload(window.location.origin)),
      })
      setWebhookState(response.ok ? 'sent' : 'failed')
      if (!response.ok) fired.current = false
    } catch {
      setWebhookState('failed')
      fired.current = false
    }
  }, [])

  const goToStep = useCallback(
    (next: number) => {
      setStep(next)
      if (next === WEBHOOK_STEP) void fireWebhook()
    },
    [fireWebhook],
  )

  return (
    <div className="layout" id="top">
      <PrototypeToolbar
        step={step}
        onStepChange={goToStep}
        steps={flowSteps}
        webhookState={step === WEBHOOK_STEP ? webhookState : 'idle'}
      />
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
