import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { CalendarDate } from '@internationalized/date'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import {
  REPORT_KIND_OPTIONS,
  REPORT_KIND_PERMISSION,
  REPORT_RANGE_PRESETS,
  REPORT_SCOPE_ALL,
  reportViewPath,
} from '../config/reportKinds.js'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useHidePlanNavigation } from '../hooks/useHidePlanNavigation.js'
import {
  listEntitiesByKind,
  loadTeachersDirectory,
  loadUsersDirectory,
  loadStudentScopeOptions,
} from '../services/reportsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  HIJRI,
  formatHijriYmd,
  gregorianYmdStringToHijriYmd,
  hijriYmdLocalDayEndIso,
  hijriYmdLocalDayStartIso,
  localHijriYmd,
  parseHijriYmdString,
} from '../utils/hijriDates.js'
import { HapticLink } from '../ui/HapticLink.jsx'
import { studentProgressLink } from '../utils/studentProgressLink.js'
import { Button, RhDatePickerField, SearchableSelect, useToast } from '../ui/index.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

const PAGE_ID = PERMISSION_PAGE_IDS.reports

function toEntityOptions(rows) {
  return (rows || []).map((row) => ({
    value: row.id || row.uid,
    label: row.name || row.displayName || row.email || row.uid || row.id,
  }))
}

