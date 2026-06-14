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
    <nav aria-label="مراحل تقدّم الواجب" className="rh-task-stepper">
      <ol className="rh-task-stepper__list">
        {TASK_PROGRESS_STEPS.map((step, index) => {
          const state = stepState(step.id, currentStep)
          const isLast = index === TASK_PROGRESS_STEPS.length - 1
          const connectorDone = index < currentIdx

          return (
            <li key={step.id} className="rh-task-stepper__item">
              <div className="rh-task-stepper__body">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onStepClick?.(step.id)}
                  className={[
                    'rh-task-stepper__dot',
                    state === 'done' ? 'rh-task-stepper__dot--done' : '',
                    state === 'current' ? 'rh-task-stepper__dot--current' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={state === 'current' ? 'step' : undefined}
                  aria-label={`${step.label}${state === 'current' ? ' — المرحلة الحالية' : ''}`}
                >
                  {state === 'done' ? <Check size={18} strokeWidth={2.5} /> : index + 1}
                </button>
                <div>
                  <p
                    className={[
                      'rh-task-stepper__label',
                      state === 'current' ? 'rh-task-stepper__label--current' : '',
                      state === 'done' ? 'rh-task-stepper__label--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {step.label}
                  </p>
                  <p className="rh-task-stepper__sublabel">{step.shortLabel}</p>
                </div>
              </div>

              {!isLast ? (
                <>
                  <div
                    aria-hidden
                    className={[
                      'rh-task-stepper__connector-v',
                      connectorDone ? 'rh-task-stepper__connector-v--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <div
                    aria-hidden
                    className={[
                      'rh-task-stepper__connector-h',
                      connectorDone ? 'rh-task-stepper__connector-h--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
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
