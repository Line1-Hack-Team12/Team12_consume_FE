import Icon from './Icon'

/**
 * 진행 단계 표시
 * steps: [{ label, description?, status: 'done' | 'run' | 'todo' }]
 */
export default function Stepper({ steps }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        return (
          <li key={step.label} className="flex gap-3" aria-current={step.status === 'run' ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`flex size-6 items-center justify-center rounded-full ${
                  step.status === 'done' ? 'bg-success text-white' : step.status === 'run' ? 'bg-brand' : 'bg-subtle text-micro text-ink-3'
                }`}
              >
                {step.status === 'done' ? (
                  <Icon name="check" size={14} />
                ) : step.status === 'run' ? (
                  <span className="size-2 animate-pulse rounded-full bg-white" />
                ) : (
                  i + 1
                )}
              </span>
              {!last ? <span className={`my-0.5 w-0.5 flex-1 min-h-[18px] ${step.status === 'done' ? 'bg-success' : 'bg-line'}`} /> : null}
            </div>
            <div className={`min-w-0 flex-1 pt-0.5 ${last ? '' : 'pb-3'}`}>
              <p className={step.status === 'todo' ? 'text-body-m text-ink-3' : 'text-body-b'}>
                {step.label}
                <span className="sr-only">{step.status === 'done' ? ' (완료)' : step.status === 'run' ? ' (진행 중)' : ' (대기)'}</span>
              </p>
              {step.description ? (
                <p className={`text-caption ${step.status === 'run' ? 'text-brand' : 'text-ink-3'}`}>{step.description}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
