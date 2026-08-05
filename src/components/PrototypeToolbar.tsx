import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  label?: string
}

export function PrototypeToolbar({ label = 'Prototype flow' }: Props) {
  return (
    <div className="prototype-toolbar" role="toolbar" aria-label="Prototype navigation">
      <button
        className="prototype-toolbar__button"
        type="button"
        onClick={() => window.history.back()}
      >
        <BackArrowIcon size={16} />
        Back
      </button>
      <span className="prototype-toolbar__label">{label}</span>
      <button
        className="prototype-toolbar__button"
        type="button"
        onClick={() => window.history.forward()}
      >
        Next
        <ChevronRightIcon size={16} />
      </button>
    </div>
  )
}
