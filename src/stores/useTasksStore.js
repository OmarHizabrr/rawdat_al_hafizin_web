import { create } from 'zustand'

/** مراحل تقدّم الواجب */
export const TASK_PROGRESS_STEPS = [
  { id: 'pending', label: 'قيد الانتظار', shortLabel: 'انتظار' },
  { id: 'in_progress', label: 'جاري التنفيذ', shortLabel: 'تنفيذ' },
  { id: 'review', label: 'مراجعة', shortLabel: 'مراجعة' },
  { id: 'done', label: 'مكتمل', shortLabel: 'مكتمل' },
]

export const TASK_STEP_IDS = TASK_PROGRESS_STEPS.map((s) => s.id)

const STEP_STORAGE_PREFIX = 'rh.taskSteps.'

function stepIndex(stepId) {
  const idx = TASK_STEP_IDS.indexOf(stepId)
  return idx >= 0 ? idx : 0
}

function loadStepOverrides(userId) {
  if (!userId) return {}
  try {
    const raw = localStorage.getItem(`${STEP_STORAGE_PREFIX}${userId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveStepOverrides(userId, overrides) {
  if (!userId) return
  try {
    localStorage.setItem(`${STEP_STORAGE_PREFIX}${userId}`, JSON.stringify(overrides))
  } catch {
    /* ignore */
  }
}

function mergeBuiltWithOverrides(builtTasks, overrides) {
  return (builtTasks || []).map((task) => {
    const builtStep = task.step
    const manual = overrides[task.id]
    let step = builtStep
    if (builtStep === 'done') {
      step = 'done'
    } else if (manual && TASK_STEP_IDS.includes(manual)) {
      step = manual
    }
    return { ...task, step, builtStep }
  })
}

export const useTasksStore = create((set, get) => ({
  tasks: [],
  activeTaskId: null,
  userId: '',
  stepOverrides: {},

  syncFromWorkspace: (builtTasks, userId) => {
    const uid = String(userId || '').trim()
    const overrides = loadStepOverrides(uid)
    const merged = mergeBuiltWithOverrides(builtTasks, overrides)
    const { activeTaskId } = get()
    const stillValid = merged.some((t) => t.id === activeTaskId)
    set({
      tasks: merged,
      userId: uid,
      stepOverrides: overrides,
      activeTaskId: stillValid ? activeTaskId : merged[0]?.id || null,
    })
  },

  setActiveTaskId: (id) => set({ activeTaskId: id }),

  setTaskStep: (taskId, step) => {
    const { userId, stepOverrides, tasks } = get()
    const nextOverrides = { ...stepOverrides, [taskId]: step }
    saveStepOverrides(userId, nextOverrides)
    set({
      stepOverrides: nextOverrides,
      tasks: tasks.map((t) => (t.id === taskId ? { ...t, step } : t)),
    })
  },

  advanceTask: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const idx = stepIndex(task.step)
    if (idx >= TASK_STEP_IDS.length - 1) return
    get().setTaskStep(taskId, TASK_STEP_IDS[idx + 1])
  },

  regressTask: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const idx = stepIndex(task.step)
    if (idx <= 0) return
    get().setTaskStep(taskId, TASK_STEP_IDS[idx - 1])
  },

  resetTaskToBuilt: (taskId) => {
    const { userId, stepOverrides, tasks } = get()
    const nextOverrides = { ...stepOverrides }
    delete nextOverrides[taskId]
    saveStepOverrides(userId, nextOverrides)
    set({
      stepOverrides: nextOverrides,
      tasks: tasks.map((t) =>
        t.id === taskId ? { ...t, step: t.builtStep ?? t.step } : t,
      ),
    })
  },
}))
