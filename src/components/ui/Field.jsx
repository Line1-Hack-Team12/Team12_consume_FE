import { useId } from 'react'
import Icon from './Icon'

const BOX =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-[13px] text-body-m text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-danger'

function Label({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-caption-m text-ink-2">
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
          <span className="sr-only">(필수)</span>
        </>
      ) : null}
    </label>
  )
}

function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 text-caption text-danger-ink">
      {children}
    </p>
  )
}

/** 네이티브 select · options: [{value, label}] */
export function SelectField({ label, required, error, options, placeholder, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${BOX} appearance-none pr-10`}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3" />
      </div>
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  )
}

export function TextField({ label, required, error, suffix, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${BOX} ${suffix ? 'pr-10' : ''}`}
          {...props}
        />
        {suffix ? <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-body-m text-ink-2">{suffix}</span> : null}
      </div>
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  )
}
