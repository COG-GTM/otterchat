import { BackArrowIcon, ChevronRightIcon } from './Icons'
import type { FlowStep } from '../data'

export type WebhookState = 'idle' | 'firing' | 'sent' | 'failed'

type Props = {
  step: number
  onStepChange: (step: number) => void
  steps: FlowStep[]
  webhookState: WebhookState
}

const webhookLabels: Record<WebhookState, string | null> = {
  idle: null,
  firing: 'Sending…',
  sent: 'Sent',
  failed: 'Failed to send',
}

export function PrototypeToolbar({ step, onStepChange, steps, webhookState }: Props) {
  const lastStep = Math.max(0, steps.length - 1)
  const current = steps[step]
  const webhookLabel = webhookLabels[webhookState]

  return (
    <div className="prototype-dock">
      {current.link ? (
        <a
          className="prototype-dock__eyebrow"
          href={current.link.href}
          target="_blank"
          rel="noreferrer"
        >
          {current.link.text}
          <ChevronRightIcon size={14} />
        </a>
      ) : null}
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
          {current.label}
          {webhookLabel ? (
            <span className={`prototype-toolbar__status prototype-toolbar__status--${webhookState}`}>
              {webhookLabel}
            </span>
          ) : null}
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
    </div>
  )
}
