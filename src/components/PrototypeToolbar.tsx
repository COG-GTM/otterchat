import { useState } from 'react'
import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  label?: string
  totalSteps?: number
}

export function PrototypeToolbar({ label = 'Prototype flow', totalSteps = 3 }: Props) {
  const [step, setStep] = useState(0)
  const lastStep = totalSteps - 1

  return (
    <div className="prototype-toolbar" role="toolbar" aria-label="Prototype navigation">
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={step === 0}
        onClick={() => setStep((current) => Math.max(0, current - 1))}
      >
        <BackArrowIcon size={16} />
        Back
      </button>
      <span className="prototype-toolbar__label">
        {label} · Step {step + 1} of {totalSteps}
      </span>
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={step === lastStep}
        onClick={() => setStep((current) => Math.min(lastStep, current + 1))}
      >
        Next
        <ChevronRightIcon size={16} />
      </button>
    </div>
  )
}
