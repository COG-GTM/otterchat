import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  step: number
  onStepChange: (step: number) => void
  steps: string[]
}

export function PrototypeToolbar({ step, onStepChange, steps }: Props) {
  const lastStep = Math.max(0, steps.length - 1)

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
      <span className="prototype-toolbar__label">{steps[step]}</span>
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
