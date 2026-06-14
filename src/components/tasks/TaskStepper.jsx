import { Check } from 'lucide-react'
import { TASK_PROGRESS_STEPS } from '../../stores/useTasksStore.js'

function stepState(stepId, currentStepId) {
  const currentIdx = TASK_PROGRESS_STEPS.findIndex((s) => s.id === currentStepId)
  const stepIdx = TASK_PROGRESS_STEPS.findIndex((s) => s.id === stepId)
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'current'
  return 'upcoming'
}

export function TaskStepper({ currentStep, onStepClick }) {
  const currentIdx = TASK_PROGRESS_STEPS.findIndex((s) => s.id === currentStep)
  const clickable = typeof onStepClick === 'function'

  return (
    <nav aria-label="مراحل تقدّم الواجب" className="tw-w-full">
      <ol className="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-start sm:tw-gap-2">
        {TASK_PROGRESS_STEPS.map((step, index) => {
          const state = stepState(step.id, currentStep)
          const isLast = index === TASK_PROGRESS_STEPS.length - 1
          const connectorDone = index < currentIdx

          return (
            <li key={step.id} className="tw-flex tw-flex-1 tw-items-stretch tw-gap-3 sm:tw-flex-col sm:tw-items-center sm:tw-gap-2">
              <div className="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-3 sm:tw-w-full sm:tw-flex-col sm:tw-text-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onStepClick?.(step.id)}
                  className={[
                    'tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2 tw-text-sm tw-font-bold tw-transition',
                    state === 'done'
                      ? 'tw-border-emerald-500 tw-bg-emerald-500 tw-text-white'
                      : state === 'current'
                        ? 'tw-border-sky-500 tw-bg-sky-50 tw-text-sky-700 tw-ring-4 tw-ring-sky-100'
                        : 'tw-border-slate-200 tw-bg-white tw-text-slate-400',
                    clickable ? 'hover:tw-scale-105' : 'tw-cursor-default',
                  ].join(' ')}
                  aria-current={state === 'current' ? 'step' : undefined}
                  aria-label={`${step.label}${state === 'current' ? ' — المرحلة الحالية' : ''}`}
                >
                  {state === 'done' ? <Check size={18} strokeWidth={2.5} /> : index + 1}
                </button>
                <div className="tw-min-w-0">
                  <p
                    className={[
                      'tw-text-sm tw-font-bold',
                      state === 'current' ? 'tw-text-sky-700' : state === 'done' ? 'tw-text-emerald-700' : 'tw-text-slate-500',
                    ].join(' ')}
                  >
                    {step.label}
                  </p>
                  <p className="tw-text-xs tw-text-slate-500">{step.shortLabel}</p>
                </div>
              </div>

              {!isLast ? (
                <>
                  <div
                    aria-hidden
                    className={['tw-ms-5 tw-h-10 tw-w-0.5 tw-shrink-0 sm:tw-hidden', connectorDone ? 'tw-bg-emerald-400' : 'tw-bg-slate-200'].join(' ')}
                  />
                  <div
                    aria-hidden
                    className={[
                      'tw-hidden tw-h-0.5 tw-flex-1 tw-self-center sm:tw-block',
                      connectorDone ? 'tw-bg-emerald-400' : 'tw-bg-slate-200',
                    ].join(' ')}
                  />
                </>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
