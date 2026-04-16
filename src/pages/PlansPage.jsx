import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { SITE_TITLE } from '../config/site.js'
import { countDaysInRange, sessionsNeeded } from '../utils/planSchedule.js'
import { loadPlans, savePlans } from '../utils/plansStorage.js'
import { Button, TextField, useToast } from '../ui/index.js'
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
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function PlansPage() {
  const toast = useToast()
  const [savedPlans, setSavedPlans] = useState(() => loadPlans())

  const [planName, setPlanName] = useState('')
  const [planType, setPlanType] = useState('hifz')
  const [volumeState, setVolumeState] = useState(() =>
    Object.fromEntries(VOLUMES.map((v) => [v.id, { selected: false, pages: v.pages }])),
  )
  const [dailyPages, setDailyPages] = useState(5)
  const [useDateRange, setUseDateRange] = useState(false)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [useWeekdayFilter, setUseWeekdayFilter] = useState(false)
  const [weekdays, setWeekdays] = useState(() => new Set())

  useEffect(() => {
    document.title = `الخطط — ${SITE_TITLE}`
  }, [])

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

  const toggleVolume = (id) => {
    setVolumeState((prev) => {
      const cur = prev[id]
      const v = VOLUME_BY_ID[id]
      return {
        ...prev,
        [id]: {
          ...cur,
          selected: !cur.selected,
          pages: cur.selected ? v.pages : cur.pages || v.pages,
        },
      }
    })
  }

  const setVolumePages = (id, pages) => {
    const v = VOLUME_BY_ID[id]
    const n = Number.parseInt(String(pages), 10)
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
    setVolumeState(Object.fromEntries(VOLUMES.map((v) => [v.id, { selected: false, pages: v.pages }])))
    setDailyPages(5)
    setUseDateRange(false)
    setDateStart('')
    setDateEnd('')
    setUseWeekdayFilter(false)
    setWeekdays(new Set())
  }

  const handleSavePlan = () => {
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

    const plan = {
      id: newId(),
      createdAt: new Date().toISOString(),
      name: planName.trim() || `خطة ${new Date().toLocaleDateString('ar-SA')}`,
      planType,
      volumes: volumesSnapshot,
      totalTargetPages: volumesSnapshot.reduce((a, x) => a + x.pagesTarget, 0),
      dailyPages,
      useDateRange,
      dateStart: useDateRange ? dateStart : null,
      dateEnd: useDateRange ? dateEnd : null,
      useWeekdayFilter,
      weekdayFilter: wdArr,
      weekdayLabels:
        wdArr ? wdArr.map((d) => WEEKDAYS.find((w) => w.d === d).label).join('، ') : null,
    }

    setSavedPlans((prev) => {
      const next = [plan, ...prev]
      savePlans(next)
      return next
    })
    toast.success('تم حفظ الخطة. يمكنك مراجعتها في القائمة أدناه.', 'تم')
    resetForm()
  }

  const deletePlan = (id) => {
    setSavedPlans((prev) => {
      const next = prev.filter((p) => p.id !== id)
      savePlans(next)
      return next
    })
    toast.info('حُذفت الخطة.', '')
  }

  const typeLabel = (v) => PLAN_TYPES.find((t) => t.value === v)?.label ?? v

  return (
    <div className="rh-plans">
      <header className="rh-plans__header">
        <h1 className="rh-plans__title">الخطط</h1>
        <p className="rh-plans__desc">
          أنشئ خطة حفظ أو مراجعة أو قراءة، اختر المجلدات وعدد الصفحات من كل مجلد، ثم حدّد الورد اليومي ونمط الجدولة (مفتوح،
          ضمن فترة، أو أيام أسبوع محددة).
        </p>
      </header>

      <section className="rh-settings-card rh-plans__section">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">بيانات الخطة</h2>
        </div>
        <TextField label="اسم الخطة (اختياري)" placeholder="مثال: خطة صيف ١٤٤٧" value={planName} onChange={(e) => setPlanName(e.target.value)} />
        <p className="rh-plans__field-label">نوع الخطة</p>
        <div className="rh-segment">
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
          <p className="rh-settings-card__subtitle">يمكنك اختيار عدة مجلدات. لكل مجلد حدّد عدد الصفحات المستهدفة (حتى حدّ المجلد).</p>
        </div>
        <ul className="rh-plans__volume-list">
          {VOLUMES.map((v) => {
            const st = volumeState[v.id]
            return (
              <li key={v.id} className={['rh-plans__volume-row', st.selected ? 'rh-plans__volume-row--on' : ''].filter(Boolean).join(' ')}>
                <label className="rh-plans__volume-check">
                  <input type="checkbox" checked={st.selected} onChange={() => toggleVolume(v.id)} />
                  <span className="rh-plans__volume-info">
                    <span className="rh-plans__volume-name">{v.label}</span>
                    <span className="rh-plans__volume-max">الحد الأقصى: {v.pages} صفحة</span>
                  </span>
                </label>
                {st.selected && (
                  <label className="rh-plans__volume-pages">
                    <span className="rh-plans__volume-pages-label">صفحات مستهدفة</span>
                    <input
                      type="number"
                      min={1}
                      max={v.pages}
                      className="rh-plans__volume-input"
                      value={st.pages}
                      onChange={(e) => setVolumePages(v.id, e.target.value)}
                    />
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rh-settings-card rh-plans__section">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الورد اليومي والجدولة</h2>
          <p className="rh-settings-card__subtitle">عدد الصفحات في كل جلسة/يوم، ثم اختيار فترة زمنية و/أو أيام محددة من الأسبوع.</p>
        </div>

        <label className="rh-plans__daily">
          <span className="rh-plans__daily-label">الورد اليومي (صفحات)</span>
          <input
            type="number"
            min={1}
            className="rh-plans__volume-input rh-plans__daily-input"
            value={dailyPages}
            onChange={(e) => setDailyPages(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          />
        </label>

        <label className="rh-plans__toggle">
          <input type="checkbox" checked={useDateRange} onChange={(e) => setUseDateRange(e.target.checked)} />
          <span>تحديد فترة زمنية (من — إلى)</span>
        </label>
        {useDateRange && (
          <div className="rh-plans__dates">
            <label>
              <span className="rh-plans__mini-label">من</span>
              <input type="date" className="rh-plans__date-input" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </label>
            <label>
              <span className="rh-plans__mini-label">إلى</span>
              <input type="date" className="rh-plans__date-input" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </label>
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
        </ul>
        {rangeWarning && <p className="rh-plans__warn">{rangeWarning}</p>}
        <div className="rh-plans__actions">
          <Button type="button" variant="primary" onClick={handleSavePlan}>
            حفظ الخطة
          </Button>
          <Button type="button" variant="ghost" onClick={resetForm}>
            مسح النموذج
          </Button>
        </div>
      </section>

      {savedPlans.length > 0 && (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">خططك المحفوظة</h2>
          <ul className="rh-plans__saved-list">
            {savedPlans.map((p) => (
              <li key={p.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <strong>{p.name}</strong>
                  <span className="rh-plans__saved-badge">{typeLabel(p.planType)}</span>
                  <button type="button" className="rh-plans__delete" aria-label="حذف الخطة" onClick={() => deletePlan(p.id)}>
                    <RhIcon as={Trash2} size={18} strokeWidth={RH_ICON_STROKE} />
                  </button>
                </div>
                <p className="rh-plans__saved-meta">
                  {p.totalTargetPages} صفحة — ورد {p.dailyPages} ص/يوم
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
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
