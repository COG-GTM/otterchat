import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  step: number
  onStepChange: (step: number) => void
  label?: string
  totalSteps?: number
}

export function PrototypeToolbar({
  step,
  onStepChange,
  label = 'Prototype flow',
  totalSteps = 3,
}: Props) {
  const stepCount = Math.max(1, totalSteps)
  const lastStep = stepCount - 1

  return (
    <div className="prototype-toolbar" role="toolbar" aria-label="Prototype navigation">
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={step === 0}
        onClick={() => onStepChange(Math.max(0, step - 1))}
      >
        <BackArrowIcon size={16} />
        Back
      </button>
      <span className="prototype-toolbar__label">
        {label} · Step {step + 1} of {stepCount}
      </span>
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={step === lastStep}
        onClick={() => onStepChange(Math.min(lastStep, step + 1))}
      >
        Next
        <ChevronRightIcon size={16} />
      </button>
    </div>
  )
}
