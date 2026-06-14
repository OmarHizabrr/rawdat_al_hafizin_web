import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { loadStudentWorkspaceMemberships } from '../services/studentWorkspaceService.js'
import { buildStudentTasks } from '../utils/buildStudentTasks.js'
import { subscribeAwrad } from '../utils/awradStorage.js'
import { subscribePlans } from '../utils/plansStorage.js'
import { getImpersonateUid } from '../utils/impersonation.js'
import { useTasksStore } from '../stores/useTasksStore.js'

const WORKSPACE_REFRESH_PREFIXES = [
  '/app/dashboard',
  '/app/tasks',
  '/app/plans',
  '/app/awrad',
  '/app/halakat',
  '/app/exams',
  '/app/activities',
  '/app/dawrat',
  '/app/reports',
  '/app',
]

/** تحميل بيانات الطالب الحية ومزامنة الواجبات مع Zustand */
export function useStudentWorkspace() {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const contextUserId = impersonateUid || user?.uid || ''

  const [plans, setPlans] = useState([])
  const [awrad, setAwrad] = useState([])
  const [memberships, setMemberships] = useState({
    halakat: [],
    exams: [],
    activities: [],
    dawrat: [],
    halakaSnapshots: [],
  })
  const [loadingMemberships, setLoadingMemberships] = useState(true)

  const syncFromWorkspace = useTasksStore((s) => s.syncFromWorkspace)
  const clearWorkspace = useTasksStore((s) => s.clearWorkspace)
  const setWorkspaceMeta = useTasksStore((s) => s.setWorkspaceMeta)

  const workspaceRefreshKey = useMemo(() => {
    const matches = WORKSPACE_REFRESH_PREFIXES.filter(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
    return matches.sort((a, b) => b.length - a.length)[0] || ''
  }, [pathname])

  useEffect(() => {
    if (!contextUserId) {
      clearWorkspace()
      return
    }
    setPlans([])
    setAwrad([])
    setMemberships({ halakat: [], exams: [], activities: [], dawrat: [], halakaSnapshots: [] })
    setLoadingMemberships(true)
  }, [contextUserId, clearWorkspace])

  useEffect(() => {
    if (!contextUserId) {
      setPlans([])
      setAwrad([])
      return undefined
    }
    const unsubP = subscribePlans(contextUserId, setPlans)
    const unsubA = subscribeAwrad(contextUserId, setAwrad)
    return () => {
      unsubP()
      unsubA()
    }
  }, [contextUserId])

  useEffect(() => {
    if (!contextUserId) {
      setMemberships({ halakat: [], exams: [], activities: [], dawrat: [], halakaSnapshots: [] })
      setLoadingMemberships(false)
      return undefined
    }

    let cancelled = false

    const refreshMemberships = () => {
      setLoadingMemberships(true)
      loadStudentWorkspaceMemberships(contextUserId)
        .then((data) => {
          if (!cancelled) {
            setMemberships({
              halakat: data.halakat || [],
              exams: data.exams || [],
              activities: data.activities || [],
              dawrat: data.dawrat || [],
              halakaSnapshots: data.halakaSnapshots || [],
            })
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingMemberships(false)
        })
    }

    refreshMemberships()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshMemberships()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [contextUserId, workspaceRefreshKey])

  const workspace = useMemo(
    () => ({
      plans,
      awrad,
      halakat: memberships.halakat,
      exams: memberships.exams,
      activities: memberships.activities,
      dawrat: memberships.dawrat,
      halakaSnapshots: memberships.halakaSnapshots,
    }),
    [plans, awrad, memberships],
  )

  const builtTasks = useMemo(() => buildStudentTasks(workspace), [workspace])

  useEffect(() => {
    if (!contextUserId) return
    syncFromWorkspace(builtTasks, contextUserId)
  }, [builtTasks, contextUserId, syncFromWorkspace])

  const loading = Boolean(contextUserId) && loadingMemberships

  useEffect(() => {
    setWorkspaceMeta({
      loading: Boolean(contextUserId) && loadingMemberships,
      plansCount: plans.length,
      halakatCount: memberships.halakat.length,
    })
  }, [contextUserId, loadingMemberships, plans.length, memberships.halakat.length, setWorkspaceMeta])

  return {
    contextUserId,
    workspace,
    builtTasks,
    loading,
    plansCount: plans.length,
    halakatCount: memberships.halakat.length,
  }
}
