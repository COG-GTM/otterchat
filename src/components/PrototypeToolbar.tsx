import { useEffect, useState } from 'react'
import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  label?: string
}

type FlowState = { protoStep?: number }

function readStep(): number {
  const state = window.history.state as FlowState | null
  return typeof state?.protoStep === 'number' ? state.protoStep : 0
}

export function PrototypeToolbar({ label = 'Prototype flow' }: Props) {
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)

  useEffect(() => {
    const state = window.history.state as FlowState | null
    if (typeof state?.protoStep !== 'number') {
      window.history.replaceState({ ...state, protoStep: 0 }, '')
    }

    function syncFromHistory() {
      const current = readStep()
      setStep(current)
      setMaxStep((max) => Math.max(max, current))
    }
    syncFromHistory()

    window.addEventListener('popstate', syncFromHistory)
    return () => window.removeEventListener('popstate', syncFromHistory)
  }, [])

  function goNext() {
    if (step < maxStep) {
      window.history.forward()
      return
    }
    const target = step + 1
    window.history.pushState({ protoStep: target }, '')
    setStep(target)
    setMaxStep(target)
  }

  return (
    <div className="prototype-toolbar" role="toolbar" aria-label="Prototype navigation">
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={step === 0}
        onClick={() => window.history.back()}
      >
        <BackArrowIcon size={16} />
        Back
      </button>
      <span className="prototype-toolbar__label">
        {label} · Step {step + 1}
      </span>
      <button className="prototype-toolbar__button" type="button" onClick={goNext}>
        Next
        <ChevronRightIcon size={16} />
      </button>
    </div>
  )
}
