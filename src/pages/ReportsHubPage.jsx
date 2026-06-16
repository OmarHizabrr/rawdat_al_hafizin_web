import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { CalendarDate } from '@internationalized/date'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import {
  REPORT_KIND_OPTIONS,
  REPORT_KIND_PERMISSION,
  REPORT_RANGE_PRESETS,
  ADMIN_REPORT_KIND_ORDER,
  reportViewPath,
  reportKindUsesDateFilter,
  reportKindIsPersonAutoReport,
  reportPersonSelectHintKey,
} from '../config/reportKinds.js'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useHidePlanNavigation } from '../hooks/useHidePlanNavigation.js'
import {
  listEntitiesByKind,
  loadTeachersDirectory,
  loadUsersDirectory,
  isCentralReportsMode,
} from '../services/reportsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { formatPlanVolumesForReport } from '../utils/reportDisplayLabels.js'
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
import { Button, RhDatePickerField, SearchableMultiSelect, SearchableSelect, useToast } from '../ui/index.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

const PAGE_ID = PERMISSION_PAGE_IDS.reports

function toEntityOptions(rows, kind) {
  return (rows || []).map((row) => {
    const base = row.name || row.displayName || row.email || row.uid || row.id
    let label = base
    if (kind === 'plan') {
      const vols = formatPlanVolumesForReport(row.raw?.volumes)
      if (vols && vols !== '—') label = `${base} — ${vols}`
    }
    return {
      value: row.id || row.uid,
      label,
    }
  })
}

function sortKindsForUser(kinds, user) {
  if (!isAdmin(user)) return kinds
  return [...kinds].sort((a, b) => {
    const ia = ADMIN_REPORT_KIND_ORDER.indexOf(a.value)
    const ib = ADMIN_REPORT_KIND_ORDER.indexOf(b.value)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
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
    () =>
      sortKindsForUser(
        REPORT_KIND_OPTIONS.filter((k) => can(PAGE_ID, REPORT_KIND_PERMISSION[k.value])),
        user,
      ),
    [can, user],
  )

  const centralReports = isCentralReportsMode(user)

  const [kind, setKind] = useState(() => allowedKinds[0]?.value || 'student')
  const showDateFilters = reportKindUsesDateFilter(kind)
  const personAutoReport = reportKindIsPersonAutoReport(kind)
  const personHintKey = reportPersonSelectHintKey(kind)

  const adminDefaultKindSet = useRef(false)
  const [entityId, setEntityId] = useState('')
  const [entityIds, setEntityIds] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rangePreset, setRangePreset] = useState('all')
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
      const kindForPath = kindParam || kind
      navigate(
        appLink(
          reportViewPath({
            kind: kindForPath,
            entityId: entityParam,
            from: reportKindUsesDateFilter(kindForPath) ? String(params.get('from') || '').trim() || undefined : undefined,
            to: reportKindUsesDateFilter(kindForPath) ? String(params.get('to') || '').trim() || undefined : undefined,
            rangePreset: reportKindUsesDateFilter(kindForPath)
              ? String(params.get('rangePreset') || '').trim() || undefined
              : undefined,
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
    if (!reportKindIsPersonAutoReport(kind)) return
    setFromDate('')
    setToDate('')
    setRangePreset('all')
  }, [kind])

  useEffect(() => {
    if (!centralReports || adminDefaultKindSet.current) return
    if (allowedKinds.some((k) => k.value === 'plan')) {
      setKind('plan')
      adminDefaultKindSet.current = true
    }
  }, [centralReports, allowedKinds])

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return
    let cancelled = false
    setLoadingEntities(true)
    setEntities([])
    setEntityId('')
    setEntityIds([])
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
        const rows = await listEntitiesByKind(kind, { currentUser: user })
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

  const entityOptions = useMemo(() => toEntityOptions(entities, kind), [entities, kind])
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
    const studentIds =
      kind === 'student'
        ? entityIds.length
          ? entityIds
          : entityId
            ? [entityId]
            : []
        : []
    const targetId = kind === 'student' ? studentIds[0] : entityId
    if (!targetId) {
      toast.warning('اختر الكيان أولاً.', '')
      return
    }
    if (showDateFilters && isRangeInvalid) {
      toast.warning(str('reports.toast_invalid_range'))
      return
    }
    navigate(
      appLink(
        reportViewPath({
          kind,
          entityId: targetId,
          entityIds: kind === 'student' && studentIds.length > 1 ? studentIds : undefined,
          from: showDateFilters ? fromDate || undefined : undefined,
          to: showDateFilters ? toDate || undefined : undefined,
          rangePreset: showDateFilters ? rangePreset : undefined,
        }),
      ),
    )
  }

  const onEntityChange = useCallback(
    (id) => {
      setEntityId(id)
      if (reportKindIsPersonAutoReport(kind) && id) {
        navigate(appLink(reportViewPath({ kind, entityId: id })))
      }
    },
    [kind, navigate, appLink],
  )

  const onStudentIdsChange = useCallback(
    (ids) => {
      setEntityIds(ids)
      setEntityId(ids[0] || '')
      if (ids.length) {
        navigate(
          appLink(
            reportViewPath({
              kind: 'student',
              entityId: ids[0],
              entityIds: ids.length > 1 ? ids : undefined,
            }),
          ),
        )
      }
    },
    [navigate, appLink],
  )

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

      {centralReports ? (
        <div className="rh-reports-hub__central card" role="status">
          <strong>{str('reports.admin_central_title')}</strong>
          <p>{str('reports.admin_central_desc')}</p>
        </div>
      ) : null}

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
          {kind === 'student' ? (
            <SearchableMultiSelect
              label="الطلاب (يمكن اختيار أكثر من طالب)"
              options={entityOptions}
              value={entityIds.length ? entityIds : entityId ? [entityId] : []}
              onChange={onStudentIdsChange}
              placeholder={loadingEntities ? str('reports.loading_entities') : 'اختر طالباً أو أكثر…'}
              searchPlaceholder={str('reports.search_placeholder')}
              emptyText={str('reports.search_empty')}
              summaryLabel={(count) => `${count} طالب مختار`}
            />
          ) : (
            <SearchableSelect
              label={str('reports.field_entity')}
              options={entityOptions}
              value={entityId}
              onChange={onEntityChange}
              placeholder={loadingEntities ? str('reports.loading_entities') : str('reports.field_entity')}
              searchPlaceholder={str('reports.search_placeholder')}
              emptyText={str('reports.search_empty')}
            />
          )}
          {personHintKey ? (
            <p className="rh-reports-hub__student-hint">{str(personHintKey)}</p>
          ) : null}
          {centralReports && !loadingEntities && entities.length > 0 ? (
            <p className="rh-reports-hub__entity-count">{str('reports.admin_entity_count', { count: entities.length })}</p>
          ) : null}
          {showDateFilters ? (
            <>
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
            </>
          ) : null}
        </div>
        {showDateFilters ? (
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
        ) : null}
        {showDateFilters && isRangeInvalid ? (
          <p className="rh-reports__range-error">{str('reports.range_invalid_hint')}</p>
        ) : null}
        <div className="rh-reports__filters-actions">
          {personAutoReport ? null : (
            <Button
              type="button"
              variant="primary"
              icon={FileText}
              disabled={!entityId || (showDateFilters && isRangeInvalid)}
              onClick={openReport}
            >
              عرض التقرير الشامل
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
