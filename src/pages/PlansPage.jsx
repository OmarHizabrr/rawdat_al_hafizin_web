import { Compass, Pencil, Plus, Star, Trash2, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { setUserDefaultPlanId } from '../services/userService.js'
import {
  DAILY_LOGGING_ALLOW_OVER,
  DAILY_LOGGING_STRICT_CARRYOVER,
} from '../utils/planDailyQuota.js'
import { countDaysInRange, sessionsNeeded } from '../utils/planSchedule.js'
import { subscribeAllUsers } from '../services/adminUsersService.js'
import {
  PLAN_MEMBER_ROLES,
  addUserToPlan,
  joinPublicPlan,
  loadPlanMembersWithProfiles,
  loadPlans,
  removePlanForUser,
  removePlanMember,
  savePlans,
  setPlanMemberRole,
  subscribePlans,
} from '../utils/plansStorage.js'
import {
  Button,
  DateField,
  Modal,
  NumberStepField,
  ScrollArea,
  SearchableMultiSelect,
  SearchField,
  TextField,
  TimeField,
  useToast,
} from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { CrossNav } from '../components/CrossNav.jsx'
import { PeekButton } from '../components/PeekButton.jsx'

const WEEKDAYS = [
  { d: 0, label: 'الأحد' },
  { d: 1, label: 'الإثنين' },
  { d: 2, label: 'الثلاثاء' },
  { d: 3, label: 'الأربعاء' },
  { d: 4, label: 'الخميس' },
  { d: 5, label: 'الجمعة' },
  { d: 6, label: 'السبت' },
]

function newId() {
  return firestoreApi.getNewId('plans')
}

function planCanEdit(plan) {
  return plan?.planRole !== PLAN_MEMBER_ROLES.MEMBER
}

function planCanManageMembers(plan) {
  const r = plan?.planRole
  return r === PLAN_MEMBER_ROLES.OWNER || r === PLAN_MEMBER_ROLES.ADMIN
}

function planRoleLabel(role) {
  if (role === PLAN_MEMBER_ROLES.OWNER) return 'مالك'
  if (role === PLAN_MEMBER_ROLES.ADMIN) return 'مشرف'
  return 'عضو'
}

function createInitialVolumeState() {
  return Object.fromEntries(VOLUMES.map((v) => [v.id, { selected: false, pages: v.pages }]))
}

/** @param {string | null | undefined} hhmm قيمة input type="time" */
function formatReminderAr(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm
  const d = new Date()
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return d.toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' })
}

export default function PlansPage() {
  const { user } = useAuth()
  const { planTypes, typeLabel, branding, str } = useSiteContent()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const uidParam = searchParams.get('uid')?.trim() || ''

  const viewUserId = useMemo(() => {
    if (!user?.uid) return ''
    if (uidParam && isAdmin(user)) return uidParam
    return user.uid
  }, [user, uidParam])

  const actingAsUser = Boolean(user?.uid && viewUserId && viewUserId !== user.uid)
  const readOnly = Boolean(actingAsUser && !isAdmin(user))

  const explorePlansHref = useMemo(() => {
    if (uidParam && isAdmin(user)) return `/app/plans/explore?uid=${encodeURIComponent(uidParam)}`
    return '/app/plans/explore'
  }, [uidParam, user])
  const [viewedDefaultPlanId, setViewedDefaultPlanId] = useState(null)

  const [savedPlans, setSavedPlans] = useState([])
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [deletingPlan, setDeletingPlan] = useState(null)
  const [planVisibility, setPlanVisibility] = useState('private')
  const [dailyLoggingMode, setDailyLoggingMode] = useState(DAILY_LOGGING_ALLOW_OVER)
  const [allowCustomRecordingDate, setAllowCustomRecordingDate] = useState(false)
  /** false = اشتراط ألا تقل الدفعة عن الورد اليومي (مع مراعاة الحد التراكمي) */
  const [allowBelowDailyPages, setAllowBelowDailyPages] = useState(true)
  const [membersModalPlan, setMembersModalPlan] = useState(null)
  const [planMembersList, setPlanMembersList] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [directoryUsers, setDirectoryUsers] = useState([])
  const [memberPickerQuery, setMemberPickerQuery] = useState('')
  const [addingMemberUid, setAddingMemberUid] = useState('')
  const [joinPlanId, setJoinPlanId] = useState('')
  const [savePlanSubmitting, setSavePlanSubmitting] = useState(false)
  const [deletePlanSubmitting, setDeletePlanSubmitting] = useState(false)
  const [joinPlanSubmitting, setJoinPlanSubmitting] = useState(false)
  const [homeDefaultSavingId, setHomeDefaultSavingId] = useState(null)
  const [memberRowBusy, setMemberRowBusy] = useState(null)

  const [planName, setPlanName] = useState('')
  /** اختيار المستخدم؛ قد يصير غير مطابق لقائمة الأنواع بعد تغيير الإعدادات */
  const [selectedPlanType, setSelectedPlanType] = useState(() => planTypes[0]?.value ?? 'hifz')

  const planType = useMemo(() => {
    if (!planTypes.length) return selectedPlanType
    return planTypes.some((t) => t.value === selectedPlanType) ? selectedPlanType : planTypes[0].value
  }, [planTypes, selectedPlanType])
  const [volumeState, setVolumeState] = useState(() => createInitialVolumeState())
  const [dailyPages, setDailyPages] = useState(5)
  const [reminderTime, setReminderTime] = useState('')
  const [useDateRange, setUseDateRange] = useState(false)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [useWeekdayFilter, setUseWeekdayFilter] = useState(false)
  const [weekdays, setWeekdays] = useState(() => new Set())

  const volumeOptions = useMemo(
    () => VOLUMES.map((v) => ({ value: v.id, label: v.label, secondary: `حتى ${v.pages} صفحة` })),
    [],
  )

  const selectedVolumeIds = useMemo(
    () => VOLUMES.filter((v) => volumeState[v.id]?.selected).map((v) => v.id),
    [volumeState],
  )

  useEffect(() => {
    if (readOnly) document.title = `خطط المستخدم — ${branding.siteTitle}`
    else if (actingAsUser) document.title = `الخطط (نيابة) — ${branding.siteTitle}`
    else document.title = `الخطط — ${branding.siteTitle}`
  }, [readOnly, actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (actingAsUser && viewUserId) return undefined
    const t = window.setTimeout(() => setViewedDefaultPlanId(null), 0)
    return () => window.clearTimeout(t)
  }, [actingAsUser, viewUserId])

  useEffect(() => {
    if (!actingAsUser || !viewUserId) return undefined
    let cancelled = false
    firestoreApi.getData(firestoreApi.getUserDoc(viewUserId)).then((d) => {
      if (!cancelled) setViewedDefaultPlanId(d?.defaultPlanId ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [actingAsUser, viewUserId])

  useEffect(() => {
    if (!viewUserId) {
      return
    }

    let mounted = true
    loadPlans(viewUserId).then((plans) => {
      if (mounted) setSavedPlans(plans)
    })

    const unsub = subscribePlans(viewUserId, (plans) => {
      if (mounted) setSavedPlans(plans)
    })

    return () => {
      mounted = false
      unsub()
    }
  }, [viewUserId])

  useEffect(() => {
    if (!membersModalPlan?.id || !user?.uid) {
      return undefined
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setMembersLoading(true)
    })
    loadPlanMembersWithProfiles(membersModalPlan.id)
      .then((rows) => {
        if (!cancelled) setPlanMembersList(rows)
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [membersModalPlan?.id, user?.uid])

  useEffect(() => {
    if (!membersModalPlan?.id || !user?.uid) {
      setDirectoryUsers([])
      return undefined
    }
    const unsub = subscribeAllUsers(setDirectoryUsers, () => setDirectoryUsers([]))
    return () => unsub()
  }, [membersModalPlan?.id, user?.uid])

  const totalTargetPages = useMemo(() => {
    let s = 0
    for (const v of VOLUMES) {
      const st = volumeState[v.id]
      if (st?.selected) {
        const p = Math.min(Math.max(1, st.pages || 0), v.pages)
        s += p
      }
    }
    return s
  }, [volumeState])

  const weekdayFilterArr = useMemo(() => {
    if (!useWeekdayFilter || weekdays.size === 0 || weekdays.size === 7) return null
    return [...weekdays].sort((a, b) => a - b)
  }, [useWeekdayFilter, weekdays])

  const availableDaysInRange = useMemo(() => {
    if (!useDateRange || !dateStart || !dateEnd) return null
    return countDaysInRange(dateStart, dateEnd, weekdayFilterArr)
  }, [useDateRange, dateStart, dateEnd, weekdayFilterArr])

  const neededSessions = useMemo(() => sessionsNeeded(totalTargetPages, dailyPages), [totalTargetPages, dailyPages])

  const rangeWarning = useMemo(() => {
    if (!useDateRange || availableDaysInRange == null || neededSessions === Infinity) return null
    if (availableDaysInRange > 0 && neededSessions > availableDaysInRange) {
      return `عدد أيام الجدولة في الفترة (${availableDaysInRange}) أقل من عدد جلسات الورد المطلوبة تقريباً (${neededSessions}). زد الفترة أو الورد اليومي أو خفّف الصفحات.`
    }
    return null
  }, [useDateRange, availableDaysInRange, neededSessions])

  const handleVolumesChange = (ids) => {
    const idSet = new Set(ids)
    setVolumeState((prev) => {
      const next = { ...prev }
      for (const v of VOLUMES) {
        const sel = idSet.has(v.id)
        next[v.id] = {
          selected: sel,
          pages: sel
            ? Math.min(Math.max(1, prev[v.id]?.pages ?? v.pages), v.pages)
            : v.pages,
        }
      }
      return next
    })
  }

  const setVolumePages = (id, pages) => {
    const v = VOLUME_BY_ID[id]
    const n =
      typeof pages === 'number' && Number.isFinite(pages)
        ? Math.trunc(pages)
        : Number.parseInt(String(pages), 10)
    const clamped = Number.isFinite(n) ? Math.min(Math.max(1, n), v.pages) : v.pages
    setVolumeState((prev) => ({
      ...prev,
      [id]: { ...prev[id], pages: clamped },
    }))
  }

  const toggleWeekday = (d) => {
    setWeekdays((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const selectAllWeekdays = () => {
    setWeekdays(new Set(WEEKDAYS.map((x) => x.d)))
  }

  const clearWeekdays = () => {
    setWeekdays(new Set())
  }

  const resetForm = () => {
    setPlanName('')
    setSelectedPlanType(planTypes[0]?.value ?? 'hifz')
    setVolumeState(createInitialVolumeState())
    setDailyPages(5)
    setReminderTime('')
    setUseDateRange(false)
    setDateStart('')
    setDateEnd('')
    setUseWeekdayFilter(false)
    setWeekdays(new Set())
    setPlanVisibility('private')
    setDailyLoggingMode(DAILY_LOGGING_ALLOW_OVER)
    setAllowCustomRecordingDate(false)
    setAllowBelowDailyPages(true)
  }

  const openAddModal = () => {
    if (readOnly) return
    setEditingPlanId(null)
    resetForm()
    setIsEditorOpen(true)
  }

  const openEditModal = (plan) => {
    if (readOnly) return
    if (!planCanEdit(plan)) {
      toast.warning('أنت عضو في هذه الخطة فقط — لا يمكنك تعديل إعداداتها.', 'تنبيه')
      return
    }
    const nextVolumeState = createInitialVolumeState()
    for (const x of plan.volumes ?? []) {
      const v = VOLUME_BY_ID[x.id]
      if (!v) continue
      nextVolumeState[x.id] = {
        selected: true,
        pages: Math.min(Math.max(1, Number(x.pagesTarget) || v.pages), v.pages),
      }
    }

    setEditingPlanId(plan.id)
    setPlanName(plan.name ?? '')
    setSelectedPlanType(plan.planType ?? planTypes[0]?.value ?? 'hifz')
    setVolumeState(nextVolumeState)
    setDailyPages(Math.max(1, Number(plan.dailyPages) || 1))
    setReminderTime(plan.reminderTime ?? '')
    setUseDateRange(Boolean(plan.useDateRange))
    setDateStart(plan.dateStart ?? '')
    setDateEnd(plan.dateEnd ?? '')
    setUseWeekdayFilter(Boolean(plan.useWeekdayFilter))
    setWeekdays(new Set(Array.isArray(plan.weekdayFilter) ? plan.weekdayFilter : []))
    setPlanVisibility(plan.planVisibility === 'public' ? 'public' : 'private')
    setDailyLoggingMode(
      plan.dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER
        ? DAILY_LOGGING_STRICT_CARRYOVER
        : DAILY_LOGGING_ALLOW_OVER,
    )
    setAllowCustomRecordingDate(Boolean(plan.allowCustomRecordingDate))
    setAllowBelowDailyPages(plan.allowBelowDailyPages !== false)
    setIsEditorOpen(true)
  }

  const handleSavePlan = async () => {
    if (readOnly) {
      toast.warning('عرض فقط — لا يمكن الحفظ من حساب مستخدم آخر.', 'تنبيه')
      return
    }
    if (editingPlanId) {
      const prev = savedPlans.find((p) => p.id === editingPlanId)
      if (prev && !planCanEdit(prev)) {
        toast.warning('لا يمكنك حفظ تعديلات خطة أنت عضو فيها فقط.', 'تنبيه')
        return
      }
    }
    const selected = VOLUMES.filter((v) => volumeState[v.id]?.selected)
    if (selected.length === 0) {
      toast.warning('اختر مجلداً واحداً على الأقل.', 'تنبيه')
      return
    }
    if (!dailyPages || dailyPages < 1) {
      toast.warning('حدّد ورداً يومياً بعدد صفحات صحيح (١ على الأقل).', 'تنبيه')
      return
    }
    if (useDateRange) {
      if (!dateStart || !dateEnd) {
        toast.warning('أدخل تاريخ البداية والنهاية للفترة.', 'تنبيه')
        return
      }
      if (dateEnd < dateStart) {
        toast.warning('تاريخ النهاية يجب أن يكون بعد البداية.', 'تنبيه')
        return
      }
    }

    const volumesSnapshot = selected.map((v) => {
      const st = volumeState[v.id]
      const pages = Math.min(Math.max(1, st.pages), v.pages)
      return { id: v.id, label: v.label, pagesTarget: pages, pagesMax: v.pages }
    })

    const wdArr =
      useWeekdayFilter && weekdays.size > 0 && weekdays.size < 7 ? [...weekdays].sort((a, b) => a - b) : null

    const nowIso = new Date().toISOString()
    const plan = {
      id: editingPlanId || newId(),
      createdAt: editingPlanId
        ? savedPlans.find((p) => p.id === editingPlanId)?.createdAt ?? nowIso
        : nowIso,
      updatedAt: nowIso,
      planVisibility,
      name: planName.trim() || `خطة ${new Date().toLocaleDateString('ar-SA')}`,
      planType,
      volumes: volumesSnapshot,
      totalTargetPages: volumesSnapshot.reduce((a, x) => a + x.pagesTarget, 0),
      dailyPages,
      reminderTime: reminderTime.trim() || null,
      useDateRange,
      dateStart: useDateRange ? dateStart : null,
      dateEnd: useDateRange ? dateEnd : null,
      useWeekdayFilter,
      weekdayFilter: wdArr,
      weekdayLabels:
        wdArr ? wdArr.map((d) => WEEKDAYS.find((w) => w.d === d).label).join('، ') : null,
      dailyLoggingMode,
      allowCustomRecordingDate,
      allowBelowDailyPages,
    }

    const nextPlans = editingPlanId
      ? savedPlans.map((p) => (p.id === editingPlanId ? plan : p))
      : [plan, ...savedPlans]
    setSavePlanSubmitting(true)
    try {
      await savePlans(viewUserId, nextPlans, user ?? {})
      toast.success(editingPlanId ? 'تم تحديث الخطة بنجاح.' : 'تم حفظ الخطة. يمكنك مراجعتها في القائمة أدناه.', 'تم')
      resetForm()
      setEditingPlanId(null)
      setIsEditorOpen(false)
    } catch {
      toast.warning('تعذّر حفظ الخطة. تحقق من الاتصال والصلاحيات.', 'تنبيه')
    } finally {
      setSavePlanSubmitting(false)
    }
  }

  const deletePlan = async (id) => {
    if (readOnly) return
    const meta = savedPlans.find((p) => p.id === id)
    setDeletePlanSubmitting(true)
    try {
      await removePlanForUser(viewUserId, id)
    } catch {
      toast.warning('تعذر تنفيذ العملية. حاول مرة أخرى.', 'تنبيه')
      setDeletingPlan(null)
      return
    } finally {
      setDeletePlanSubmitting(false)
    }
    const prevHomeDefault = actingAsUser ? viewedDefaultPlanId : user?.defaultPlanId
    if (prevHomeDefault === id) {
      try {
        await setUserDefaultPlanId(user, null, { targetUid: actingAsUser ? viewUserId : undefined })
        if (actingAsUser) setViewedDefaultPlanId(null)
      } catch {
        /* تجاهل — الخطة أُزيلت بالفعل */
      }
    }
    toast.info(
      meta?.planRole === PLAN_MEMBER_ROLES.MEMBER ? 'تمت مغادرة الخطة.' : 'حُذفت الخطة عن جميع الأعضاء.',
      '',
    )
    setDeletingPlan(null)
  }

  const refreshMembersList = () => {
    if (!membersModalPlan?.id) return
    setMembersLoading(true)
    loadPlanMembersWithProfiles(membersModalPlan.id)
      .then(setPlanMembersList)
      .finally(() => setMembersLoading(false))
  }

  const memberUidSet = useMemo(
    () => new Set(planMembersList.map((r) => r.userId).filter(Boolean)),
    [planMembersList],
  )

  const filteredPickerUsers = useMemo(() => {
    const q = memberPickerQuery.trim().toLowerCase()
    let list = directoryUsers
    if (q) {
      list = list.filter((u) => {
        const hay = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return [...list].sort((a, b) => {
      const aAdded = memberUidSet.has(a.uid)
      const bAdded = memberUidSet.has(b.uid)
      if (aAdded !== bAdded) return aAdded ? 1 : -1
      return (a.displayName || a.uid || '').localeCompare(b.displayName || b.uid || '', 'ar')
    })
  }, [directoryUsers, memberPickerQuery, memberUidSet])

  const handleAddMemberByUid = async (uid) => {
    const trimmed = (uid || '').trim()
    if (!trimmed || !user || !membersModalPlan?.id) return
    if (memberUidSet.has(trimmed)) {
      toast.info('هذا المستخدم مضاف مسبقاً إلى الخطة.', '')
      return
    }
    setAddingMemberUid(trimmed)
    try {
      await addUserToPlan(user, membersModalPlan.id, trimmed, user)
      toast.success('تمت إضافة العضو.', 'تم')
      refreshMembersList()
    } catch (e) {
      const m = e?.message
      if (m === 'ALREADY_MEMBER') toast.info('المستخدم مضاف مسبقاً.', '')
      else if (m === 'PLAN_FORBIDDEN') toast.warning('لا تملك صلاحية إضافة أعضاء لهذه الخطة.', '')
      else toast.warning('تعذر الإضافة.', '')
    } finally {
      setAddingMemberUid('')
    }
  }

  const handleRemoveMemberRow = async (targetUid) => {
    if (!user || !membersModalPlan?.id) return
    setMemberRowBusy({ uid: targetUid, kind: 'remove' })
    try {
      await removePlanMember(user, membersModalPlan.id, targetUid)
      toast.info('تمت إزالة العضو.', '')
      refreshMembersList()
    } catch (e) {
      const m = e?.message
      if (m === 'CANNOT_REMOVE_OWNER') toast.warning('لا يمكن إزالة مالك الخطة.', '')
      else toast.warning('تعذر الإزالة.', '')
    } finally {
      setMemberRowBusy(null)
    }
  }

  const handleToggleAdminRow = async (targetUid, currentRole) => {
    if (!user || !membersModalPlan?.id) return
    const next = currentRole === PLAN_MEMBER_ROLES.ADMIN ? PLAN_MEMBER_ROLES.MEMBER : PLAN_MEMBER_ROLES.ADMIN
    setMemberRowBusy({ uid: targetUid, kind: 'admin' })
    try {
      await setPlanMemberRole(user, membersModalPlan.id, targetUid, next, user)
      toast.success(next === PLAN_MEMBER_ROLES.ADMIN ? 'تمت الترقية إلى مشرف.' : 'أصبح عضواً عادياً.', 'تم')
      refreshMembersList()
    } catch (e) {
      const m = e?.message
      if (m === 'CANNOT_DEMOTE_OWNER') toast.warning('لا يمكن تغيير دور المالك.', '')
      else toast.warning('تعذر تحديث الدور.', '')
    } finally {
      setMemberRowBusy(null)
    }
  }

  const handleJoinPublic = async () => {
    const id = joinPlanId.trim()
    if (!id || !viewUserId || !user) return
    setJoinPlanSubmitting(true)
    try {
      await joinPublicPlan(viewUserId, id, user)
      setJoinPlanId('')
      toast.success('تم الانضمام إلى الخطة.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'PLAN_NOT_PUBLIC') toast.warning('هذه الخطة ليست عامة — تحتاج دعوة من المشرف.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف لهذه الخطة مسبقاً.', '')
      else if (m === 'PLAN_NOT_FOUND') toast.warning('لم يُعثر على خطة بهذا المعرف.', '')
      else toast.warning('تعذر الانضمام.', '')
    } finally {
      setJoinPlanSubmitting(false)
    }
  }

  const setAsHomeDefault = async (planId) => {
    if (!user || readOnly) return
    setHomeDefaultSavingId(planId)
    try {
      await setUserDefaultPlanId(user, planId, { targetUid: actingAsUser ? viewUserId : undefined })
      if (actingAsUser) setViewedDefaultPlanId(planId)
      toast.success('أصبحت هذه الخطة هي المعروضة في الصفحة الرئيسية.', 'تم')
    } catch {
      toast.warning('تعذّر تعيين الخطة الافتراضية.', 'تنبيه')
    } finally {
      setHomeDefaultSavingId(null)
    }
  }

  const volumeSummary = (n) =>
    n === 0 ? 'اختر المجلدات…' : n === 1 ? 'مجلد واحد مختار' : `${n} مجلدات مختارة`
  const displayedPlans = viewUserId ? savedPlans : []
  const homeDefaultId = actingAsUser ? viewedDefaultPlanId : user?.defaultPlanId

  const awradPeekTo = (planId) => {
    const q = new URLSearchParams()
    q.set('plan', planId)
    if (actingAsUser) q.set('uid', viewUserId)
    return `/app/awrad?${q.toString()}`
  }

  const plansCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: str('layout.nav_home') },
      { to: explorePlansHref, label: str('layout.nav_plans_explore') },
      { to: '/app/awrad', label: str('layout.nav_awrad') },
      { to: '/app/welcome', label: str('layout.nav_welcome') },
      { to: '/app/settings', label: str('layout.nav_settings') },
    ]
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, explorePlansHref])

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">{readOnly ? 'خطط المستخدم' : 'الخطط'}</h1>
            <p className="rh-plans__desc">
              {readOnly
                ? 'عرض للقراءة فقط. انتقل إلى الأوراد من أيقونة العين بجانب كل خطة.'
                : actingAsUser
                  ? 'أنت تعمل نيابة عن هذا المستخدم: الإضافة والتعديل والحذف تُحفظ على حسابه (تسجيل الدخول ما زال بحساب المشرف).'
                  : 'أنشئ خطة حفظ أو مراجعة أو قراءة، وحدد المجلدات والورد اليومي والجدولة، ثم أدر خططك بالتعديل والحذف بسهولة.'}
            </p>
            {actingAsUser && isAdmin(user) && (
              <p className="rh-plans__admin-banner">
                <Link to="/app/admin/users">← المستخدمون</Link>
                {' · '}
                <Link to={`/app?uid=${encodeURIComponent(viewUserId)}`}>رئيسيته</Link>
                {' · '}
                <Link to={`/app/awrad?uid=${encodeURIComponent(viewUserId)}`}>أوراده</Link>
                {' · '}
                <Link to="/app/plans">خططي</Link>
                {' · '}
                <Link to="/app">حسابي</Link>
              </p>
            )}
            {readOnly && (
              <p className="rh-plans__admin-banner">
                <Link to="/app/admin/users">← العودة إلى إدارة المستخدمين</Link>
                {' · '}
                <Link to={`/app/awrad?uid=${encodeURIComponent(viewUserId)}`}>صفحة أوراد هذا المستخدم</Link>
              </p>
            )}
            <CrossNav items={plansCrossItems} className="rh-plans__cross" />
          </div>
            {!readOnly && (
            <div className="rh-plans__hero-actions">
              <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAddModal}>
                <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
                إضافة خطة
              </Button>
            </div>
          )}
        </div>
      </header>

      {!readOnly && (
        <section className="rh-settings-card rh-plans__join-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">الانضمام لخطة عامة</h2>
            <p className="rh-settings-card__subtitle">
              أدخل معرف الخطة (يظهر على بطاقة الخطة) إذا كانت الخطة معيّنة كعامة.
            </p>
          </div>
          <div className="rh-plans__join-row">
            <TextField
              label="معرف الخطة"
              placeholder="مثال: abcXYZ..."
              value={joinPlanId}
              onChange={(e) => setJoinPlanId(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              className="rh-plans__join-btn"
              loading={joinPlanSubmitting}
              disabled={!joinPlanId.trim() || !viewUserId}
              onClick={handleJoinPublic}
            >
              {!joinPlanSubmitting && <RhIcon as={UserPlus} size={18} strokeWidth={RH_ICON_STROKE} />}
              انضمام
            </Button>
          </div>
          <div className="rh-plans__join-explore">
            <Link className="ui-btn ui-btn--secondary rh-plans__explore-link" to={explorePlansHref}>
              <RhIcon as={Compass} size={18} strokeWidth={RH_ICON_STROKE} />
              استكشاف كل الخطط العامة
            </Link>
          </div>
        </section>
      )}

      {displayedPlans.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">
            {readOnly ? 'الخطط المحفوظة' : actingAsUser ? 'خطط المستخدم المحفوظة' : 'خططك المحفوظة'}
          </h2>
          <ul className="rh-plans__saved-list">
            {displayedPlans.map((p) => (
              <li key={p.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <div className="rh-plans__saved-head-main">
                    <strong>{p.name}</strong>
                    <span className="rh-plans__saved-badges">
                      <span className="rh-plans__saved-badge">{typeLabel(p.planType)}</span>
                      <span className="rh-plans__saved-badge">
                        {p.planVisibility === 'public' ? 'عامة' : 'خاصة'}
                      </span>
                      <span className="rh-plans__saved-badge">{planRoleLabel(p.planRole)}</span>
                      {homeDefaultId === p.id && (
                        <span className="rh-plans__saved-badge rh-plans__saved-badge--home">الرئيسية</span>
                      )}
                      {p.dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER ? (
                        <span className="rh-plans__saved-badge">ورد تراكمي</span>
                      ) : (
                        <span className="rh-plans__saved-badge">تجاوز يومي</span>
                      )}
                    </span>
                  </div>
                  <PeekButton
                    to={awradPeekTo(p.id)}
                    title={
                      actingAsUser
                        ? 'الانتقال إلى صفحة الأوراد لهذه الخطة (حساب المستخدم)'
                        : 'الانتقال إلى صفحة الأوراد لهذه الخطة'
                    }
                  />
                </div>
                <p className="rh-plans__saved-meta">
                  معرف الخطة: <code className="rh-plans__plan-id">{p.id}</code>
                </p>
                <p className="rh-plans__saved-meta">
                  {p.totalTargetPages} صفحة — ورد {p.dailyPages} ص/يوم
                  {p.reminderTime && ` — تذكير ${formatReminderAr(p.reminderTime)}`}
                  {p.useDateRange && p.dateStart && p.dateEnd && ` — ${p.dateStart} → ${p.dateEnd}`}
                  {p.weekdayLabels && ` — ${p.weekdayLabels}`}
                </p>
                <ul className="rh-plans__saved-vols">
                  {p.volumes.map((x) => (
                    <li key={x.id}>
                      {x.label}: {x.pagesTarget} صفحة
                    </li>
                  ))}
                </ul>
                {!readOnly && (
                  <div className="rh-plans__card-actions">
                    <Button
                      type="button"
                      variant={homeDefaultId === p.id ? 'primary' : 'secondary'}
                      size="sm"
                      className="rh-plans__default-btn"
                      loading={homeDefaultSavingId === p.id}
                      disabled={homeDefaultSavingId !== null && homeDefaultSavingId !== p.id}
                      onClick={() => setAsHomeDefault(p.id)}
                      title="تظهر هذه الخطة في الصفحة الرئيسية مع نسبة الإنجاز"
                    >
                      {homeDefaultSavingId !== p.id && <RhIcon as={Star} size={16} strokeWidth={RH_ICON_STROKE} />}
                      {homeDefaultId === p.id ? 'افتراضية للرئيسية' : 'للرئيسية'}
                    </Button>
                    {planCanManageMembers(p) && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setMembersModalPlan(p)
                          setMemberPickerQuery('')
                        }}
                      >
                        <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                        الأعضاء
                      </Button>
                    )}
                    {planCanEdit(p) && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => openEditModal(p)}>
                        <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                        تعديل
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rh-plans__delete-btn"
                      disabled={Boolean(deletingPlan) || deletePlanSubmitting}
                      onClick={() => setDeletingPlan(p)}
                    >
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                      {p.planRole === PLAN_MEMBER_ROLES.MEMBER ? 'مغادرة' : 'حذف'}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rh-settings-card rh-plans__empty">
          <h2 className="rh-settings-card__title">{readOnly ? 'لا توجد خطط لهذا المستخدم' : 'لا توجد خطط بعد'}</h2>
          <p className="rh-settings-card__subtitle">
            {readOnly
              ? 'لم يُنشئ هذا المستخدم خططاً بعد، أو لا تملك صلاحية عرضها.'
              : 'ابدأ بإضافة أول خطة من الزر بالأعلى، ثم عدّلها أو احذفها لاحقاً.'}
          </p>
        </section>
      )}

      <Modal
        open={isEditorOpen && !readOnly}
        title={editingPlanId ? 'تعديل الخطة' : 'إضافة خطة جديدة'}
        onClose={() => {
          if (savePlanSubmitting) return
          setIsEditorOpen(false)
          setEditingPlanId(null)
          resetForm()
        }}
        size="md"
        closeOnBackdrop={!savePlanSubmitting}
        closeOnEsc={!savePlanSubmitting}
        showClose={!savePlanSubmitting}
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>

            <section className="rh-settings-card rh-plans__section">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">بيانات الخطة</h2>
        </div>
        <TextField label="اسم الخطة (اختياري)" placeholder="مثال: خطة صيف ١٤٤٧" value={planName} onChange={(e) => setPlanName(e.target.value)} />
        <p className="rh-plans__field-label">نوع الخطة</p>
        <div className="rh-segment rh-segment--plans">
          {planTypes.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={planType === opt.value}
              className={['rh-segment__btn', planType === opt.value ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
              onClick={() => setSelectedPlanType(opt.value)}
            >
              <span className="rh-segment__label">{opt.label}</span>
              <span className="rh-segment__hint">{opt.hint}</span>
            </button>
          ))}
        </div>
        <p className="rh-plans__field-label">ظهور الخطة</p>
        <div className="rh-segment rh-segment--plans">
          <button
            type="button"
            role="radio"
            aria-checked={planVisibility === 'private'}
            className={['rh-segment__btn', planVisibility === 'private' ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setPlanVisibility('private')}
          >
            <span className="rh-segment__label">خاصة</span>
            <span className="rh-segment__hint">الانضمام بالدعوة فقط (معرف المستخدم)</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={planVisibility === 'public'}
            className={['rh-segment__btn', planVisibility === 'public' ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setPlanVisibility('public')}
          >
            <span className="rh-segment__label">عامة</span>
            <span className="rh-segment__hint">أي مستخدم يستطيع الانضمام بمعرف الخطة</span>
          </button>
        </div>
            </section>

            <section className="rh-settings-card rh-plans__section">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">المجلدات وعدد الصفحات</h2>
          <p className="rh-settings-card__subtitle">
            قائمة قابلة للبحث مع اختيار متعدد. لكل مجلد محدّد يمكنك ضبط عدد الصفحات المستهدفة حتى حدّ المجلد.
          </p>
        </div>
        <SearchableMultiSelect
          label="المجلدات"
          hint="ابحث بالاسم أو مرّ على القائمة وحدّد ما يناسبك."
          options={volumeOptions}
          value={selectedVolumeIds}
          onChange={handleVolumesChange}
          placeholder="لم يُختر أي مجلد"
          searchPlaceholder="ابحث عن مجلد…"
          emptyText="لا يوجد مجلد يطابق البحث"
          summaryLabel={volumeSummary}
          itemAddon={(opt) => {
            const v = VOLUME_BY_ID[opt.value]
            const st = volumeState[opt.value]
            return (
              <div
                className="ui-multi__addon"
                role="group"
                aria-label={`صفحات ${opt.label}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="ui-multi__addon-label">الهدف</span>
                <NumberStepField
                  className="ui-multi__addon-step"
                  value={st.pages}
                  onChange={(num) => setVolumePages(opt.value, num)}
                  min={1}
                  max={v.pages}
                  step={1}
                  size="sm"
                />
                <span className="ui-multi__addon-max">من {v.pages}</span>
              </div>
            )
          }}
        />
            </section>

            <section className="rh-settings-card rh-plans__section">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الورد اليومي والجدولة</h2>
          <p className="rh-settings-card__subtitle">عدد الصفحات في كل جلسة/يوم، ثم اختيار فترة زمنية و/أو أيام محددة من الأسبوع.</p>
        </div>

        <div className="rh-plans__daily-row">
          <div className="rh-plans__daily-field">
            <NumberStepField
              label="الورد اليومي (صفحات)"
              hint="عدد الصفحات في كل جلسة."
              value={dailyPages}
              onChange={setDailyPages}
              min={1}
              max={999}
              step={1}
            />
          </div>
          <div className="rh-plans__daily-field">
            <TimeField
              label="وقت التذكير بالورد (اختياري)"
              hint="يُحفظ مع الخطة. يُذكَّرك التطبيق في هذا الوقت، ويمكن تفعيل إشعار المتصفح أدناه."
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
        </div>

        <p className="rh-plans__field-label">سياسة تسجيل الورد</p>
        <div className="rh-segment rh-segment--plans">
          <button
            type="button"
            role="radio"
            aria-checked={dailyLoggingMode === DAILY_LOGGING_ALLOW_OVER}
            className={[
              'rh-segment__btn',
              dailyLoggingMode === DAILY_LOGGING_ALLOW_OVER ? 'rh-segment__btn--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setDailyLoggingMode(DAILY_LOGGING_ALLOW_OVER)}
          >
            <span className="rh-segment__label">تجاوز الورد اليومي مسموح</span>
            <span className="rh-segment__hint">يمكن تسجيل أكثر من الورد المحدد في اليوم (مثلاً ١٠ أو ٢٠ صفحة).</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER}
            className={[
              'rh-segment__btn',
              dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER ? 'rh-segment__btn--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setDailyLoggingMode(DAILY_LOGGING_STRICT_CARRYOVER)}
          >
            <span className="rh-segment__label">التزام تراكمي مع تعويض الغياب</span>
            <span className="rh-segment__hint">
              لا يتجاوز المطلوب تراكمياً؛ إن فاتك أيام يسمح لك بتسجيل المتأخرات مع اليوم ضمن الحد.
            </span>
          </button>
        </div>

        <label className="rh-plans__toggle">
          <input
            type="checkbox"
            checked={allowCustomRecordingDate}
            onChange={(e) => setAllowCustomRecordingDate(e.target.checked)}
          />
          <span>السماح باختيار تاريخ تسجيل الورد (غير اليوم المحلي)</span>
        </label>
        <p className="rh-settings-card__subtitle rh-plans__toggle-follow">
          عند التفعيل يظهر في صفحة الأوراد حقل تاريخ يحدد يوم احتساب الورد والحد التراكمي؛ عند الإلغاء يُسجَّل دائماً بتاريخ اليوم المحلي.
        </p>

        <p className="rh-plans__field-label">الحد الأدنى لكل دفعة تسجيل</p>
        <div className="rh-segment rh-segment--plans">
          <button
            type="button"
            role="radio"
            aria-checked={allowBelowDailyPages}
            className={['rh-segment__btn', allowBelowDailyPages ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setAllowBelowDailyPages(true)}
          >
            <span className="rh-segment__label">السماح بأقل من الورد اليومي</span>
            <span className="rh-segment__hint">مثلاً تسجيل صفحة أو صفحتين حتى لو كان الورد المقرر ٥ صفحات.</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!allowBelowDailyPages}
            className={['rh-segment__btn', !allowBelowDailyPages ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setAllowBelowDailyPages(false)}
          >
            <span className="rh-segment__label">اشتراط الورد اليومي كاملاً</span>
            <span className="rh-segment__hint">
              لا تقل الدفعة عن الورد المحدد إن سمح المسموح تراكمياً بذلك؛ وإن كان المسموح أقل (مثل ٣) فتُشترى ال٣ دفعة واحدة.
            </span>
          </button>
        </div>

        {typeof Notification !== 'undefined' && reminderTime.trim() && Notification.permission === 'default' && (
          <div className="rh-plans__notif-prompt">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const r = await Notification.requestPermission()
                if (r === 'granted') {
                  toast.success('سيُعرض إشعار المتصفح عند وقت التذكير طالما التطبيق مفتوح.', 'تم')
                } else if (r === 'denied') {
                  toast.info('لن يُعرض إشعار خارج التطبيق. سيظل التذكير داخل المنصة.', '')
                }
              }}
            >
              السماح بإشعارات المتصفح عند وقت التذكير
            </Button>
          </div>
        )}

        <label className="rh-plans__toggle">
          <input type="checkbox" checked={useDateRange} onChange={(e) => setUseDateRange(e.target.checked)} />
          <span>تحديد فترة زمنية (من — إلى)</span>
        </label>
        {useDateRange && (
          <div className="rh-plans__dates-grid">
            <DateField label="من" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            <DateField label="إلى" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} min={dateStart || undefined} />
          </div>
        )}

        <label className="rh-plans__toggle">
          <input type="checkbox" checked={useWeekdayFilter} onChange={(e) => setUseWeekdayFilter(e.target.checked)} />
          <span>تقييد أيام الأسبوع (إن لم تختر أي يوم يُعتبر «كل الأيام»)</span>
        </label>
        {useWeekdayFilter && (
          <div className="rh-plans__weekdays">
            {WEEKDAYS.map(({ d, label }) => (
              <button
                key={d}
                type="button"
                className={['rh-plans__weekday', weekdays.has(d) ? 'rh-plans__weekday--on' : ''].filter(Boolean).join(' ')}
                onClick={() => toggleWeekday(d)}
              >
                {label}
              </button>
            ))}
            <div className="rh-plans__weekday-actions">
              <button type="button" className="rh-plans__linkish" onClick={selectAllWeekdays}>
                كل الأيام
              </button>
              <button type="button" className="rh-plans__linkish" onClick={clearWeekdays}>
                مسح
              </button>
            </div>
          </div>
        )}
            </section>

            <section className="rh-plans__summary card">
        <h2 className="rh-plans__summary-title">ملخص</h2>
        <ul className="rh-plans__summary-list">
          <li>
            <strong>إجمالي الصفحات المستهدفة:</strong> {totalTargetPages}
          </li>
          <li>
            <strong>جلسات الورد التقريبية:</strong>{' '}
            {neededSessions === Infinity ? '—' : neededSessions}
          </li>
          {useDateRange && dateStart && dateEnd && (
            <li>
              <strong>أيام الجدولة ضمن الفترة{weekdayFilterArr ? ' (مع تصفية الأسبوع)' : ''}:</strong>{' '}
              {availableDaysInRange ?? '—'}
            </li>
          )}
          {reminderTime.trim() && (
            <li>
              <strong>وقت التذكير:</strong> {formatReminderAr(reminderTime.trim())}
            </li>
          )}
        </ul>
        {rangeWarning && <p className="rh-plans__warn">{rangeWarning}</p>}
        <div className="rh-plans__actions">
          <Button type="button" variant="primary" onClick={handleSavePlan} loading={savePlanSubmitting}>
            {editingPlanId ? 'حفظ التعديلات' : 'حفظ الخطة'}
          </Button>
          <Button type="button" variant="ghost" onClick={resetForm} disabled={savePlanSubmitting}>
            مسح النموذج
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={savePlanSubmitting}
            onClick={() => {
              setIsEditorOpen(false)
              setEditingPlanId(null)
              resetForm()
            }}
          >
            إغلاق
          </Button>
        </div>
            </section>
        </ScrollArea>
      </Modal>

      <Modal
        open={Boolean(deletingPlan)}
        title="تأكيد"
        onClose={() => !deletePlanSubmitting && setDeletingPlan(null)}
        size="sm"
        closeOnBackdrop={!deletePlanSubmitting}
        closeOnEsc={!deletePlanSubmitting}
        showClose={!deletePlanSubmitting}
      >
            <p className="rh-plans__warn rh-plans__warn--confirm">
              {deletingPlan?.planRole === PLAN_MEMBER_ROLES.MEMBER ? (
                <>
                  سيتم إزالة خطة <strong>{deletingPlan?.name}</strong> من قائمتك فقط. بقية الأعضاء لا يتأثرون.
                </>
              ) : (
                <>
                  سيتم حذف خطة <strong>{deletingPlan?.name}</strong> نهائياً عن جميع الأعضاء. هل أنت متأكد؟
                </>
              )}
            </p>
            <div className="rh-plans__actions">
              <Button
                type="button"
                variant="danger"
                loading={deletePlanSubmitting}
                onClick={() => deletingPlan && deletePlan(deletingPlan.id)}
              >
                {deletingPlan?.planRole === PLAN_MEMBER_ROLES.MEMBER ? 'نعم، مغادرة' : 'نعم، حذف للجميع'}
              </Button>
              <Button type="button" variant="ghost" disabled={deletePlanSubmitting} onClick={() => setDeletingPlan(null)}>
                إلغاء
              </Button>
            </div>
      </Modal>

      <Modal
        open={Boolean(membersModalPlan)}
        title={membersModalPlan ? `أعضاء الخطة: ${membersModalPlan.name || membersModalPlan.id}` : 'الأعضاء'}
        onClose={() => {
          if (memberRowBusy || addingMemberUid) return
          setMembersModalPlan(null)
          setPlanMembersList([])
          setMemberPickerQuery('')
          setDirectoryUsers([])
        }}
        size="lg"
        contentClassName="ui-modal__content--plan-members"
        closeOnBackdrop={!memberRowBusy && !addingMemberUid}
        closeOnEsc={!memberRowBusy && !addingMemberUid}
        showClose={!memberRowBusy && !addingMemberUid}
      >
        <div className="rh-plan-members-modal__body">
        <p className="rh-plans__saved-meta rh-plan-members-modal__plan-id">
          معرف الخطة: <code className="rh-plans__plan-id">{membersModalPlan?.id}</code>
        </p>

        <section className="rh-plan-members-modal__section">
          <h3 className="rh-plan-members-modal__heading">إضافة من المستخدمين</h3>
          <p className="rh-plan-members-modal__hint">
            ابحث بالاسم أو البريد أو المعرف. المضافون للخطة يظهرون باهتين مع ملاحظة «مضاف مسبقاً».
          </p>
          <SearchField
            label="بحث في المستخدمين"
            placeholder="اسم، بريد، معرّف…"
            value={memberPickerQuery}
            onChange={(e) => setMemberPickerQuery(e.target.value)}
          />
          <ScrollArea className="rh-plan-members-picker" padded maxHeight="min(14rem, 36vh)">
            {directoryUsers.length === 0 ? (
              <p className="rh-plan-members-picker__empty">
                جاري تحميل قائمة المستخدمين… إن بقيت فارغة فقد لا تملك صلاحية قراءة مجموعة المستخدمين في Firestore.
              </p>
            ) : filteredPickerUsers.length === 0 ? (
              <p className="rh-plan-members-picker__empty">لا نتائج مطابقة للبحث.</p>
            ) : (
              <ul className="rh-plan-members-picker__list">
                {filteredPickerUsers.map((u) => {
                  const added = memberUidSet.has(u.uid)
                  const name = u.displayName?.trim() || 'بدون اسم'
                  const initial = name.charAt(0)
                  const busy = addingMemberUid === u.uid
                  return (
                    <li key={u.uid} className="rh-plan-members-picker__item-wrap">
                      <button
                        type="button"
                        className={[
                          'rh-plan-members-pick__row',
                          added ? 'rh-plan-members-pick__row--added' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={added || busy}
                        onClick={() => handleAddMemberByUid(u.uid)}
                      >
                        <span className="rh-plan-members-pick__avatar" aria-hidden>
                          {u.photoURL ? <img src={u.photoURL} alt="" width={44} height={44} /> : initial}
                        </span>
                        <span className="rh-plan-members-pick__body">
                          <span className="rh-plan-members-pick__name">{name}</span>
                          <span className="rh-plan-members-pick__sub">{u.email || u.uid}</span>
                        </span>
                        {added && <span className="rh-plan-members-pick__badge">مضاف مسبقاً</span>}
                        {busy && <span className="rh-plan-members-pick__busy">…</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </section>

        <section className="rh-plan-members-modal__section rh-plan-members-modal__section--members">
          <h3 className="rh-plan-members-modal__heading">أعضاء الخطة</h3>
          {membersLoading ? (
            <p className="rh-plans__members-loading">جاري التحميل…</p>
          ) : planMembersList.length === 0 ? (
            <p className="rh-plans__members-loading">لا يوجد أعضاء مسجّلون بعد.</p>
          ) : (
            <ul className="rh-members-chat-list">
              {planMembersList.map((row) => {
                const isOwnerRow = row.role === PLAN_MEMBER_ROLES.OWNER
                const name = row.displayName || row.userId
                const initial = (name || '?').charAt(0)
                return (
                  <li key={row.userId} className="rh-members-chat__item">
                    <span className="rh-members-chat__avatar" aria-hidden>
                      {row.photoURL ? (
                        <img src={row.photoURL} alt="" width={48} height={48} />
                      ) : (
                        initial
                      )}
                    </span>
                    <div className="rh-members-chat__main">
                      <div className="rh-members-chat__title-row">
                        <strong className="rh-members-chat__name">{name}</strong>
                        <span className="rh-plans__saved-badge">{planRoleLabel(row.role)}</span>
                      </div>
                      <span className="rh-members-chat__sub">{row.email || row.userId}</span>
                    </div>
                    {!isOwnerRow && (
                      <div className="rh-members-chat__actions">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={memberRowBusy?.uid === row.userId && memberRowBusy?.kind === 'admin'}
                          disabled={Boolean(memberRowBusy)}
                          onClick={() => handleToggleAdminRow(row.userId, row.role)}
                        >
                          {row.role === PLAN_MEMBER_ROLES.ADMIN ? 'إلغاء مشرف' : 'ترقية لمشرف'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rh-plans__delete-btn"
                          loading={memberRowBusy?.uid === row.userId && memberRowBusy?.kind === 'remove'}
                          disabled={Boolean(memberRowBusy)}
                          onClick={() => handleRemoveMemberRow(row.userId)}
                        >
                          إزالة
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        </div>
      </Modal>
    </div>
  )
}
