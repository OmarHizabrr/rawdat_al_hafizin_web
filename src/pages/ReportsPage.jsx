import { Download, Eye, FileText, Filter, Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  buildGroupReport,
  buildStudentReport,
  buildTeacherReport,
  listEntitiesByKind,
  loadTeachersDirectory,
  loadUsersDirectory,
} from '../services/reportsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { Button, SearchableSelect, TextField, useToast } from '../ui/index.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

const PAGE_ID = PERMISSION_PAGE_IDS.reports

const REPORT_KIND_OPTIONS = [
  { value: 'student', label: 'تقرير طالب' },
  { value: 'teacher', label: 'تقرير معلم' },
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

function formatArDateTime(v) {
  const d = new Date(String(v || ''))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
}

function roleLabelAr(role) {
  const r = String(role || '').trim().toLowerCase()
  if (r === 'teacher') return 'معلم'
  if (r === 'student') return 'طالب'
  if (r === 'member') return 'عضو'
  if (r === 'owner') return 'مالك'
  if (r === 'supervisor') return 'مشرف'
  if (r === 'admin') return 'أدمن'
  return role || '—'
}

function printSingleTable(title, columns, rows) {
  if (!rows?.length) return
  const head = columns.map((c) => `<th>${String(c.label || '')}</th>`).join('')
  const body = rows
    .map((row) => {
      const cells = columns.map((c) => `<td>${String(row?.[c.key] ?? '—')}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${title}</title><style>
  body{font-family:Tahoma,Arial,sans-serif;padding:20px;color:#111}
  h2{margin:0 0 12px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #bbb;padding:8px;text-align:right;font-size:13px}
  th{background:#f4f4f4}
  </style></head><body><h2>${title}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function SectionTable({ title, columns, rows, actions }) {
  if (!rows?.length) return null
  return (
    <div className="rh-settings-card rh-reports__section">
      <div className="rh-settings-card__head">
        <h3 className="rh-settings-card__title">{title}</h3>
        <div className="no-print">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => printSingleTable(title, columns, rows)}
          >
            <RhIcon as={Printer} size={16} strokeWidth={RH_ICON_STROKE} />
            طباعة الجدول
          </Button>
        </div>
      </div>
      <div className="rh-admin-plan-types__table-wrap">
        <table className="rh-admin-plan-types__table rh-reports__table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              {actions && <th className="no-print">عرض</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${title}-${i}`}>
                {columns.map((c) => <td key={c.key}>{row[c.key] ?? '—'}</td>)}
                {actions && <td className="no-print">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
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
      if (k === 'teacher') return can(PAGE_ID, 'teacher_report')
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
          : kind === 'teacher'
            ? await buildTeacherReport(entities.find((u) => (u.uid || u.id) === entityId), range)
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
    const rows = []
    if (reportData.kind === 'student') {
      const addRows = (section, sectionRows) => {
        for (const row of sectionRows || []) rows.push({ القسم: section, ...row })
      }
      addRows('الخطط', reportData.studentRows?.plans)
      addRows('الحلقات', reportData.studentRows?.halakat)
      addRows('الأنشطة', reportData.studentRows?.activities)
      addRows('الاختبارات', reportData.studentRows?.exams)
      addRows('الدورات', reportData.studentRows?.dawrat)
      addRows('التسميع عن بعد', reportData.studentRows?.remoteTasmee)
      addRows(
        'الأوراد',
        (reportData.awrad || []).map((r) => ({
          id: r.id,
          recordedAt: r.recordedAt || '',
          pagesCount: r.pagesCount ?? '',
          fromPage: r.fromPage ?? '',
          toPage: r.toPage ?? '',
        })),
      )
      addRows(
        'الإشعارات',
        (reportData.notifications || []).map((r) => ({
          id: r.id,
          notificationType: r.notificationType || '',
          title: r.title || '',
          createdAt: r.createdAt || '',
          isRead: r.isRead ? 'نعم' : 'لا',
        })),
      )
    } else if (reportData.kind === 'teacher') {
      const addRows = (section, sectionRows) => {
        for (const row of sectionRows || []) rows.push({ القسم: section, ...row })
      }
      addRows('الخطط', reportData.teacherRows?.plans)
      addRows('الحلقات', reportData.teacherRows?.halakat)
      addRows('الأنشطة', reportData.teacherRows?.activities)
      addRows('الاختبارات', reportData.teacherRows?.exams)
      addRows('الدورات', reportData.teacherRows?.dawrat)
      addRows('التسميع عن بعد', reportData.teacherRows?.remoteTasmee)
      addRows(
        'جلسات المعلم',
        (reportData.sessions || []).map((s) => ({
          id: s.id,
          title: s.title || '',
          startedAt: s.startedAt || '',
          endedAt: s.endedAt || '',
          status: s.status || '',
        })),
      )
      addRows(
        'تسجيلات الحضور',
        (reportData.attendanceRecorded || []).map((a) => ({
          id: a.id,
          userId: a.userId || '',
          attendanceStatus: a.attendanceStatus || '',
          pagesCount: a.pagesCount ?? '',
          updatedAt: a.updatedAt || '',
        })),
      )
    } else {
      if (reportData.entityDetails) {
        rows.push({ القسم: 'تفاصيل الكيان', ...reportData.entityDetails })
      }
      for (const m of reportData.members || []) {
        rows.push({
          القسم: 'الأعضاء',
          المعرّف: m.userId,
          الاسم: m.displayName || '',
          البريد: m.email || '',
          الدور: roleLabelAr(m.role),
        })
      }
      if (reportData.kind === 'halaka') {
        for (const s of reportData.sessions || []) {
          rows.push({
            القسم: 'جلسات الحلقة',
            المعرّف: s.id,
            الاسم: s.title || '',
            startedAt: s.startedAt || '',
            endedAt: s.endedAt || '',
            status: s.status || '',
          })
        }
        for (const a of reportData.attendanceRows || []) {
          rows.push({
            القسم: 'حضور الحلقة',
            sessionId: a.sessionId || '',
            userId: a.userId || '',
            attendanceStatus: a.attendanceStatus || '',
            pagesCount: a.pagesCount ?? '',
            fromPage: a.fromPage ?? '',
            toPage: a.toPage ?? '',
          })
        }
      }
    }
    if (!rows.length) {
      toast.info(str('reports.toast_csv_empty'))
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsvFile(rows, `report-${kind}-${entityId}-${stamp}.csv`)
  }

  const canBuild = Boolean(entityId && canRunForKind(kind))
  const selectedEntityName = entityMap.get(entityId) || ''
  const halakaMemberNameMap = useMemo(() => {
    const map = new Map()
    for (const m of reportData?.members || []) {
      const uid = String(m?.userId || '').trim()
      if (!uid) continue
      map.set(uid, m.displayName || uid)
    }
    return map
  }, [reportData?.members])
  const viewLinkByKind = useCallback(
    (k, id) => {
      if (!id) return ''
      if (k === 'plan') return appLink(`/app/plans?focus=${id}`)
      if (k === 'halaka') return appLink(`/app/halakat?focus=${id}`)
      if (k === 'activity') return appLink(`/app/activities?focus=${id}`)
      if (k === 'exam') return appLink(`/app/exams?focus=${id}`)
      if (k === 'dawra') return appLink(`/app/dawrat?focus=${id}`)
      if (k === 'remote_tasmee') return appLink(`/app/remote-tasmee?focus=${id}`)
      return ''
    },
    [appLink],
  )

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
          <SectionTable
            title="الخطط"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibility', label: 'الظهور' },
              { key: 'joinedAt', label: 'تاريخ الانضمام' },
            ]}
            rows={(reportData.studentRows?.plans || []).map((r) => ({ ...r, role: roleLabelAr(r.role) }))}
            actions={(row) => {
              const to = viewLinkByKind('plan', row.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <SectionTable
            title="الحلقات"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibility', label: 'الظهور' },
              { key: 'joinedAt', label: 'تاريخ الانضمام' },
            ]}
            rows={(reportData.studentRows?.halakat || []).map((r) => ({ ...r, role: roleLabelAr(r.role) }))}
            actions={(row) => {
              const to = viewLinkByKind('halaka', row.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <SectionTable
            title="الأنشطة"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'startAt', label: 'البداية' },
              { key: 'endAt', label: 'النهاية' },
            ]}
            rows={(reportData.studentRows?.activities || []).map((r) => ({
              ...r,
              role: roleLabelAr(r.role),
              startAt: formatArDateTime(r.startAt),
              endAt: formatArDateTime(r.endAt),
            }))}
            actions={(row) => {
              const to = viewLinkByKind('activity', row.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <SectionTable
            title="الاختبارات"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibility', label: 'الظهور' },
            ]}
            rows={(reportData.studentRows?.exams || []).map((r) => ({ ...r, role: roleLabelAr(r.role) }))}
            actions={(row) => {
              const to = viewLinkByKind('exam', row.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <SectionTable
            title="الدورات"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'courseStart', label: 'بداية الدورة' },
              { key: 'courseEnd', label: 'نهاية الدورة' },
            ]}
            rows={(reportData.studentRows?.dawrat || []).map((r) => ({
              ...r,
              role: roleLabelAr(r.role),
              courseStart: formatArDateTime(r.courseStart),
              courseEnd: formatArDateTime(r.courseEnd),
            }))}
            actions={(row) => {
              const to = viewLinkByKind('dawra', row.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <SectionTable
            title="التسميع عن بعد"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'provider', label: 'المزوّد' },
              { key: 'mediaType', label: 'النوع' },
            ]}
            rows={(reportData.studentRows?.remoteTasmee || []).map((r) => ({ ...r, role: roleLabelAr(r.role) }))}
            actions={(row) => {
              const to = viewLinkByKind('remote_tasmee', row.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <SectionTable
            title="الأوراد"
            columns={[
              { key: 'id', label: 'المعرّف' },
              { key: 'recordedAt', label: 'تاريخ الورد' },
              { key: 'pagesCount', label: 'عدد الصفحات' },
              { key: 'fromPage', label: 'من صفحة' },
              { key: 'toPage', label: 'إلى صفحة' },
            ]}
            rows={(reportData.awrad || []).map((r) => ({
              id: r.id,
              recordedAt: formatArDateTime(r.recordedAt),
              pagesCount: r.pagesCount ?? 0,
              fromPage: r.fromPage ?? '—',
              toPage: r.toPage ?? '—',
            }))}
          />
          <SectionTable
            title="الإشعارات"
            columns={[
              { key: 'id', label: 'المعرّف' },
              { key: 'title', label: 'العنوان' },
              { key: 'notificationType', label: 'النوع' },
              { key: 'createdAt', label: 'التاريخ' },
              { key: 'isRead', label: 'مقروء' },
            ]}
            rows={(reportData.notifications || []).map((r) => ({
              id: r.id,
              title: r.title || '',
              notificationType: r.notificationType || '',
              createdAt: formatArDateTime(r.createdAt),
              isRead: r.isRead ? 'نعم' : 'لا',
            }))}
          />
        </section>
      ) : reportData.kind === 'teacher' ? (
        <section className="rh-reports__result">
          <div className="rh-reports__kpis">
            <div className="card rh-reports__kpi"><strong>{reportData.summary.halakat}</strong><span>{str('layout.nav_halakat')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.plans}</strong><span>{str('layout.nav_plans')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.exams}</strong><span>{str('layout.nav_exams')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.sessions}</strong><span>جلسات مسجلة</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.attendanceRecorded}</strong><span>تسجيلات حضور</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.studentsRecorded}</strong><span>طلاب تم تسجيلهم</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.pagesRecorded}</strong><span>{str('reports.kpi_pages')}</span></div>
          </div>
          <SectionTable
            title="حلقات المعلم"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibility', label: 'الظهور' },
            ]}
            rows={(reportData.teacherRows?.halakat || []).map((r) => ({ ...r, role: roleLabelAr(r.role) }))}
            actions={(row) => {
              const to = viewLinkByKind('halaka', row.id)
              if (!to) return null
              return <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm"><RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} /></a>
            }}
          />
          <SectionTable
            title="باقي ارتباطات المعلم"
            columns={[
              { key: 'section', label: 'القسم' },
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibility', label: 'الظهور' },
            ]}
            rows={[
              ...(reportData.teacherRows?.plans || []).map((r) => ({ section: 'الخطط', ...r, role: roleLabelAr(r.role) })),
              ...(reportData.teacherRows?.activities || []).map((r) => ({ section: 'الأنشطة', ...r, role: roleLabelAr(r.role) })),
              ...(reportData.teacherRows?.exams || []).map((r) => ({ section: 'الاختبارات', ...r, role: roleLabelAr(r.role) })),
              ...(reportData.teacherRows?.dawrat || []).map((r) => ({ section: 'الدورات', ...r, role: roleLabelAr(r.role) })),
              ...(reportData.teacherRows?.remoteTasmee || []).map((r) => ({ section: 'التسميع عن بعد', ...r, role: roleLabelAr(r.role) })),
            ]}
          />
          <SectionTable
            title="جلسات سجّلها المعلم"
            columns={[
              { key: 'title', label: 'العنوان' },
              { key: 'startedAt', label: 'البداية' },
              { key: 'endedAt', label: 'النهاية' },
              { key: 'status', label: 'الحالة' },
            ]}
            rows={(reportData.sessions || []).map((s) => ({
              title: s.title || '',
              startedAt: formatArDateTime(s.startedAt),
              endedAt: formatArDateTime(s.endedAt),
              status: s.status || '',
            }))}
          />
          <SectionTable
            title="سجلات الحضور التي أدخلها المعلم"
            columns={[
              { key: 'userId', label: 'المستخدم' },
              { key: 'attendanceStatus', label: 'الحضور' },
              { key: 'pagesCount', label: 'الصفحات' },
              { key: 'updatedAt', label: 'آخر تحديث' },
            ]}
            rows={(reportData.attendanceRecorded || []).map((a) => ({
              userId: a.userId || '',
              attendanceStatus: a.attendanceStatus || '',
              pagesCount: a.pagesCount ?? 0,
              updatedAt: formatArDateTime(a.updatedAt),
            }))}
          />
          <SectionTable
            title="ملخص تسجيلات المعلم حسب كل طالب"
            columns={[
              { key: 'userId', label: 'المستخدم' },
              { key: 'recordsCount', label: 'عدد التسجيلات' },
              { key: 'pagesTotal', label: 'إجمالي الصفحات' },
              { key: 'latestUpdatedAt', label: 'آخر تحديث' },
            ]}
            rows={(reportData.attendanceByStudent || []).map((r) => ({
              ...r,
              latestUpdatedAt: formatArDateTime(r.latestUpdatedAt),
            }))}
          />
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
          <SectionTable
            title="تفاصيل الكيان"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'visibility', label: 'الظهور' },
              { key: 'ownerUid', label: 'المالك' },
              { key: 'createdAt', label: 'الإنشاء' },
              { key: 'updatedAt', label: 'آخر تحديث' },
              { key: 'startAt', label: 'البداية' },
              { key: 'endAt', label: 'النهاية' },
              { key: 'location', label: 'الموقع/الرابط' },
              { key: 'provider', label: 'المزود' },
              { key: 'mediaType', label: 'النوع' },
            ]}
            rows={[
              {
                ...reportData.entityDetails,
                createdAt: formatArDateTime(reportData.entityDetails?.createdAt),
                updatedAt: formatArDateTime(reportData.entityDetails?.updatedAt),
                startAt: formatArDateTime(reportData.entityDetails?.startAt),
                endAt: formatArDateTime(reportData.entityDetails?.endAt),
              },
            ]}
            actions={() => {
              const to = viewLinkByKind(reportData.kind, reportData.entityDetails?.id)
              if (!to) return null
              return (
                <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm">
                  <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                </a>
              )
            }}
          />
          <div className="rh-settings-card">
            <div className="rh-settings-card__head">
              <h3 className="rh-settings-card__title">{str('reports.members_title')}</h3>
            </div>
            <ul className="rh-members-chat-list">
              {(reportData.members || []).map((m) => (
                <li key={m.userId} className="rh-members-chat__item">
                  <div className="rh-members-chat__main">
                    <strong>{m.displayName || m.userId}</strong>
                    <span className="rh-plans__saved-badge">{roleLabelAr(m.role)}</span>
                  </div>
                  <span>{m.email || ''}</span>
                </li>
              ))}
            </ul>
          </div>
          {reportData.kind === 'halaka' && (
            <SectionTable
              title="تفاصيل أعضاء الحلقة (شامل)"
              columns={[
                { key: 'displayName', label: 'الاسم' },
                { key: 'role', label: 'دوره في الحلقة' },
                { key: 'plansCount', label: 'خططه' },
                { key: 'halakatCount', label: 'حلقاته' },
                { key: 'activitiesCount', label: 'أنشطته' },
                { key: 'examsCount', label: 'اختباراته' },
                { key: 'dawratCount', label: 'دوراته' },
                { key: 'remoteTasmeeCount', label: 'تسميعه عن بعد' },
                { key: 'awradCount', label: 'عدد أوراده' },
                { key: 'pagesInAwrad', label: 'صفحات الأوراد' },
                { key: 'latestAwradAt', label: 'آخر ورد' },
                { key: 'attendanceRecordsInHalaka', label: 'حضوره في هذه الحلقة' },
                { key: 'pagesInHalakaSessions', label: 'صفحاته في جلسات الحلقة' },
                { key: 'latestAttendanceAt', label: 'آخر حضور' },
              ]}
              rows={(reportData.memberDetails || []).map((r) => ({
                ...r,
                role: roleLabelAr(r.role),
                latestAwradAt: formatArDateTime(r.latestAwradAt),
                latestAttendanceAt: formatArDateTime(r.latestAttendanceAt),
              }))}
            />
          )}
          {reportData.kind === 'halaka' && (
            <>
              <SectionTable
                title="جلسات الحلقة"
                columns={[
                  { key: 'id', label: 'المعرّف' },
                  { key: 'title', label: 'العنوان' },
                  { key: 'startedAt', label: 'البداية' },
                  { key: 'endedAt', label: 'النهاية' },
                  { key: 'status', label: 'الحالة' },
                ]}
                rows={(reportData.sessions || []).map((s) => ({
                  id: s.id,
                  title: s.title || '',
                  startedAt: formatArDateTime(s.startedAt),
                  endedAt: formatArDateTime(s.endedAt),
                  status: s.status || '',
                }))}
              />
              <SectionTable
                title="سجل الحضور والتسميع"
                columns={[
                  { key: 'sessionId', label: 'الجلسة' },
                  { key: 'userName', label: 'المستخدم' },
                  { key: 'attendanceStatus', label: 'الحضور' },
                  { key: 'pagesCount', label: 'الصفحات' },
                  { key: 'fromPage', label: 'من' },
                  { key: 'toPage', label: 'إلى' },
                ]}
                rows={(reportData.attendanceRows || []).map((a) => ({
                  sessionId: a.sessionId || '',
                  userName: halakaMemberNameMap.get(String(a.userId || '').trim()) || a.userId || '',
                  attendanceStatus: a.attendanceStatus || '',
                  pagesCount: a.pagesCount ?? 0,
                  fromPage: a.fromPage ?? '—',
                  toPage: a.toPage ?? '—',
                }))}
              />
            </>
          )}
        </section>
      )}
    </div>
  )
}
