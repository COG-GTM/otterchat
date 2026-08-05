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
        <span aria-hidden="true">&#8592;</span> Back
      </button>
      <span className="prototype-toolbar__label">{label}</span>
      <button
        className="prototype-toolbar__button"
        type="button"
        onClick={() => window.history.forward()}
      >
        Next <span aria-hidden="true">&#8594;</span>
      </button>
    </div>
  )
}
