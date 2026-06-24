import { ArrowRight, Ban, ChevronDown, Clock, Pause, Play, Plus, RotateCcw, Save, UserCheck, UserX, X } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, Modal, SearchField, TextAreaField, TextField, useToast } from '../ui/index.js'
import { loadAwrad } from '../utils/awradStorage.js'
import { aggregateVolumeProgress, lastWirdOverlappingVolume } from '../utils/halakaVolumeProgress.js'
import {
  HALAKA_ATTENDANCE_STATUSES,
  HALAKA_MEMBER_ROLES,
  HALAKA_SESSION_TYPES,
  addSessionTasmeeManualSeconds,
  computeSessionTasmeeDisplaySeconds,
  formatTasmeeDuration,
  formatTasmeeHistoryType,
  formatHalakaSessionDayLabel,
  countHalakaStudents,
  summarizeHalakaSessionAttendance,
  syncSessionAttendanceSummary,
  loadHalakat,
  loadHalakatMembersWithProfiles,
  loadHalakaSessions,
  loadSessionAttendance,
  parseTasmeeInput,
  splitTasmeeSeconds,
  startSessionTasmeeTimer,
  stopSessionTasmeeTimer,
  subscribeHalakaSession,
  upsertSessionAttendance,
} from '../utils/halakatStorage.js'
import { formatDateTimeMedium12Ar } from '../utils/formatDateTimeAr.js'
import { loadPlans } from '../utils/plansStorage.js'
import { exploreModalLink } from '../utils/exploreModalLink.js'

function roleCanWrite(role) {
  return role === HALAKA_MEMBER_ROLES.OWNER || role === HALAKA_MEMBER_ROLES.SUPERVISOR || role === HALAKA_MEMBER_ROLES.TEACHER
}
function attendanceStatusLabel(status) {
  if (status === HALAKA_ATTENDANCE_STATUSES.PRESENT) return 'حاضر'
  if (status === HALAKA_ATTENDANCE_STATUSES.ABSENT) return 'غائب'
  if (status === HALAKA_ATTENDANCE_STATUSES.EXCUSED) return 'غياب بعذر'
  if (status === HALAKA_ATTENDANCE_STATUSES.PERMITTED) return 'مستأذن'
  if (status === HALAKA_ATTENDANCE_STATUSES.LATE) return 'متأخر'
  return 'أخرى'
}
function sessionTypeLabel(t, other) {
  if (t === HALAKA_SESSION_TYPES.MEMORIZATION) return 'حفظ'
  if (t === HALAKA_SESSION_TYPES.REVIEW) return 'مراجعة'
  if (t === HALAKA_SESSION_TYPES.CONSOLIDATION) return 'تثبيت'
  if (t === HALAKA_SESSION_TYPES.READING) return 'قراءة'
  return other?.trim() ? `أخرى: ${other}` : 'أخرى'
}
function memberRoleLabel(role) {
  if (role === HALAKA_MEMBER_ROLES.STUDENT) return 'طالب'
  if (role === HALAKA_MEMBER_ROLES.TEACHER) return 'معلم'
  if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return 'مشرف'
  if (role === HALAKA_MEMBER_ROLES.OWNER) return 'مالك'
  return ''
}
function formatRecordedAt(iso) {
  const t = Date.parse(String(iso || ''))
  return Number.isFinite(t) ? formatDateTimeMedium12Ar(new Date(t)) : ''
}
function isRecordableStudent(row) {
  if (!row || row.role !== HALAKA_MEMBER_ROLES.STUDENT || row.excludedFromSession) return false
  if (row.attendanceStatus === HALAKA_ATTENDANCE_STATUSES.ABSENT) return false
  if (row.attendanceStatus === HALAKA_ATTENDANCE_STATUSES.EXCUSED) return false
  return true
}
function getNextRecordableStudentUid(currentUid, rows) {
  const eligible = rows.filter(isRecordableStudent)
  const idx = eligible.findIndex((r) => r.userId === currentUid)
  if (idx < 0 || idx >= eligible.length - 1) return ''
  return eligible[idx + 1].userId
}

