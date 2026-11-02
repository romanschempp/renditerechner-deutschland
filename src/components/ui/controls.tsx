import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { num, parseNum } from '../../lib/format'

export function Info({ text }: { text: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <span className="info" ref={ref}>
      <button type="button" className="info__btn" aria-label="Erklärung" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        i
      </button>
      {open && <span className="info__pop" role="tooltip">{text}</span>}
    </span>
  )
}

export function Acc({ id, title, summary, children, defaultOpen = false, badge }: {
  id: string
  title: string
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
}) {
  const key = `acc-${id}`
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(key)
      return v == null ? defaultOpen : v === '1'
    } catch {
      return defaultOpen
    }
  })
  const bodyId = useId()
  const toggle = () => {
    setOpen((o) => {
      try { localStorage.setItem(key, o ? '0' : '1') } catch { /* egal */ }
      return !o
    })
  }
  return (
    <section className={`acc${open ? ' is-open' : ''}`} id={id}>
      <button type="button" className="acc__head" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
        <span className="acc__title">{title}{badge}</span>
        {summary != null && <span className="acc__sum">{summary}</span>}
        <span className="acc__chev" aria-hidden>›</span>
      </button>
      {open && <div className="acc__body" id={bodyId}>{children}</div>}
    </section>
  )
}

export function NumField({ label, value, onChange, unit, digits = 2, min, max, info, hint, wide, disabled, placeholder, plain }: {
  label: ReactNode
  value: number | null
  onChange: (v: number) => void
  unit?: string
  digits?: number
  min?: number
  max?: number
  info?: ReactNode
  hint?: ReactNode
  wide?: boolean
  disabled?: boolean
  placeholder?: string
  /** Ohne Tausenderpunkt (z. B. Jahreszahlen). */
  plain?: boolean
}) {
  const id = useId()
  const fmt = (v: number | null) => (v == null || !isFinite(v) ? '' : plain ? String(Math.round(v)) : num(v, digits))
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label htmlFor={id} className="field__label">
        <span>{label}</span>
        {info && <Info text={info} />}
      </label>
      <div className={`field__ctl${disabled ? ' is-disabled' : ''}`}>
        <input
          id={id}
          inputMode="decimal"
          value={focus ? text : fmt(value)}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={(e) => { setText(fmt(value)); setFocus(true); const t = e.currentTarget; requestAnimationFrame(() => t.select()) }}
          onBlur={() => setFocus(false)}
          onChange={(e) => {
            setText(e.target.value)
            const n = parseNum(e.target.value)
            if (n != null) onChange(clamp(n))
          }}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  )
}

export function TextField({ label, value, onChange, wide, info }: { label: ReactNode; value: string; onChange: (v: string) => void; wide?: boolean; info?: ReactNode }) {
  const id = useId()
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label htmlFor={id} className="field__label"><span>{label}</span>{info && <Info text={info} />}</label>
      <div className="field__ctl"><input id={id} value={value} onChange={(e) => onChange(e.target.value)} /></div>
    </div>
  )
}

export function SelectField<T extends string | number>({ label, value, options, onChange, wide, info, hint }: {
  label: ReactNode
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  wide?: boolean
  info?: ReactNode
  hint?: ReactNode
}) {
  const id = useId()
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label htmlFor={id} className="field__label"><span>{label}</span>{info && <Info text={info} />}</label>
      <div className="field__ctl field__ctl--select">
        <select id={id} value={String(value)} onChange={(e) => {
          const opt = options.find((o) => String(o.value) === e.target.value)
          if (opt) onChange(opt.value)
        }}>
          {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      </div>
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange, label, size = 'md', wide = true, info }: {
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
  label?: ReactNode
  size?: 'sm' | 'md'
  wide?: boolean
  info?: ReactNode
}) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      {label && <div className="field__label"><span>{label}</span>{info && <Info text={info} />}</div>}
      <div className={`seg seg--${size}`} role="radiogroup">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)} title={o.hint}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ label, checked, onChange, info, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; info?: ReactNode; hint?: ReactNode }) {
  const id = useId()
  return (
    <div className="field field--wide">
      <div className="toggle">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id}>{label}</label>
        {info && <Info text={info} />}
      </div>
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  )
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode }) {
  return <div className={`note note--${tone}`}>{children}</div>
}

export function Sub({ children }: { children: ReactNode }) {
  return <h4 className="sub">{children}</h4>
}

export function Line({ label, value, strong, info }: { label: ReactNode; value: ReactNode; strong?: boolean; info?: ReactNode }) {
  return (
    <div className={`line${strong ? ' line--strong' : ''}`}>
      <span>{label}{info && <Info text={info} />}</span>
      <span className="num">{value}</span>
    </div>
  )
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid">{children}</div>
}

export function Signed({ value, children }: { value: number | null | undefined; children: ReactNode }) {
  const cls = value == null || Math.abs(value) < 1e-9 ? '' : value < 0 ? 'neg' : 'pos'
  return <span className={cls}>{children}</span>
}