export default function ReportsHubPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { str, branding } = useSiteContent()
  const toast = useToast()
  const navigate = useNavigate()
  const { search } = useLocation()
  const hidePlanNavigation = useHidePlanNavigation()

  const allowedKinds = useMemo(
    () => REPORT_KIND_OPTIONS.filter((k) => can(PAGE_ID, REPORT_KIND_PERMISSION[k.value])),
    [can],
  )

  const [kind, setKind] = useState(() => allowedKinds[0]?.value || 'student')
  const [entityId, setEntityId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rangePreset, setRangePreset] = useState('all')
  const [scopePlan, setScopePlan] = useState(REPORT_SCOPE_ALL)
  const [scopeHalaka, setScopeHalaka] = useState(REPORT_SCOPE_ALL)
  const [scopeOptions, setScopeOptions] = useState({ plans: [], halakat: [] })
  const [loadingScope, setLoadingScope] = useState(false)
  const [entities, setEntities] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, getImpersonateUid(user, search)),
    [user, search],
  )

  useEffect(() => {
    document.title = str('reports.doc_title', { siteTitle: branding.siteTitle })
  }, [str, branding.siteTitle])

  useEffect(() => {
    const params = new URLSearchParams(search)
    const kindParam = String(params.get('reportKind') || '').trim()
    if (kindParam && allowedKinds.some((k) => k.value === kindParam)) setKind(kindParam)
    const entityParam = String(params.get('reportEntity') || '').trim()
    if (entityParam) {
      const fromParam = String(params.get('from') || '').trim()
      const toParam = String(params.get('to') || '').trim()
      const presetParam = String(params.get('rangePreset') || '').trim()
      navigate(
        appLink(
          reportViewPath({
            kind: kindParam || kind,
            entityId: entityParam,
            from: fromParam || undefined,
            to: toParam || undefined,
            rangePreset: presetParam || undefined,
          }),
        ),
        { replace: true },
      )
    }
  }, [search, allowedKinds, kind, navigate, appLink])

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return
    if (!allowedKinds.some((k) => k.value === kind)) {
      setKind(allowedKinds[0]?.value || 'student')
    }
  }, [kind, allowedKinds, canAccessPage])

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return
    let cancelled = false
    setLoadingEntities(true)
    setEntities([])
    setEntityId('')
    const run = async () => {
      try {
        if (kind === 'student') {
          const users = await loadUsersDirectory(user)
          if (!cancelled) setEntities(users)
          return
        }
        if (kind === 'teacher') {
          const teachers = await loadTeachersDirectory(user)
          if (!cancelled) setEntities(teachers)
          return
        }
        const rows = await listEntitiesByKind(kind)
        if (!cancelled) setEntities(rows)
      } catch {
        if (!cancelled) setEntities([])
      } finally {
        if (!cancelled) setLoadingEntities(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [kind, canAccessPage, user])

  useEffect(() => {
    if (kind !== 'student' && kind !== 'teacher') {
      setScopeOptions({ plans: [], halakat: [] })
      setScopePlan(REPORT_SCOPE_ALL)
      setScopeHalaka(REPORT_SCOPE_ALL)
      return undefined
    }
    if (!entityId) {
      setScopeOptions({ plans: [], halakat: [] })
      return undefined
    }
    let cancelled = false
    setLoadingScope(true)
    loadStudentScopeOptions(entityId)
      .then((opts) => {
        if (cancelled) return
        setScopeOptions(kind === 'teacher' ? { plans: [], halakat: opts.halakat || [] } : opts)
      })
      .catch(() => {
        if (!cancelled) setScopeOptions({ plans: [], halakat: [] })
      })
      .finally(() => {
        if (!cancelled) setLoadingScope(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, entityId])

  const scopePlanOptions = useMemo(
    () => [
      { value: REPORT_SCOPE_ALL, label: 'كل الخطط' },
      ...(scopeOptions.plans || []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [scopeOptions.plans],
  )

  const scopeHalakaOptions = useMemo(
    () => [
      { value: REPORT_SCOPE_ALL, label: 'كل الحلقات' },
      ...(scopeOptions.halakat || []).map((h) => ({ value: h.id, label: h.name })),
    ],
    [scopeOptions.halakat],
  )

  const entityOptions = useMemo(() => toEntityOptions(entities), [entities])
  const isRangeInvalid = useMemo(() => {
    if (!fromDate || !toDate) return false
    const a = parseHijriYmdString(fromDate)
    const b = parseHijriYmdString(toDate)
    if (!a || !b) return false
    return a.compare(b) > 0
  }, [fromDate, toDate])

  const crossItems = useMemo(
    () => [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      ...(hidePlanNavigation ? [] : [{ to: appLink('/app/plans'), label: str('layout.nav_plans') }]),
      { to: appLink('/app/activities'), label: str('layout.nav_activities') },
      { to: appLink('/app/exams'), label: str('layout.nav_exams') },
      { to: appLink('/app/reports'), label: str('layout.nav_reports') },
    ],
    [appLink, str, hidePlanNavigation],
  )

  const rangePresetLabel = useCallback(
    (preset) => {
      if (preset === 'today') return str('reports.range_today')
      if (preset === 'week') return str('reports.range_week')
      if (preset === 'month') return str('reports.range_month')
      return str('reports.range_all')
    },
    [str],
  )

  const applyRangePreset = useCallback((preset) => {
    if (preset === 'all') {
      setFromDate('')
      setToDate('')
      setRangePreset('all')
      return
    }
    const todayCd = parseHijriYmdString(localHijriYmd())
    if (!todayCd) return
    if (preset === 'today') {
      const t = formatHijriYmd(todayCd)
      setFromDate(t)
      setToDate(t)
      setRangePreset('today')
      return
    }
    if (preset === 'week') {
      const from = todayCd.subtract({ days: 6 })
      setFromDate(formatHijriYmd(from))
      setToDate(formatHijriYmd(todayCd))
      setRangePreset('week')
      return
    }
    if (preset === 'month') {
      const monthStart = new CalendarDate(HIJRI, todayCd.year, todayCd.month, 1)
      setFromDate(formatHijriYmd(monthStart))
      setToDate(formatHijriYmd(todayCd))
      setRangePreset('month')
    }
  }, [])

  const openReport = () => {
    if (!entityId) {
      toast.warning('اختر الكيان أولاً.', '')
      return
    }
    if (isRangeInvalid) {
      toast.warning(str('reports.toast_invalid_range'))
      return
    }
    navigate(
      appLink(
        reportViewPath({
          kind,
          entityId,
          from: fromDate || undefined,
          to: toDate || undefined,
          rangePreset,
          scopePlan: kind === 'student' ? scopePlan : undefined,
          scopeHalaka: kind === 'student' || kind === 'teacher' ? scopeHalaka : undefined,
        }),
      ),
    )
  }

  const selectedKindMeta = REPORT_KIND_OPTIONS.find((k) => k.value === kind)

  if (!canAccessPage(PAGE_ID)) {
    return <p className="rh-plans__empty">{str('reports.no_access')}</p>
  }

  return (
    <div className="rh-plans rh-reports rh-reports-hub">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">مركز التقارير</h1>
            <p className="rh-plans__desc">
              اختر نوع التقرير ثم الكيان (طالب، خطة، حلقة…) لاستخراج تقرير شامل بكل الأقسام — خطط، أنشطة، اختبارات،
              أعضاء، حضور، وأوراد.
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
        </div>
      </header>

      <section className="rh-reports-hub__kinds">
        <h2 className="rh-reports-hub__heading">1 — نوع التقرير</h2>
        <div className="rh-reports-hub__cards">
          {allowedKinds.map((option) => {
            const Icon = option.icon
            const active = kind === option.value
            return (
              <button
                key={option.value}
                type="button"
                className={['rh-reports-hub__card card', active ? 'rh-reports-hub__card--active' : ''].filter(Boolean).join(' ')}
                onClick={() => setKind(option.value)}
              >
                <RhIcon as={Icon} size={22} strokeWidth={RH_ICON_STROKE} aria-hidden />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            )
          })}
        </div>
      </section>

      {can(PAGE_ID, REPORT_KIND_PERMISSION.student) ? (
        <section className="rh-reports-hub__shortcut card">
          <h2 className="rh-reports-hub__heading">تقرير إنجاز سريع</h2>
          <p className="rh-plans__desc">
            لمعاينة «أنجز / بقي» بشكل بصري (خطط، أنشطة، اختبارات) بدون جداول — مفيد للمعلم عند متابعة طالب واحد.
          </p>
          <HapticLink to={appLink('/app/student-progress')} className="ui-btn ui-btn--secondary ui-btn--sm">
            فتح صفحة إنجازي
          </HapticLink>
        </section>
      ) : null}

      <section className="rh-settings-card rh-reports-hub__configure">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">2 — {selectedKindMeta?.label || 'التقرير'}</h2>
        </div>
        <div className="rh-reports__filters-grid">
          <SearchableSelect
            label={str('reports.field_entity')}
            options={entityOptions}
            value={entityId}
            onChange={setEntityId}
            placeholder={loadingEntities ? str('reports.loading_entities') : str('reports.field_entity')}
            searchPlaceholder={str('reports.search_placeholder')}
            emptyText={str('reports.search_empty')}
          />
          <RhDatePickerField
            label={str('reports.field_from')}
            value={fromDate}
            onChange={(v) => {
              setFromDate(v)
              setRangePreset('custom')
            }}
            placeholderText={str('reports.hijri_placeholder')}
          />
          <RhDatePickerField
            label={str('reports.field_to')}
            value={toDate}
            onChange={(v) => {
              setToDate(v)
              setRangePreset('custom')
            }}
            placeholderText={str('reports.hijri_placeholder')}
          />
        </div>
        <div className="rh-reports__range-presets">
          {REPORT_RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={rangePreset === preset.value ? 'primary' : 'ghost'}
              size="sm"
              icon={Calendar}
              onClick={() => applyRangePreset(preset.value)}
            >
              {rangePresetLabel(preset.value)}
            </Button>
          ))}
        </div>
        {isRangeInvalid ? <p className="rh-reports__range-error">{str('reports.range_invalid_hint')}</p> : null}
        {(kind === 'student' || kind === 'teacher') && entityId ? (
          <div className="rh-reports__scope-filters">
            {kind === 'student' ? (
              <SearchableSelect
                label="نطاق الخطة"
                options={scopePlanOptions}
                value={scopePlan}
                onChange={setScopePlan}
                placeholder={loadingScope ? 'جاري التحميل…' : 'كل الخطط'}
                searchPlaceholder={str('reports.search_placeholder')}
                emptyText={str('reports.search_empty')}
              />
            ) : null}
            <SearchableSelect
              label="نطاق الحلقة"
              options={scopeHalakaOptions}
              value={scopeHalaka}
              onChange={setScopeHalaka}
              placeholder={loadingScope ? 'جاري التحميل…' : 'كل الحلقات'}
              searchPlaceholder={str('reports.search_placeholder')}
              emptyText={str('reports.search_empty')}
            />
          </div>
        ) : null}
        <div className="rh-reports__filters-actions">
          <Button type="button" variant="primary" icon={FileText} disabled={!entityId || isRangeInvalid} onClick={openReport}>
            عرض التقرير الشامل
          </Button>
        </div>
      </section>
    </div>
  )
}
