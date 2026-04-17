import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { SITE_TITLE } from '../config/site.js'
import { useAuth } from '../context/useAuth.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { countDaysInRange, sessionsNeeded } from '../utils/planSchedule.js'
import { loadPlans, savePlans, subscribePlans } from '../utils/plansStorage.js'
import {
  Button,
  DateField,
  Modal,
  NumberStepField,
  ScrollArea,
  SearchableMultiSelect,
  TextField,
  TimeField,
  useToast,
} from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PLAN_TYPES = [
  { value: 'hifz', label: 'حفظ', hint: 'حفظ متون الأحاديث وفق المجلدات المختارة' },
  { value: 'murajaah', label: 'مراجعة', hint: 'تثبيت ما سبق حفظه أو مراجعة سريعة' },
  { value: 'qiraah', label: 'قراءة', hint: 'قراءة مطالعة دون اشتراط الحفظ' },
]

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
  const toast = useToast()
  const [savedPlans, setSavedPlans] = useState([])
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [deletingPlan, setDeletingPlan] = useState(null)

  const [planName, setPlanName] = useState('')
  const [planType, setPlanType] = useState('hifz')
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
    document.title = `الخطط — ${SITE_TITLE}`
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    let mounted = true
    loadPlans(user.uid).then((plans) => {
      if (mounted) setSavedPlans(plans)
    })

    const unsub = subscribePlans(user.uid, (plans) => {
      setSavedPlans(plans)
    })

    return () => {
      mounted = false
      unsub()
    }
  }, [user?.uid])

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
    setPlanType('hifz')
    setVolumeState(createInitialVolumeState())
    setDailyPages(5)
    setReminderTime('')
    setUseDateRange(false)
    setDateStart('')
    setDateEnd('')
    setUseWeekdayFilter(false)
    setWeekdays(new Set())
  }

  const openAddModal = () => {
    setEditingPlanId(null)
    resetForm()
    setIsEditorOpen(true)
  }

  const openEditModal = (plan) => {
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
    setPlanType(plan.planType ?? 'hifz')
    setVolumeState(nextVolumeState)
    setDailyPages(Math.max(1, Number(plan.dailyPages) || 1))
    setReminderTime(plan.reminderTime ?? '')
    setUseDateRange(Boolean(plan.useDateRange))
    setDateStart(plan.dateStart ?? '')
    setDateEnd(plan.dateEnd ?? '')
    setUseWeekdayFilter(Boolean(plan.useWeekdayFilter))
    setWeekdays(new Set(Array.isArray(plan.weekdayFilter) ? plan.weekdayFilter : []))
    setIsEditorOpen(true)
  }

  const handleSavePlan = async () => {
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
    }

    const nextPlans = editingPlanId
      ? savedPlans.map((p) => (p.id === editingPlanId ? plan : p))
      : [plan, ...savedPlans]
    await savePlans(user?.uid, nextPlans, user ?? {})
    toast.success(editingPlanId ? 'تم تحديث الخطة بنجاح.' : 'تم حفظ الخطة. يمكنك مراجعتها في القائمة أدناه.', 'تم')
    resetForm()
    setEditingPlanId(null)
    setIsEditorOpen(false)
  }

  const deletePlan = async (id) => {
    const next = savedPlans.filter((p) => p.id !== id)
    await savePlans(user?.uid, next, user ?? {})
    toast.info('حُذفت الخطة.', '')
    setDeletingPlan(null)
  }

  const typeLabel = (v) => PLAN_TYPES.find((t) => t.value === v)?.label ?? v

  const volumeSummary = (n) =>
    n === 0 ? 'اختر المجلدات…' : n === 1 ? 'مجلد واحد مختار' : `${n} مجلدات مختارة`
  const displayedPlans = user?.uid ? savedPlans : []

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">الخطط</h1>
            <p className="rh-plans__desc">
              أنشئ خطة حفظ أو مراجعة أو قراءة، وحدد المجلدات والورد اليومي والجدولة، ثم أدر خططك بالتعديل والحذف بسهولة.
            </p>
          </div>
          <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAddModal}>
            <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
            إضافة خطة
          </Button>
        </div>
      </header>

      {displayedPlans.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">خططك المحفوظة</h2>
          <ul className="rh-plans__saved-list">
            {displayedPlans.map((p) => (
              <li key={p.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <strong>{p.name}</strong>
                  <span className="rh-plans__saved-badge">{typeLabel(p.planType)}</span>
                </div>
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
                <div className="rh-plans__card-actions">
                  <Button type="button" variant="secondary" size="sm" onClick={() => openEditModal(p)}>
                    <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                    تعديل
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rh-plans__delete-btn"
                    onClick={() => setDeletingPlan(p)}
                  >
                    <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                    حذف
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rh-settings-card rh-plans__empty">
          <h2 className="rh-settings-card__title">لا توجد خطط بعد</h2>
          <p className="rh-settings-card__subtitle">ابدأ بإضافة أول خطة من الزر بالأعلى، ثم عدّلها أو احذفها لاحقاً.</p>
        </section>
      )}

      <Modal
        open={isEditorOpen}
        title={editingPlanId ? 'تعديل الخطة' : 'إضافة خطة جديدة'}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingPlanId(null)
          resetForm()
        }}
        size="md"
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>

            <section className="rh-settings-card rh-plans__section">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">بيانات الخطة</h2>
        </div>
        <TextField label="اسم الخطة (اختياري)" placeholder="مثال: خطة صيف ١٤٤٧" value={planName} onChange={(e) => setPlanName(e.target.value)} />
        <p className="rh-plans__field-label">نوع الخطة</p>
        <div className="rh-segment rh-segment--plans">
          {PLAN_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={planType === opt.value}
              className={['rh-segment__btn', planType === opt.value ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
              onClick={() => setPlanType(opt.value)}
            >
              <span className="rh-segment__label">{opt.label}</span>
              <span className="rh-segment__hint">{opt.hint}</span>
            </button>
          ))}
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
          <Button type="button" variant="primary" onClick={handleSavePlan}>
            {editingPlanId ? 'حفظ التعديلات' : 'حفظ الخطة'}
          </Button>
          <Button type="button" variant="ghost" onClick={resetForm}>
            مسح النموذج
          </Button>
          <Button
            type="button"
            variant="ghost"
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

      <Modal open={Boolean(deletingPlan)} title="تأكيد الحذف" onClose={() => setDeletingPlan(null)} size="sm">
            <p className="rh-plans__warn rh-plans__warn--confirm">
              سيتم حذف خطة <strong>{deletingPlan?.name}</strong> نهائياً. هل أنت متأكد من المتابعة؟
            </p>
            <div className="rh-plans__actions">
              <Button type="button" variant="danger" onClick={() => deletingPlan && deletePlan(deletingPlan.id)}>
                نعم، حذف الخطة
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDeletingPlan(null)}>
                إلغاء
              </Button>
            </div>
      </Modal>
    </div>
  )
}
