import { Download, FileText, Filter, Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { buildGroupReport, buildStudentReport, listEntitiesByKind, loadUsersDirectory } from '../services/reportsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { Button, SearchableSelect, TextField, useToast } from '../ui/index.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

const PAGE_ID = PERMISSION_PAGE_IDS.reports

const REPORT_KIND_OPTIONS = [
  { value: 'student', label: 'تقرير طالب' },
  { value: 'halaka', label: 'تقرير حلقة' },
  { value: 'plan', label: 'تقرير خطة' },
  { value: 'activity', label: 'تقرير نشاط' },
  { value: 'exam', label: 'تقرير اختبار' },
  { value: 'dawra', label: 'تقرير دورة' },
  { value: 'remote_tasmee', label: 'تقرير تسميع عن بُعد' },
]

function normalizeDateInputStart(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  const d = new Date(`${s}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function normalizeDateInputEnd(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  const d = new Date(`${s}T23:59:59.999`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsvFile(rows, fileName) {
  if (!Array.isArray(rows) || rows.length === 0) return false
  const headers = Object.keys(rows[0] || {})
  const lines = [headers.map(csvEscape).join(';')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(';'))
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return true
}

function toEntityOptions(rows) {
  return (rows || []).map((row) => ({
    value: row.id || row.uid,
    label: row.name || row.displayName || row.email || row.uid || row.id,
  }))
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { str, branding } = useSiteContent()
  const toast = useToast()
  const { search } = useLocation()

  const [kind, setKind] = useState('student')
  const [entityId, setEntityId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [entities, setEntities] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState(null)

  const canPrint = can(PAGE_ID, 'reports_print')
  const canExportCsv = can(PAGE_ID, 'reports_export_csv')
  const canRunForKind = useCallback(
    (k) => {
      if (k === 'student') return can(PAGE_ID, 'student_report')
      if (k === 'halaka') return can(PAGE_ID, 'halaka_report')
      if (k === 'plan') return can(PAGE_ID, 'plan_report')
      if (k === 'activity') return can(PAGE_ID, 'activity_report')
      if (k === 'exam') return can(PAGE_ID, 'exam_report')
      if (k === 'dawra') return can(PAGE_ID, 'dawra_report')
      return can(PAGE_ID, 'remote_tasmee_report')
    },
    [can],
  )

  useEffect(() => {
    document.title = str('reports.doc_title', { siteTitle: branding.siteTitle })
  }, [str, branding.siteTitle])

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return
    if (!canRunForKind(kind)) {
      const firstAllowed = REPORT_KIND_OPTIONS.find((k) => canRunForKind(k.value))
      if (firstAllowed) setKind(firstAllowed.value)
    }
  }, [kind, canRunForKind, canAccessPage])

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return
    let cancelled = false
    setLoadingEntities(true)
    setEntities([])
    setEntityId('')
    const run = async () => {
      try {
        if (kind === 'student') {
          const users = await loadUsersDirectory()
          if (!cancelled) setEntities(users)
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
  }, [kind, canAccessPage])

  const entityOptions = useMemo(() => toEntityOptions(entities), [entities])
  const entityMap = useMemo(
    () =>
      new Map(
        (entities || []).map((row) => [
          row.id || row.uid,
          row.name || row.displayName || row.email || row.uid || row.id,
        ]),
      ),
    [entities],
  )

  const range = useMemo(
    () => ({ from: normalizeDateInputStart(fromDate), to: normalizeDateInputEnd(toDate) }),
    [fromDate, toDate],
  )

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, getImpersonateUid(user, search)),
    [user, search],
  )
  const crossItems = useMemo(
    () => [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/activities'), label: str('layout.nav_activities') },
      { to: appLink('/app/exams'), label: str('layout.nav_exams') },
      { to: appLink('/app/reports'), label: str('layout.nav_reports') },
    ],
    [appLink, str],
  )

  const build = async () => {
    if (!entityId || !canRunForKind(kind)) return
    setLoadingReport(true)
    try {
      const result =
        kind === 'student'
          ? await buildStudentReport(entities.find((u) => (u.uid || u.id) === entityId), range)
          : await buildGroupReport(kind, entityId, range)
      setReportData(result)
    } catch {
      toast.warning(str('reports.toast_failed'))
    } finally {
      setLoadingReport(false)
    }
  }

  const onPrint = () => {
    if (!canPrint) return
    if (typeof window !== 'undefined') window.print()
  }

  const onExportCsv = () => {
    if (!canExportCsv || !reportData) return
    const rows =
      reportData.kind === 'student'
        ? [
            ...reportData.modules.plans.map((r) => ({ القسم: 'الخطط', المعرّف: r.id, الاسم: r.name || '', الدور: r.planRole || '' })),
            ...reportData.modules.halakat.map((r) => ({ القسم: 'الحلقات', المعرّف: r.id, الاسم: r.name || '', الدور: r.halakaRole || '' })),
            ...reportData.modules.activities.map((r) => ({ القسم: 'الأنشطة', المعرّف: r.id, الاسم: r.name || '', الدور: r.activityRole || '' })),
            ...reportData.modules.exams.map((r) => ({ القسم: 'الاختبارات', المعرّف: r.id, الاسم: r.name || '', الدور: r.examRole || '' })),
            ...reportData.modules.dawrat.map((r) => ({ القسم: 'الدورات', المعرّف: r.id, الاسم: r.name || '', الدور: r.dawraRole || '' })),
            ...reportData.modules.remoteTasmee.map((r) => ({
              القسم: 'التسميع عن بعد',
              المعرّف: r.id,
              الاسم: r.name || r.meetingCode || '',
              الدور: r.broadcastRole || '',
            })),
          ]
        : (reportData.members || []).map((m) => ({
            المعرّف: m.userId,
            الاسم: m.displayName || '',
            البريد: m.email || '',
            الدور: m.role || '',
          }))
    if (!rows.length) {
      toast.info(str('reports.toast_csv_empty'))
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsvFile(rows, `report-${kind}-${entityId}-${stamp}.csv`)
  }

  const canBuild = Boolean(entityId && canRunForKind(kind))
  const selectedEntityName = entityMap.get(entityId) || ''

  if (!canAccessPage(PAGE_ID)) {
    return <p className="rh-plans__empty">{str('reports.no_access')}</p>
  }

  return (
    <div className="rh-plans rh-reports">
      <div className="rh-print-only" aria-hidden="true">
        <p className="rh-print-only__title">{str('reports.print_title')}</p>
        <p className="rh-print-only__meta">
          {str('reports.print_meta', {
            type: REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || '',
            entity: selectedEntityName || '—',
            from: fromDate || '—',
            to: toDate || '—',
            date: new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }),
            siteTitle: branding.siteTitle,
          })}
        </p>
      </div>

      <header className="rh-plans__hero no-print">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">{str('reports.hero_title')}</h1>
            <p className="rh-plans__desc">{str('reports.hero_desc')}</p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <div className="rh-plans__hero-actions">
            <Button type="button" variant="secondary" onClick={onPrint} disabled={!canPrint || !reportData}>
              <RhIcon as={Printer} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('reports.btn_print')}
            </Button>
            <Button type="button" variant="secondary" onClick={onExportCsv} disabled={!canExportCsv || !reportData}>
              <RhIcon as={Download} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('reports.btn_csv')}
            </Button>
          </div>
        </div>
      </header>

      <section className="rh-settings-card rh-reports__filters no-print">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">
            <RhIcon as={Filter} size={18} strokeWidth={RH_ICON_STROKE} /> {str('reports.filters_title')}
          </h2>
        </div>
        <div className="rh-reports__filters-grid">
          <SearchableSelect
            label={str('reports.field_report_type')}
            options={REPORT_KIND_OPTIONS.filter((k) => canRunForKind(k.value))}
            value={kind}
            onChange={setKind}
            placeholder={str('reports.field_report_type')}
            searchPlaceholder={str('reports.search_placeholder')}
            emptyText={str('reports.search_empty')}
          />
          <SearchableSelect
            label={str('reports.field_entity')}
            options={entityOptions}
            value={entityId}
            onChange={setEntityId}
            placeholder={loadingEntities ? str('reports.loading_entities') : str('reports.field_entity')}
            searchPlaceholder={str('reports.search_placeholder')}
            emptyText={str('reports.search_empty')}
          />
          <TextField label={str('reports.field_from')} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <TextField label={str('reports.field_to')} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="rh-reports__filters-actions">
          <Button type="button" variant="primary" disabled={!canBuild} loading={loadingReport} onClick={build}>
            <RhIcon as={FileText} size={18} strokeWidth={RH_ICON_STROKE} />
            {str('reports.btn_build')}
          </Button>
        </div>
      </section>

      {!reportData ? (
        <p className="rh-plans__empty">{str('reports.empty')}</p>
      ) : reportData.kind === 'student' ? (
        <section className="rh-reports__result">
          <div className="rh-reports__kpis">
            <div className="card rh-reports__kpi"><strong>{reportData.summary.plans}</strong><span>{str('layout.nav_plans')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.halakat}</strong><span>{str('layout.nav_halakat')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.activities}</strong><span>{str('layout.nav_activities')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.exams}</strong><span>{str('layout.nav_exams')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.awrad}</strong><span>{str('layout.nav_awrad')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.totalPages}</strong><span>{str('reports.kpi_pages')}</span></div>
          </div>
        </section>
      ) : (
        <section className="rh-reports__result">
          <div className="rh-reports__kpis">
            <div className="card rh-reports__kpi"><strong>{reportData.summary.members}</strong><span>{str('reports.kpi_members')}</span></div>
            {reportData.kind === 'halaka' && (
              <>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.sessions}</strong><span>{str('reports.kpi_sessions')}</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.attendance}</strong><span>{str('reports.kpi_attendance')}</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.pagesTotal}</strong><span>{str('reports.kpi_pages')}</span></div>
              </>
            )}
          </div>
          <div className="rh-settings-card">
            <div className="rh-settings-card__head">
              <h3 className="rh-settings-card__title">{str('reports.members_title')}</h3>
            </div>
            <ul className="rh-members-chat-list">
              {(reportData.members || []).map((m) => (
                <li key={m.userId} className="rh-members-chat__item">
                  <div className="rh-members-chat__main">
                    <strong>{m.displayName || m.userId}</strong>
                    <span className="rh-plans__saved-badge">{m.role || '—'}</span>
                  </div>
                  <span>{m.email || ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