export default function HalakaSessionWorkspacePage() {
  const { halakaId, sessionId } = useParams()
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { str } = useSiteContent()
  const toast = useToast()

  const [halaka, setHalaka] = useState(null)
  const [session, setSession] = useState(null)
  const [attendanceRows, setAttendanceRows] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [studentContexts, setStudentContexts] = useState({})
  const [dirtyRowIds, setDirtyRowIds] = useState(() => new Set())
  const [savingRowId, setSavingRowId] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const [editingEntryByUser, setEditingEntryByUser] = useState({})
  const [loading, setLoading] = useState(true)
  const [timerBusy, setTimerBusy] = useState(false)
  const [sessionManualMin, setSessionManualMin] = useState('')
  const [sessionManualSec, setSessionManualSec] = useState('')
  const [showSessionManual, setShowSessionManual] = useState(false)
  const [stopDistributeMode, setStopDistributeMode] = useState('none')
  const [assignStudentUid, setAssignStudentUid] = useState('')
  const [showSessionTasmeeHistory, setShowSessionTasmeeHistory] = useState(false)
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [activeStudentUid, setActiveStudentUid] = useState('')
  const [showTasmeePanel, setShowTasmeePanel] = useState(false)
  const [showBulkToolbar, setShowBulkToolbar] = useState(false)
  const [showStatsPanel, setShowStatsPanel] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 681px)').matches,
  )
  const [studentFilterQuery, setStudentFilterQuery] = useState('')

  useEffect(() => {
    if (!user?.uid || !halakaId || !sessionId) return
    setLoading(true)
    Promise.all([
      loadHalakat(user.uid),
      loadHalakaSessions(halakaId),
      loadSessionAttendance(halakaId, sessionId),
      loadHalakatMembersWithProfiles(halakaId),
    ])
      .then(([halakat, sessions, attendance, members]) => {
        setHalaka(halakat.find((x) => x.id === halakaId) || null)
        setSession(sessions.find((x) => x.id === sessionId) || null)
        setStudentCount(countHalakaStudents(members))
        const map = new Map(attendance.map((r) => [r.userId, r]))
        setAttendanceRows(
          members.map((m) => {
            const row = map.get(m.userId) || {}
            const manualParts = splitTasmeeSeconds(row.tasmeeManualSeconds)
            return {
              userId: m.userId,
              displayName: m.displayName || m.userId,
              photoURL: m.photoURL || '',
              role: m.role,
              attendanceStatus: row.attendanceStatus || HALAKA_ATTENDANCE_STATUSES.PRESENT,
              memorizationVolumeId: String(row.memorizationVolumeId || '').trim(),
              fromPage: row.fromPage ?? '',
              toPage: row.toPage ?? '',
              notes: row.notes || '',
              excludedFromSession: Boolean(row.excludedFromSession),
              entryHistory: Array.isArray(row.entryHistory) ? row.entryHistory : [],
              tasmeeSeconds: Math.max(0, Number(row.tasmeeSeconds) || 0),
              tasmeeAutoSeconds: Math.max(0, Number(row.tasmeeAutoSeconds) || 0),
              tasmeeManualMin: manualParts.minutes || '',
              tasmeeManualSec: manualParts.seconds || '',
              tasmeeHistory: Array.isArray(row.tasmeeHistory) ? row.tasmeeHistory : [],
            }
          }),
        )
        setDirtyRowIds(new Set())
      })
      .finally(() => setLoading(false))
  }, [user?.uid, halakaId, sessionId])

  useEffect(() => {
    if (!halakaId || !sessionId) return undefined
    return subscribeHalakaSession(
      halakaId,
      sessionId,
      (nextSession) => {
        if (nextSession) setSession(nextSession)
      },
      () => {},
    )
  }, [halakaId, sessionId])

  useEffect(() => {
    if (session?.tasmeeTimerStatus !== 'running') return undefined
    const id = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [session?.tasmeeTimerStatus, session?.tasmeeTimerStartedAt])

  const sessionTasmeeDisplaySeconds = useMemo(
    () => computeSessionTasmeeDisplaySeconds(session, timerNow),
    [session, timerNow],
  )
  const timerRunning = session?.tasmeeTimerStatus === 'running'

  const refreshSession = useCallback(async () => {
    const sessions = await loadHalakaSessions(halakaId)
    setSession(sessions.find((x) => x.id === sessionId) || null)
  }, [halakaId, sessionId])

  const syncAttendanceTasmeeFromServer = useCallback(async () => {
    const attendance = await loadSessionAttendance(halakaId, sessionId)
    const attendanceMap = new Map(attendance.map((r) => [r.userId, r]))
    setAttendanceRows((prev) =>
      prev.map((x) => {
        const saved = attendanceMap.get(x.userId)
        if (!saved) return x
        const manualParts = splitTasmeeSeconds(saved.tasmeeManualSeconds)
        return {
          ...x,
          tasmeeSeconds: Math.max(0, Number(saved.tasmeeSeconds) || 0),
          tasmeeAutoSeconds: Math.max(0, Number(saved.tasmeeAutoSeconds) || 0),
          tasmeeManualMin: manualParts.minutes || '',
          tasmeeManualSec: manualParts.seconds || '',
          tasmeeHistory: Array.isArray(saved.tasmeeHistory) ? saved.tasmeeHistory : [],
        }
      }),
    )
  }, [halakaId, sessionId])

  useEffect(() => {
    if (session?.tasmeeTimerStatus === 'running') setShowTasmeePanel(true)
  }, [session?.tasmeeTimerStatus])

  const studentFetchKey = activeStudentUid
  useEffect(() => {
    if (!studentFetchKey) return
    let cancelled = false
    Promise.all([loadPlans(studentFetchKey), loadAwrad(studentFetchKey)]).then(([plans, awrad]) => {
      if (!cancelled) setStudentContexts((prev) => ({ ...prev, [studentFetchKey]: { plans, awrad } }))
    })
    return () => {
      cancelled = true
    }
  }, [studentFetchKey])

  const canWrite = roleCanWrite(halaka?.halakaRole)
  const crossItems = [
    { to: '/app', label: str('layout.nav_home') },
    { to: '/app/halakat', label: str('layout.nav_halakat') },
    { to: `/app/halakat/${halakaId}/sessions`, label: 'جلسات الحلقة' },
    ...(canAccessPage('halakat_explore')
      ? [{ to: exploreModalLink('halakat'), label: str('layout.nav_halakat_explore') }]
      : []),
    ...(canAccessPage('remote_tasmee') ? [{ to: '/app/remote-tasmee', label: str('layout.nav_remote_tasmee') }] : []),
    ...(canAccessPage('remote_tasmee_explore')
      ? [{ to: exploreModalLink('remote_tasmee'), label: str('layout.nav_remote_tasmee_explore') }]
      : []),
    ...(canAccessPage('exams') ? [{ to: '/app/exams', label: str('layout.nav_exams') }] : []),
    ...(canAccessPage('exams_explore')
      ? [{ to: exploreModalLink('exams'), label: str('layout.nav_exams_explore') }]
      : []),
    ...(canAccessPage('activities') ? [{ to: '/app/activities', label: str('layout.nav_activities') }] : []),
    ...(canAccessPage('activities_explore')
      ? [{ to: exploreModalLink('activities'), label: str('layout.nav_activities_explore') }]
      : []),
  ]

  const summary = useMemo(() => {
    const memberRows = attendanceRows.map((r) => ({ userId: r.userId, role: r.role }))
    const attRows = attendanceRows.map((r) => ({
      userId: r.userId,
      attendanceStatus: r.attendanceStatus,
      excludedFromSession: r.excludedFromSession,
    }))
    const studentStats = summarizeHalakaSessionAttendance(memberRows, attRows)
    let pages = 0
    for (const r of attendanceRows) {
      if (r.role !== HALAKA_MEMBER_ROLES.STUDENT || r.excludedFromSession) continue
      const fp = Number(r.fromPage)
      const tp = Number(r.toPage)
      if (Number.isFinite(fp) && Number.isFinite(tp) && tp >= fp) pages += tp - fp + 1
    }
    return {
      studentCount: studentStats.studentCount,
      present: studentStats.present,
      absent: studentStats.absent,
      excused: studentStats.excused,
      late: studentStats.late,
      excluded: studentStats.excluded,
      notRecorded: studentStats.notRecorded,
      pages,
    }
  }, [attendanceRows])

  const eligibleTasmeeStudents = useMemo(
    () =>
      attendanceRows.filter(
        (r) =>
          r.role === HALAKA_MEMBER_ROLES.STUDENT &&
          !r.excludedFromSession &&
          r.attendanceStatus !== HALAKA_ATTENDANCE_STATUSES.ABSENT &&
          r.attendanceStatus !== HALAKA_ATTENDANCE_STATUSES.EXCUSED,
      ),
    [attendanceRows],
  )

  const studentNameByUid = useMemo(
    () => new Map(attendanceRows.map((r) => [r.userId, r.displayName || r.userId])),
    [attendanceRows],
  )

  const sessionTasmeeHistory = useMemo(() => {
    const list = Array.isArray(session?.tasmeeHistory) ? session.tasmeeHistory : []
    return [...list].reverse().slice(0, 12)
  }, [session?.tasmeeHistory])

  const activeRow = useMemo(
    () => (activeStudentUid ? attendanceRows.find((r) => r.userId === activeStudentUid) || null : null),
    [activeStudentUid, attendanceRows],
  )

  const quickAttendanceStatuses = useMemo(
    () => [
      HALAKA_ATTENDANCE_STATUSES.PRESENT,
      HALAKA_ATTENDANCE_STATUSES.ABSENT,
      HALAKA_ATTENDANCE_STATUSES.LATE,
      HALAKA_ATTENDANCE_STATUSES.EXCUSED,
    ],
    [],
  )

  const filteredAttendanceRows = useMemo(() => {
    const q = studentFilterQuery.trim().toLowerCase()
    if (!q) return attendanceRows
    return attendanceRows.filter((r) => (r.displayName || r.userId).toLowerCase().includes(q))
  }, [attendanceRows, studentFilterQuery])

  const nextRecordableUid = useMemo(() => {
    if (!activeStudentUid) return ''
    return getNextRecordableStudentUid(activeStudentUid, attendanceRows)
  }, [activeStudentUid, attendanceRows])

  const nextRecordableName = useMemo(() => {
    if (!nextRecordableUid) return ''
    return attendanceRows.find((r) => r.userId === nextRecordableUid)?.displayName || ''
  }, [attendanceRows, nextRecordableUid])

  useEffect(() => {
    if (!activeStudentUid) return undefined
    const id = window.requestAnimationFrame(() => {
      document.getElementById(`halaka-attendee-${activeStudentUid}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeStudentUid])

  const closeStudentModal = useCallback(() => {
    if (savingRowId) return
    setActiveStudentUid('')
    setEditingEntryByUser((prev) => {
      if (!activeStudentUid || !prev[activeStudentUid]) return prev
      const next = { ...prev }
      delete next[activeStudentUid]
      return next
    })
  }, [activeStudentUid, savingRowId])

  const openStudentModal = useCallback(
    (uid) => {
      if (activeStudentUid && activeStudentUid !== uid && dirtyRowIds.has(activeStudentUid)) {
        toast.info('احفظ أو أغلق سجل الطالب الحالي قبل فتح طالب آخر.', 'سجل الطالب')
        return
      }
      if (activeStudentUid && activeStudentUid !== uid) {
        setEditingEntryByUser((prev) => {
          if (!prev[activeStudentUid]) return prev
          const next = { ...prev }
          delete next[activeStudentUid]
          return next
        })
      }
      setActiveStudentUid(uid)
    },
    [activeStudentUid, dirtyRowIds, toast],
  )

  const rowPayload = (row) => {
    const fp = row.fromPage === '' ? null : Number(row.fromPage)
    const tp = row.toPage === '' ? null : Number(row.toPage)
    const payload = {
      attendanceStatus: row.attendanceStatus,
      memorizationVolumeId: row.memorizationVolumeId,
      fromPage: Number.isFinite(fp) && fp >= 1 ? fp : null,
      toPage: Number.isFinite(tp) && tp >= 1 ? tp : null,
      notes: row.notes,
      excludedFromSession: Boolean(row.excludedFromSession),
    }
    if (row.role === HALAKA_MEMBER_ROLES.STUDENT) {
      payload.tasmeeManualSeconds = parseTasmeeInput(row.tasmeeManualMin, row.tasmeeManualSec)
    }
    return payload
  }
  const buildEntryPayload = (row) => {
    const fp = Number(row.fromPage)
    const tp = Number(row.toPage)
    if (!row.memorizationVolumeId || !Number.isFinite(fp) || !Number.isFinite(tp) || tp < fp) return null
    return {
      memorizationVolumeId: row.memorizationVolumeId,
      fromPage: fp,
      toPage: tp,
      notes: row.notes,
    }
  }
  const nextSuggestedRange = (fromPage, toPage, cap) => {
    const fp = Number(fromPage)
    const tp = Number(toPage)
    if (!Number.isFinite(fp) || !Number.isFinite(tp) || tp < fp) return { fromPage: '', toPage: '' }
    const span = tp - fp + 1
    const nextFrom = cap > 0 ? Math.min(tp + 1, cap) : tp + 1
    const nextTo = cap > 0 ? Math.min(nextFrom + span - 1, cap) : nextFrom + span - 1
    return { fromPage: nextFrom, toPage: nextTo }
  }
  const updateRowDraft = useCallback((uid, patch) => {
    setAttendanceRows((prev) => prev.map((x) => (x.userId === uid ? { ...x, ...patch } : x)))
    setDirtyRowIds((prev) => new Set(prev).add(uid))
  }, [])
  const quickSetAttendance = useCallback(
    async (row, status) => {
      if (!canWrite || !user?.uid || row.attendanceStatus === status) return
      setAttendanceRows((prev) =>
        prev.map((x) => (x.userId === row.userId ? { ...x, attendanceStatus: status } : x)),
      )
      setSavingRowId(row.userId)
      try {
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, { attendanceStatus: status })
      } catch {
        setAttendanceRows((prev) =>
          prev.map((x) => (x.userId === row.userId ? { ...x, attendanceStatus: row.attendanceStatus } : x)),
        )
        toast.error('تعذر حفظ الحضور.', 'التحضير')
      } finally {
        setSavingRowId('')
      }
    },
    [canWrite, halakaId, sessionId, toast, user],
  )
  const applyBulkPatch = useCallback((patch, { includeExcluded = true, studentsOnly = false } = {}) => {
    setAttendanceRows((prev) => {
      const updated = prev.map((x) => {
        if (studentsOnly && x.role !== HALAKA_MEMBER_ROLES.STUDENT) return x
        if (!includeExcluded && x.excludedFromSession) return x
        return { ...x, ...patch }
      })
      const ids = updated
        .filter((x) => (!studentsOnly || x.role === HALAKA_MEMBER_ROLES.STUDENT) && (includeExcluded || !x.excludedFromSession))
        .map((x) => x.userId)
      setDirtyRowIds((d) => {
        const next = new Set(d)
        for (const id of ids) next.add(id)
        return next
      })
      return updated
    })
  }, [])
  const saveRow = useCallback(
    async (row) => {
      if (!canWrite || !user?.uid) return false
      const isEditing = Boolean(editingEntryByUser[row.userId])
      const entryPayload = row.role === HALAKA_MEMBER_ROLES.STUDENT ? buildEntryPayload(row) : null
      const isNewBatch = Boolean(entryPayload) && !isEditing
      const nextUid = isNewBatch ? getNextRecordableStudentUid(row.userId, attendanceRows) : ''
      setSavingRowId(row.userId)
      try {
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, {
          ...rowPayload(row),
          appendEntry: Boolean(entryPayload) && !isEditing,
          entryPayload,
          updateEntry: isEditing
            ? {
                id: editingEntryByUser[row.userId],
                memorizationVolumeId: row.memorizationVolumeId,
                fromPage: row.fromPage,
                toPage: row.toPage,
                notes: row.notes,
              }
            : null,
        })
        if (isEditing && entryPayload) {
          setAttendanceRows((prev) =>
            prev.map((x) =>
              x.userId === row.userId
                ? {
                    ...x,
                    entryHistory: (Array.isArray(x.entryHistory) ? x.entryHistory : []).map((h) =>
                      h.id === editingEntryByUser[row.userId]
                        ? { ...h, ...entryPayload, pagesCount: entryPayload.toPage - entryPayload.fromPage + 1 }
                        : h,
                    ),
                    ...nextSuggestedRange(entryPayload.fromPage, entryPayload.toPage, VOLUME_BY_ID[entryPayload.memorizationVolumeId]?.pages || 0),
                    notes: '',
                  }
                : x,
            ),
          )
          setEditingEntryByUser((prev) => ({ ...prev, [row.userId]: '' }))
          toast.success('تم تحديث الدفعة.', 'تم')
        } else if (entryPayload) {
          const nextRange = nextSuggestedRange(entryPayload.fromPage, entryPayload.toPage, VOLUME_BY_ID[entryPayload.memorizationVolumeId]?.pages || 0)
          setAttendanceRows((prev) =>
            prev.map((x) =>
              x.userId === row.userId
                ? {
                    ...x,
                    entryHistory: [
                      ...(Array.isArray(x.entryHistory) ? x.entryHistory : []),
                      {
                        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        memorizationVolumeId: entryPayload.memorizationVolumeId,
                        fromPage: entryPayload.fromPage,
                        toPage: entryPayload.toPage,
                        pagesCount: entryPayload.toPage - entryPayload.fromPage + 1,
                        notes: entryPayload.notes || '',
                        recordedAt: new Date().toISOString(),
                      },
                    ],
                    fromPage: nextRange.fromPage,
                    toPage: nextRange.toPage,
                    notes: '',
                  }
                : x,
            ),
          )
        }
        setDirtyRowIds((prev) => {
          const n = new Set(prev)
          n.delete(row.userId)
          return n
        })
        if (row.role === HALAKA_MEMBER_ROLES.STUDENT) {
          const manualSeconds = parseTasmeeInput(row.tasmeeManualMin, row.tasmeeManualSec)
          setAttendanceRows((prev) =>
            prev.map((x) =>
              x.userId === row.userId
                ? {
                    ...x,
                    tasmeeManualMin: splitTasmeeSeconds(manualSeconds).minutes || '',
                    tasmeeManualSec: splitTasmeeSeconds(manualSeconds).seconds || '',
                    tasmeeSeconds: manualSeconds + Math.max(0, Number(x.tasmeeAutoSeconds) || 0),
                  }
                : x,
            ),
          )
        }
        if (isNewBatch) {
          if (nextUid) {
            const nextName = attendanceRows.find((r) => r.userId === nextUid)?.displayName || 'الطالب'
            setActiveStudentUid(nextUid)
            setEditingEntryByUser((prev) => {
              if (!prev[row.userId]) return prev
              const next = { ...prev }
              delete next[row.userId]
              return next
            })
            toast.success(`تم التسجيل. التالي: ${nextName}`, 'تم')
          } else {
            setActiveStudentUid('')
            toast.success('تم تسجيل الدفعة. انتهت قائمة الطلاب.', 'تم')
          }
        } else if (!isEditing) {
          setActiveStudentUid('')
        }
        return true
      } catch {
        toast.error('تعذر حفظ السجل.', 'تم')
        return false
      } finally {
        setSavingRowId('')
      }
    },
    [attendanceRows, canWrite, editingEntryByUser, halakaId, sessionId, toast, user],
  )
  const handleTimerStart = useCallback(async () => {
    if (!canWrite || !user?.uid || timerBusy) return
    setTimerBusy(true)
    try {
      await startSessionTasmeeTimer(user, halakaId, sessionId)
      await refreshSession()
      toast.success('بدأ مؤقت التسميع.', 'مؤقت التسميع')
    } catch (e) {
      toast.error(e?.message === 'TIMER_ALREADY_RUNNING' ? 'المؤقت يعمل بالفعل.' : 'تعذر تشغيل المؤقت.', 'مؤقت التسميع')
    } finally {
      setTimerBusy(false)
    }
  }, [canWrite, halakaId, refreshSession, sessionId, timerBusy, toast, user])
  const handleTimerStop = useCallback(async () => {
    if (!canWrite || !user?.uid || timerBusy) return
    if (stopDistributeMode === 'assign_student' && !assignStudentUid) {
      toast.info('اختر الطالب قبل إيقاف المؤقت.', 'مؤقت التسميع')
      return
    }
    setTimerBusy(true)
    try {
      const result = await stopSessionTasmeeTimer(user, halakaId, sessionId, {
        distributeMode: stopDistributeMode === 'none' ? undefined : stopDistributeMode,
        assignToStudentUid: stopDistributeMode === 'assign_student' ? assignStudentUid : undefined,
      })
      await syncAttendanceTasmeeFromServer()
      if (stopDistributeMode === 'assign_student' && assignStudentUid) {
        toast.success(
          `أُوقف المؤقت وأُسند ${formatTasmeeDuration(result?.elapsedSeconds || 0)} إلى ${studentNameByUid.get(assignStudentUid) || 'الطالب'}.`,
          'مؤقت التسميع',
        )
      } else if (stopDistributeMode === 'equal_present') {
        toast.success(`أُوقف المؤقت ووُزّع ${formatTasmeeDuration(result?.elapsedSeconds || 0)} على الحاضرين.`, 'مؤقت التسميع')
      } else {
        toast.success(`أُوقف المؤقت (+${formatTasmeeDuration(result?.elapsedSeconds || 0)}).`, 'مؤقت التسميع')
      }
    } catch (e) {
      toast.error(e?.message === 'TIMER_NOT_RUNNING' ? 'المؤقت غير شغّال.' : 'تعذر إيقاف المؤقت.', 'مؤقت التسميع')
    } finally {
      setTimerBusy(false)
    }
  }, [assignStudentUid, canWrite, halakaId, sessionId, stopDistributeMode, studentNameByUid, syncAttendanceTasmeeFromServer, timerBusy, toast, user])
  const handleSessionManualAdd = useCallback(async () => {
    if (!canWrite || !user?.uid || timerBusy) return
    const seconds = parseTasmeeInput(sessionManualMin, sessionManualSec)
    if (seconds <= 0) {
      toast.info('أدخل وقتاً يدوياً صالحاً.', 'وقت التسميع')
      return
    }
    setTimerBusy(true)
    try {
      await addSessionTasmeeManualSeconds(user, halakaId, sessionId, seconds)
      await refreshSession()
      setSessionManualMin('')
      setSessionManualSec('')
      setShowSessionManual(false)
      toast.success(`أُضيف ${formatTasmeeDuration(seconds)} لإجمالي الجلسة.`, 'وقت التسميع')
    } catch {
      toast.error('تعذر إضافة الوقت اليدوي.', 'وقت التسميع')
    } finally {
      setTimerBusy(false)
    }
  }, [canWrite, halakaId, refreshSession, sessionId, sessionManualMin, sessionManualSec, timerBusy, toast, user])
  const saveTasmeeRow = useCallback(
    async (row) => {
      if (!canWrite || !user?.uid || row.role !== HALAKA_MEMBER_ROLES.STUDENT) return
      setSavingRowId(row.userId)
      try {
        const manualSeconds = parseTasmeeInput(row.tasmeeManualMin, row.tasmeeManualSec)
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, {
          tasmeeManualSeconds: manualSeconds,
        })
        const attendance = await loadSessionAttendance(halakaId, sessionId)
        const saved = attendance.find((r) => r.userId === row.userId)
        setAttendanceRows((prev) =>
          prev.map((x) =>
            x.userId === row.userId
              ? {
                  ...x,
                  tasmeeManualMin: splitTasmeeSeconds(manualSeconds).minutes || '',
                  tasmeeManualSec: splitTasmeeSeconds(manualSeconds).seconds || '',
                  tasmeeSeconds: manualSeconds + Math.max(0, Number(x.tasmeeAutoSeconds) || 0),
                  tasmeeHistory: Array.isArray(saved?.tasmeeHistory) ? saved.tasmeeHistory : x.tasmeeHistory,
                }
              : x,
          ),
        )
        toast.success('تم حفظ وقت التسميع للطالب.', 'وقت التسميع')
      } catch {
        toast.error('تعذر حفظ وقت التسميع.', 'وقت التسميع')
      } finally {
        setSavingRowId('')
      }
    },
    [canWrite, halakaId, sessionId, toast, user],
  )
  const saveAll = useCallback(async () => {
    if (!canWrite || dirtyRowIds.size === 0 || !user?.uid) return
    setSavingAll(true)
    try {
      for (const row of attendanceRows.filter((x) => dirtyRowIds.has(x.userId))) {
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, rowPayload(row), {
          syncSummary: false,
        })
      }
      const synced = await syncSessionAttendanceSummary(halakaId, sessionId)
      if (synced?.attendanceSummary) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                sessionDayYmd: synced.sessionDayYmd,
                attendanceSummary: synced.attendanceSummary,
              }
            : prev,
        )
      }
      setDirtyRowIds(new Set())
      toast.success('تم حفظ تعديلات الجلسة.', 'تم')
    } finally {
      setSavingAll(false)
    }
  }, [attendanceRows, canWrite, dirtyRowIds, halakaId, sessionId, toast, user])
  const deleteEntry = useCallback(
    async (row, entryId) => {
      if (!canWrite || !entryId || !user?.uid) return
      setSavingRowId(row.userId)
      try {
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, {
          ...rowPayload(row),
          removeEntryId: entryId,
        })
        setAttendanceRows((prev) =>
          prev.map((x) =>
            x.userId === row.userId
              ? { ...x, entryHistory: (Array.isArray(x.entryHistory) ? x.entryHistory : []).filter((h) => h.id !== entryId) }
              : x,
          ),
        )
      } finally {
        setSavingRowId('')
      }
    },
    [canWrite, halakaId, sessionId, user],
  )

  if (loading) return <p className="rh-halaka-sessions__state">جاري التحميل…</p>
  if (!halaka || !session) return <p className="rh-halaka-sessions__state">تعذر العثور على الجلسة.</p>

  return (
    <div className="rh-plans rh-halaka-sessions">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">صفحة الجلسة: {session.title || 'جلسة حلقة'}</h1>
            <p className="rh-plans__desc rh-halaka-sessions__lead">سجّل حضور الطلاب من البطاقات، ثم افتح سجل كل طالب على حدة لتسجيل الحفظ والتسميع دون ازدحام الشاشة.</p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <HapticLink to={`/app/halakat/${halakaId}/sessions`} className="rh-halaka-sessions__hero-back ui-btn ui-btn--secondary">
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
            العودة للجلسات
          </HapticLink>
        </div>
      </header>

      <section className="rh-settings-card">
        <p className="rh-settings-card__subtitle rh-halaka-sessions__session-subtitle">
          يوم الجلسة:{' '}
          <strong>{formatHalakaSessionDayLabel(session.sessionDayYmd || '')}</strong>
          {' — '}
          النوع: <strong>{sessionTypeLabel(session.sessionType, session.sessionTypeOtherLabel)}</strong>
          {' — '}
          {formatDateTimeMedium12Ar(session.startedAt)}
        </p>
        <div
          className={[
            'rh-halaka-sessions__stats-wrap',
            showStatsPanel ? 'rh-halaka-sessions__stats-wrap--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            type="button"
            className="rh-halaka-sessions__stats-toggle"
            onClick={() => setShowStatsPanel((v) => !v)}
            aria-expanded={showStatsPanel}
          >
            <RhIcon
              as={ChevronDown}
              size={16}
              strokeWidth={RH_ICON_STROKE}
              className={showStatsPanel ? 'rh-halaka-sessions__panel-toggle--open' : ''}
            />
            <span>
              ملخص الجلسة — حاضر <strong>{summary.present}</strong> · غائب <strong>{summary.absent}</strong> ·{' '}
              {summary.pages} صفحة
            </span>
          </button>
          <div className="rh-halaka-sessions__stats rh-halaka-sessions__stats--collapsible">
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.studentCount || studentCount}</span><span className="rh-halaka-sessions__stat-label">طلاب الحلقة</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.present}</span><span className="rh-halaka-sessions__stat-label">حاضر</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.absent}</span><span className="rh-halaka-sessions__stat-label">غائب</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.excused}</span><span className="rh-halaka-sessions__stat-label">بعذر</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.late}</span><span className="rh-halaka-sessions__stat-label">متأخر</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.excluded}</span><span className="rh-halaka-sessions__stat-label">مستثنى</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.pages}</span><span className="rh-halaka-sessions__stat-label">صفحات مرصودة</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{formatTasmeeDuration(sessionTasmeeDisplaySeconds)}</span><span className="rh-halaka-sessions__stat-label">وقت التسميع</span></div>
          </div>
        </div>
        <div className="rh-halaka-sessions__tasmee-bar rh-halaka-sessions__tasmee-bar--compact">
          <div className="rh-halaka-sessions__tasmee-display">
            <RhIcon as={Clock} size={18} strokeWidth={RH_ICON_STROKE} />
            <span className="rh-halaka-sessions__tasmee-time">{formatTasmeeDuration(sessionTasmeeDisplaySeconds)}</span>
            <span className={`rh-plans__saved-badge${timerRunning ? ' rh-halaka-sessions__tasmee-badge--running' : ''}`}>
              {timerRunning ? 'يعمل الآن' : 'متوقف'}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={ChevronDown}
              className={showTasmeePanel ? 'rh-halaka-sessions__panel-toggle rh-halaka-sessions__panel-toggle--open' : 'rh-halaka-sessions__panel-toggle'}
              onClick={() => setShowTasmeePanel((v) => !v)}
            >
              {showTasmeePanel ? 'إخفاء أدوات التسميع' : 'أدوات التسميع'}
            </Button>
          </div>
          {showTasmeePanel ? (
            <>
          <div className="rh-halaka-sessions__tasmee-actions">
            <Button
              type="button"
              variant={timerRunning ? 'secondary' : 'primary'}
              icon={timerRunning ? Pause : Play}
              loading={timerBusy}
              disabled={!canWrite}
              onClick={() => {
                if (timerRunning && stopDistributeMode === 'assign_student' && !assignStudentUid) {
                  toast.info('اختر الطالب قبل إيقاف المؤقت.', 'مؤقت التسميع')
                  return
                }
                if (timerRunning) handleTimerStop()
                else handleTimerStart()
              }}
            >
              {timerRunning ? 'إيقاف المؤقت' : 'بدء المؤقت'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Clock}
              disabled={!canWrite || timerBusy}
              onClick={() => setShowSessionManual((v) => !v)}
            >
              إضافة وقت يدوي
            </Button>
          </div>
          {timerRunning ? (
            <div className="rh-halaka-sessions__tasmee-stop-options">
              <label className="ui-field">
                <span className="ui-field__label">عند الإيقاف</span>
                <select
                  className="ui-input"
                  value={stopDistributeMode}
                  disabled={!canWrite || timerBusy}
                  onChange={(e) => {
                    setStopDistributeMode(e.target.value)
                    if (e.target.value !== 'assign_student') setAssignStudentUid('')
                  }}
                >
                  <option value="none">إضافة للجلسة فقط</option>
                  <option value="equal_present">توزيع بالتساوي على الحاضرين</option>
                  <option value="assign_student">إسناد كامل لطالب محدد</option>
                </select>
              </label>
              {stopDistributeMode === 'assign_student' ? (
                <label className="ui-field">
                  <span className="ui-field__label">الطالب</span>
                  <select
                    className="ui-input"
                    value={assignStudentUid}
                    disabled={!canWrite || timerBusy || eligibleTasmeeStudents.length === 0}
                    onChange={(e) => setAssignStudentUid(e.target.value)}
                  >
                    <option value="">اختر الطالب</option>
                    {eligibleTasmeeStudents.map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {sessionTasmeeHistory.length ? (
            <div className="rh-halaka-sessions__tasmee-history-block">
              <button
                type="button"
                className="rh-halaka-sessions__history-toggle"
                onClick={() => setShowSessionTasmeeHistory((v) => !v)}
              >
                سجل وقت التسميع للجلسة ({sessionTasmeeHistory.length})
              </button>
              {showSessionTasmeeHistory ? (
                <ul className="rh-halaka-sessions__tasmee-history-list">
                  {sessionTasmeeHistory.map((h) => (
                    <li key={h.id || `${h.at}_${h.type}`} className="rh-halaka-sessions__tasmee-history-item">
                      {formatRecordedAt(h.at)} — {formatTasmeeHistoryType(h.type)}
                      {Math.max(0, Number(h.seconds) || 0) > 0 ? ` — ${formatTasmeeDuration(h.seconds)}` : ''}
                      {h.targetUid ? ` — ${studentNameByUid.get(h.targetUid) || h.targetUid}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {showSessionManual ? (
            <div className="rh-halaka-sessions__tasmee-manual">
              <TextField label="دقائق" type="number" min={0} value={sessionManualMin} onChange={(e) => setSessionManualMin(e.target.value)} />
              <TextField label="ثوانٍ" type="number" min={0} max={59} value={sessionManualSec} onChange={(e) => setSessionManualSec(e.target.value)} />
              <Button type="button" size="sm" variant="primary" icon={Save} loading={timerBusy} disabled={!canWrite} onClick={handleSessionManualAdd}>
                إضافة للجلسة
              </Button>
            </div>
          ) : null}
            </>
          ) : null}
        </div>
        <div className="rh-halaka-sessions__toolbar-wrap">
          <button
            type="button"
            className="rh-halaka-sessions__toolbar-toggle"
            onClick={() => setShowBulkToolbar((v) => !v)}
          >
            <RhIcon as={ChevronDown} size={16} strokeWidth={RH_ICON_STROKE} className={showBulkToolbar ? 'rh-halaka-sessions__panel-toggle--open' : ''} />
            أدوات المجموعة {dirtyRowIds.size > 0 ? `(${dirtyRowIds.size} غير محفوظ)` : ''}
          </button>
          {showBulkToolbar ? (
        <div className="rh-halaka-sessions__toolbar">
          <Button type="button" variant="secondary" icon={Ban} disabled={!canWrite || savingAll} onClick={() => applyBulkPatch({ excludedFromSession: true })}>
            استثناء الكل
          </Button>
          <Button type="button" variant="secondary" icon={RotateCcw} disabled={!canWrite || savingAll} onClick={() => applyBulkPatch({ excludedFromSession: false })}>
            إلغاء استثناء الكل
          </Button>
          <Button type="button" variant="secondary" icon={UserCheck} disabled={!canWrite || savingAll} onClick={() => applyBulkPatch({ attendanceStatus: HALAKA_ATTENDANCE_STATUSES.PRESENT }, { includeExcluded: false, studentsOnly: true })}>
            كل الطلاب حاضر
          </Button>
          <Button type="button" variant="secondary" icon={UserX} disabled={!canWrite || savingAll} onClick={() => applyBulkPatch({ attendanceStatus: HALAKA_ATTENDANCE_STATUSES.ABSENT }, { includeExcluded: false, studentsOnly: true })}>
            كل الطلاب غائب
          </Button>
          <Button type="button" variant="primary" icon={Save} loading={savingAll} disabled={!canWrite || dirtyRowIds.size === 0} onClick={saveAll}>
            حفظ الكل ({dirtyRowIds.size})
          </Button>
        </div>
          ) : null}
        </div>
        <p className="rh-halaka-sessions__callout">اضغط أزرار الحضور للحفظ الفوري، ثم «تسجيل» لفتح سجل الطالب للحفظ والتسميع.</p>
        <div className="rh-halaka-sessions__students-head">
          <h2 className="rh-halaka-sessions__students-title">
            قائمة الأعضاء
            <span className="rh-halaka-sessions__students-count">{attendanceRows.length}</span>
          </h2>
          <SearchField
            className="rh-halaka-sessions__students-search"
            label="بحث عن طالب"
            placeholder="اسم الطالب…"
            value={studentFilterQuery}
            onChange={(e) => setStudentFilterQuery(e.target.value)}
          />
        </div>
        {filteredAttendanceRows.length === 0 ? (
          <p className="rh-halaka-sessions__empty">لا يوجد عضو مطابق للبحث.</p>
        ) : (
        <ul className="rh-halaka-sessions__attendee-list">
          {filteredAttendanceRows.map((row) => {
            const isStudent = row.role === HALAKA_MEMBER_ROLES.STUDENT
            const history = Array.isArray(row.entryHistory) ? row.entryHistory : []
            const historyPages = history.reduce((sum, h) => sum + Math.max(0, Number(h.pagesCount) || 0), 0)
            const lastEntry = history.length ? history[history.length - 1] : null
            return (
              <li
                key={row.userId}
                id={`halaka-attendee-${row.userId}`}
                className={[
                  'rh-halaka-sessions__attendee',
                  'rh-halaka-sessions__attendee--compact',
                  isStudent ? 'rh-halaka-sessions__attendee--student' : '',
                  row.excludedFromSession ? 'rh-halaka-sessions__attendee--excluded' : '',
                  dirtyRowIds.has(row.userId) ? 'rh-halaka-sessions__attendee--dirty' : '',
                  activeStudentUid === row.userId ? 'rh-halaka-sessions__attendee--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="rh-halaka-sessions__attendee-summary">
                  <div className="rh-halaka-sessions__attendee-head">
                    <span className="rh-halaka-sessions__avatar" aria-hidden>
                      {row.photoURL ? <img src={row.photoURL} alt="" loading="lazy" /> : (row.displayName || row.userId).trim().slice(0, 1)}
                    </span>
                    <div className="rh-halaka-sessions__attendee-meta">
                      <span className="rh-halaka-sessions__attendee-name">{row.displayName}</span>
                      <div className="rh-halaka-sessions__attendee-badges">
                        <span className="rh-plans__saved-badge">{memberRoleLabel(row.role)}</span>
                        <span
                          className={[
                            'rh-plans__saved-badge',
                            `rh-halaka-sessions__status-badge rh-halaka-sessions__status-badge--${row.attendanceStatus}`,
                          ].join(' ')}
                        >
                          {attendanceStatusLabel(row.attendanceStatus)}
                        </span>
                        {row.excludedFromSession ? <span className="rh-plans__saved-badge">مستثنى</span> : null}
                        {dirtyRowIds.has(row.userId) ? <span className="rh-plans__saved-badge">غير محفوظ</span> : null}
                      </div>
                      {isStudent && !row.excludedFromSession ? (
                        <p className="rh-halaka-sessions__attendee-stats">
                          {history.length > 0 ? (
                            <>
                              {history.length} تسجيل — {historyPages} صفحة
                              {lastEntry
                                ? ` — آخر: ${VOLUME_BY_ID[lastEntry.memorizationVolumeId]?.label || ''} (${lastEntry.fromPage}–${lastEntry.toPage})`
                                : ''}
                            </>
                          ) : (
                            'لم يُسجَّل حفظ بعد'
                          )}
                          {row.tasmeeSeconds > 0 ? ` — تسميع: ${formatTasmeeDuration(row.tasmeeSeconds)}` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {!row.excludedFromSession ? (
                    <div className="rh-halaka-sessions__attendance-chips" role="group" aria-label="الحضور السريع">
                      {quickAttendanceStatuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={[
                            'rh-halaka-sessions__attendance-chip',
                            row.attendanceStatus === status ? 'rh-halaka-sessions__attendance-chip--active' : '',
                            savingRowId === row.userId ? 'rh-halaka-sessions__attendance-chip--saving' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={!canWrite || savingRowId === row.userId}
                          onClick={() => quickSetAttendance(row, status)}
                        >
                          {attendanceStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="rh-halaka-sessions__attendee-actions">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      disabled={!canWrite}
                      onClick={() => openStudentModal(row.userId)}
                    >
                      {isStudent ? 'تسجيل' : 'تحضير'}
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        )}
      </section>

      <Modal
        open={Boolean(activeRow)}
        title={activeRow ? `سجل: ${activeRow.displayName}` : ''}
        onClose={closeStudentModal}
        size="lg"
        className="rh-halaka-sessions-student-modal"
        closeOnBackdrop={!savingRowId}
        closeOnEsc={!savingRowId}
        showClose={!savingRowId}
        contentClassName="rh-halaka-sessions__student-modal"
      >
        {activeRow ? (() => {
          const row = activeRow
          const isStudent = row.role === HALAKA_MEMBER_ROLES.STUDENT
          const volId = row.memorizationVolumeId
          const ctx = studentContexts[row.userId]
          const agg = volId && ctx ? aggregateVolumeProgress(volId, ctx.plans, ctx.awrad) : null
          const lastW = volId && ctx ? lastWirdOverlappingVolume(volId, ctx.plans, ctx.awrad) : null
          const cap = volId ? VOLUME_BY_ID[volId]?.pages || 0 : 0
          const history = Array.isArray(row.entryHistory) ? row.entryHistory : []
          return (
            <div className="rh-halaka-sessions__attendee-form rh-halaka-sessions__attendee-form--modal">
              <div className="rh-halaka-sessions__attendee-form-body">
              <label className="ui-field">
                <span className="ui-field__label">استثناء من العملية</span>
                <select
                  className="ui-input"
                  value={row.excludedFromSession ? 'yes' : 'no'}
                  disabled={!canWrite}
                  onChange={(e) => updateRowDraft(row.userId, { excludedFromSession: e.target.value === 'yes' })}
                >
                  <option value="no">مشارك</option>
                  <option value="yes">مستثنى</option>
                </select>
              </label>
              <label className="ui-field">
                <span className="ui-field__label">الحضور</span>
                <select
                  className="ui-input"
                  value={row.attendanceStatus}
                  disabled={!canWrite || row.excludedFromSession}
                  onChange={(e) => updateRowDraft(row.userId, { attendanceStatus: e.target.value })}
                >
                  {Object.values(HALAKA_ATTENDANCE_STATUSES).map((s) => (
                    <option key={s} value={s}>
                      {attendanceStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              {isStudent && !row.excludedFromSession ? (
                <>
                  <label className="ui-field">
                    <span className="ui-field__label">المجلد</span>
                    <select
                      className="ui-input"
                      value={volId}
                      disabled={!canWrite}
                      onChange={(e) => updateRowDraft(row.userId, { memorizationVolumeId: e.target.value })}
                    >
                      <option value="">اختر المجلد</option>
                      {VOLUMES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {volId ? (
                    <p className="ui-field__hint">
                      صفحات الكتاب: {VOLUME_BY_ID[volId]?.pages || 0}
                      {agg ? ` — من الخطط: ${agg.totalPagesSum}` : ''}
                    </p>
                  ) : null}
                  <div className="rh-halaka-sessions__field-row">
                    <TextField
                      label="من صفحة"
                      type="number"
                      min={1}
                      max={cap || undefined}
                      value={row.fromPage === '' ? '' : String(row.fromPage)}
                      onChange={(e) =>
                        updateRowDraft(row.userId, {
                          fromPage: e.target.value === '' ? '' : Math.min(Math.max(1, Number(e.target.value)), cap || 999999),
                        })
                      }
                    />
                    <TextField
                      label="إلى صفحة"
                      type="number"
                      min={1}
                      max={cap || undefined}
                      value={row.toPage === '' ? '' : String(row.toPage)}
                      onChange={(e) =>
                        updateRowDraft(row.userId, {
                          toPage: e.target.value === '' ? '' : Math.min(Math.max(1, Number(e.target.value)), cap || 999999),
                        })
                      }
                    />
                  </div>
                  {lastW ? (
                    <p className="ui-field__hint">
                      آخر ورد: من {lastW.localFrom} إلى {lastW.localTo} — {lastW.planName} — {formatRecordedAt(lastW.recordedAt)}
                    </p>
                  ) : null}
                  {history.length ? (
                    <div className="rh-halaka-sessions__history">
                      <p className="ui-field__label">تسجيلات الجلسة</p>
                      {history
                        .slice(-4)
                        .reverse()
                        .map((h) => (
                          <p key={h.id || `${h.recordedAt}_${h.fromPage}_${h.toPage}`} className="rh-halaka-sessions__history-item">
                            {formatRecordedAt(h.recordedAt)} — {VOLUME_BY_ID[h.memorizationVolumeId]?.label || h.memorizationVolumeId}:
                            {' '}من {h.fromPage} إلى {h.toPage} ({h.pagesCount} ص)
                            {canWrite ? (
                              <>
                                {' — '}
                                <button
                                  type="button"
                                  className="rh-halaka-sessions__history-btn"
                                  onClick={() => {
                                    updateRowDraft(row.userId, {
                                      memorizationVolumeId: h.memorizationVolumeId || row.memorizationVolumeId,
                                      fromPage: h.fromPage ?? '',
                                      toPage: h.toPage ?? '',
                                      notes: h.notes || '',
                                    })
                                    setEditingEntryByUser((prev) => ({ ...prev, [row.userId]: h.id || '' }))
                                  }}
                                >
                                  تعديل
                                </button>
                                {' / '}
                                <button
                                  type="button"
                                  className="rh-halaka-sessions__history-btn rh-halaka-sessions__history-btn--danger"
                                  onClick={() => deleteEntry(row, h.id)}
                                >
                                  حذف
                                </button>
                              </>
                            ) : null}
                          </p>
                        ))}
                    </div>
                  ) : null}
                  <div className="rh-halaka-sessions__field-row rh-halaka-sessions__tasmee-row">
                    <TextField
                      label="وقت تسميع (د)"
                      type="number"
                      min={0}
                      value={row.tasmeeManualMin === '' ? '' : String(row.tasmeeManualMin)}
                      disabled={!canWrite || row.excludedFromSession}
                      onChange={(e) =>
                        updateRowDraft(row.userId, {
                          tasmeeManualMin: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        })
                      }
                    />
                    <TextField
                      label="وقت تسميع (ث)"
                      type="number"
                      min={0}
                      max={59}
                      value={row.tasmeeManualSec === '' ? '' : String(row.tasmeeManualSec)}
                      disabled={!canWrite || row.excludedFromSession}
                      onChange={(e) =>
                        updateRowDraft(row.userId, {
                          tasmeeManualSec: e.target.value === '' ? '' : Math.min(59, Math.max(0, Math.floor(Number(e.target.value) || 0))),
                        })
                      }
                    />
                  </div>
                  <div className="rh-halaka-sessions__row-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={Clock}
                      loading={savingRowId === row.userId}
                      disabled={!canWrite || row.excludedFromSession}
                      onClick={() => saveTasmeeRow(row)}
                    >
                      حفظ وقت التسميع
                    </Button>
                  </div>
                  {Array.isArray(row.tasmeeHistory) && row.tasmeeHistory.length ? (
                    <div className="rh-halaka-sessions__tasmee-history">
                      {row.tasmeeHistory
                        .slice(-4)
                        .reverse()
                        .map((h) => (
                          <p key={h.id || `${h.at}_${h.type}`} className="rh-halaka-sessions__history-item">
                            {formatRecordedAt(h.at)} — {formatTasmeeHistoryType(h.type)}
                            {Math.max(0, Number(h.seconds) || 0) > 0 ? ` — ${formatTasmeeDuration(h.seconds)}` : ''}
                          </p>
                        ))}
                    </div>
                  ) : null}
                </>
              ) : isStudent && row.excludedFromSession ? (
                <p className="rh-halaka-sessions__non-student-hint">هذا الطالب مستثنى من عملية الجلسة. ألغِ الاستثناء لتسجيل الحفظ.</p>
              ) : !isStudent ? (
                <p className="rh-halaka-sessions__non-student-hint">تحضير حضور العضو غير الطالب — لا يُسجَّل حفظ له.</p>
              ) : null}
              <TextAreaField
                label="ملاحظات"
                rows={2}
                value={row.notes}
                disabled={!canWrite}
                onChange={(e) => updateRowDraft(row.userId, { notes: e.target.value })}
              />
              </div>
              <div className="rh-halaka-sessions__modal-actions">
                {nextRecordableUid && activeRow?.role === HALAKA_MEMBER_ROLES.STUDENT && !editingEntryByUser[row.userId] ? (
                  <p className="rh-halaka-sessions__modal-next-hint">بعد الحفظ: {nextRecordableName || 'الطالب التالي'}</p>
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  icon={Save}
                  loading={savingRowId === row.userId}
                  disabled={!canWrite || !dirtyRowIds.has(row.userId)}
                  onClick={() => saveRow(row)}
                >
                  {row.role === HALAKA_MEMBER_ROLES.STUDENT
                    ? editingEntryByUser[row.userId]
                      ? 'حفظ تعديل الدفعة'
                      : nextRecordableUid
                        ? 'حفظ والتالي'
                        : 'حفظ وإنهاء'
                    : 'حفظ'}
                </Button>
                <Button type="button" variant="ghost" icon={X} disabled={savingRowId === row.userId} onClick={closeStudentModal}>
                  إغلاق
                </Button>
              </div>
            </div>
          )
        })() : null}
      </Modal>
    </div>
  )
}
