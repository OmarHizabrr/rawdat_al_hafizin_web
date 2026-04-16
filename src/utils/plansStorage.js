const PLANS_KEY = 'rh.plans.v1'

export function loadPlans() {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function savePlans(plans) {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans))
  } catch {
    /* ignore */
  }
}
