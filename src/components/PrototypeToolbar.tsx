import { useEffect, useRef, useState } from 'react'
import { BackArrowIcon, ChevronRightIcon } from './Icons'

type Props = {
  label?: string
}

export function PrototypeToolbar({ label = 'Prototype flow' }: Props) {
  const [nav, setNav] = useState({ step: 0, steps: 0 })
  const programmatic = useRef(false)

  useEffect(() => {
    function onHashChange() {
      if (programmatic.current) {
        programmatic.current = false
        return
      }
      setNav(({ step }) => ({ step: step + 1, steps: step + 1 }))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function go(delta: number) {
    programmatic.current = true
    setNav((current) => ({ ...current, step: current.step + delta }))
    if (delta < 0) {
      window.history.back()
    } else {
      window.history.forward()
    }
  }

  return (
    <div className="prototype-toolbar" role="toolbar" aria-label="Prototype navigation">
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={nav.step === 0}
        onClick={() => go(-1)}
      >
        <BackArrowIcon size={16} />
        Back
      </button>
      <span className="prototype-toolbar__label">{label}</span>
      <button
        className="prototype-toolbar__button"
        type="button"
        disabled={nav.step === nav.steps}
        onClick={() => go(1)}
      >
        Next
        <ChevronRightIcon size={16} />
      </button>
    </div>
  )
}
