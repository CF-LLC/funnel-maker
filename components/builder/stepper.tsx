export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Pick a template', 'Edit', 'Publish']
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold sm:text-sm" aria-label="Create a funnel">
      {steps.map((s, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'now' : 'next'
        return (
          <li key={s} className="flex items-center gap-2" aria-current={state === 'now' ? 'step' : undefined}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${state === 'next' ? 'border text-muted-foreground' : 'bg-brand text-white'}`}>{state === 'done' ? '✓' : n}</span>
            <span className={state === 'next' ? 'text-muted-foreground' : ''}>{s}</span>
            {n < 3 && <span className="mx-1 h-px w-4 bg-border sm:w-8" />}
          </li>
        )
      })}
    </ol>
  )
}
