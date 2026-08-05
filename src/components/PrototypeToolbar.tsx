import { useCallback, useEffect, useRef, useState } from 'react'
import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  label?: string
}

type FlowState = { protoStep?: number }

export function PrototypeToolbar({ label = 'Prototype flow' }: Props) {
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)

  const apply = useCallback((value: number) => {
    stepRef.current = value
    setStep(value)
  }, [])

  useEffect(() => {
    function sync() {
      const state = window.history.state as FlowState | null
      if (typeof state?.protoStep === 'number') {
        apply(state.protoStep)
      } else {
        window.history.replaceState({ ...state, protoStep: stepRef.current }, '')
      }
    }
    sync()

    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [apply])

  function goNext() {
    const target = stepRef.current + 1
    const state = window.history.state as FlowState | null
    window.history.pushState({ ...state, protoStep: target }, '')
    apply(target)
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
