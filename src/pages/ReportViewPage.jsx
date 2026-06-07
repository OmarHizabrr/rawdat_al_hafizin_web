import { CalendarDate } from '@internationalized/date'
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  FileText,
  FilterX,
  Link2,
  Printer,
  RefreshCw,
  Share2,
} from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PrintDocumentChrome } from '../components/PrintDocumentChrome.jsx'
import { ReportExecutiveSummary } from '../components/ReportExecutiveSummary.jsx'
import { ReportQuickLink } from '../components/ReportQuickLink.jsx'
import { HapticLink } from '../ui/HapticLink.jsx'
import {
  REPORT_KIND_OPTIONS,
  REPORT_KIND_PERMISSION,
  REPORT_RANGE_PRESETS,
  reportViewPath,
} from '../config/reportKinds.js'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useHidePlanNavigation } from '../hooks/useHidePlanNavigation.js'
import {
  buildGroupReport,
  buildStudentReport,
  buildTeacherReport,
  listEntitiesByKind,
  loadTeachersDirectory,
  loadUsersDirectory,
} from '../services/reportsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { canViewCreator } from '../utils/viewCreatorPermission.js'
import {
  HIJRI,
  formatHijriYmd,
  gregorianYmdStringToHijriYmd,
  hijriYmdLocalDayEndIso,
  hijriYmdLocalDayStartIso,
  localHijriYmd,
  parseHijriYmdString,
} from '../utils/hijriDates.js'
import { elementToPdfBlob, shareOrDownloadPdf } from '../utils/reportPdf.js'
import {
  entityDetailsColumnsForKind,
  formatEntityDetailsForReport,
  reportAttendanceStatusLabel,
  reportMediaTypeLabel,
  reportNotificationTypeLabel,
  reportPersonLabel,
  reportProviderLabel,
  reportSessionStatusLabel,
  reportVisibilityLabel,
} from '../utils/reportDisplayLabels.js'
import { buildReportExecutiveSummary } from '../utils/reportExecutiveSummary.js'
import { collectPrintKpisFromReport, collectPrintSectionsFromReport } from '../utils/reportPrintSections.js'
import { printMultiSectionReport, printSingleTable as printSingleTableDoc } from '../utils/reportPrintUtils.js'
import { studentProgressLink } from '../utils/studentProgressLink.js'
import { Button, RhDatePickerField, SearchableSelect, useToast } from '../ui/index.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

const PAGE_ID = PERMISSION_PAGE_IDS.reports

const STUDENT_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'plans', label: 'الخطط' },
  { id: 'halakat', label: 'الحلقات' },
  { id: 'activities', label: 'الأنشطة' },
  { id: 'exams', label: 'الاختبارات' },
  { id: 'dawrat', label: 'الدورات' },
  { id: 'remote', label: 'التسميع' },
  { id: 'awrad', label: 'الأوراد' },
  { id: 'notifications', label: 'الإشعارات' },
]

const TEACHER_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'halakat', label: 'الحلقات' },
  { id: 'memberships', label: 'الارتباطات' },
  { id: 'sessions', label: 'الجلسات' },
  { id: 'attendance', label: 'الحضور' },
]

const GROUP_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'details', label: 'التفاصيل' },
  { id: 'members', label: 'الأعضاء' },
  { id: 'progress', label: 'الإنجاز' },
  { id: 'sessions', label: 'الجلسات' },
  { id: 'attendance', label: 'الحضور' },
]

/** سياق للطباعة الموحّدة داخل أقسام التقرير */
const ReportPrintContext = createContext(null)
const ReportTabContext = createContext({ activeTab: 'all' })

/** يتوافق مع حالات تسجيل الإنجاز في صفحة الاختبارات */
const EXAM_SELF_REPORT_LABELS_AR = {
  registered: 'سجّل في المجموعة',
  preparing: 'أجهّز للاختبار',
  completed: 'أتمّ الاختبار',
}

function formatExamSelfReportSummary(r) {
  const st = String(r.examSelfReportStatus || '').trim()
  const line = EXAM_SELF_REPORT_LABELS_AR[st] || (st || '')
  const notes = String(r.examSelfReportNotes || '').trim()
  if (!line && !notes) return '—'
  return [line, notes].filter(Boolean).join(' — ')
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

function mapMembershipDisplayRow(r, { withJoined = false } = {}) {
  const row = {
    name: r.name || '—',
    role: roleLabelAr(r.role),
    visibilityLabel: reportVisibilityLabel(r.visibility),
  }
  if (withJoined) row.joinedAt = formatArDateTime(r.joinedAt)
  return row
}

function printSingleTable(title, columns, rows, printContext) {
  printSingleTableDoc({ title, columns, rows, printContext })
}

function tabVisible(activeTab, tabId) {
  return activeTab === 'all' || activeTab === tabId
}

function downloadSingleTableCsv(title, columns, rows) {
  if (!Array.isArray(rows) || !rows.length) return
  const headerColumns = (columns || []).filter((c) => c?.key)
  if (!headerColumns.length) return
  const csvRows = rows.map((row) => {
    const out = {}
    for (const col of headerColumns) out[col.label || col.key] = row?.[col.key] ?? ''
    return out
  })
  const stamp = new Date().toISOString().slice(0, 10)
  const safeTitle = String(title || 'table')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  downloadCsvFile(csvRows, `report-table-${safeTitle || 'table'}-${stamp}.csv`)
}

function ReportKpiGrid({ children, heading = 'المؤشرات الرئيسية' }) {
  const { activeTab } = useContext(ReportTabContext)
  if (!tabVisible(activeTab, 'all')) return null
  return (
    <div className="rh-reports__kpis-block">
      <h2 className="rh-reports__block-heading">{heading}</h2>
      <div className="rh-reports__kpis">{children}</div>
    </div>
  )
}

function SectionTable({ title, columns, rows, actions, printContext: printContextProp, tabId = 'all' }) {
  const ctxPrint = useContext(ReportPrintContext)
  const printContext = printContextProp ?? ctxPrint
  const { activeTab } = useContext(ReportTabContext)
  if (!rows?.length) return null
  if (!tabVisible(activeTab, tabId)) return null
  return (
    <div className="rh-settings-card rh-reports__section">
      <div className="rh-settings-card__head">
        <h3 className="rh-settings-card__title">
          {title}
          <span className="rh-reports__section-count">{rows.length} سجل</span>
        </h3>
        <div className="no-print rh-reports__section-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={() => downloadSingleTableCsv(title, columns, rows)}
          >
            CSV الجدول
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Printer}
            onClick={() => printSingleTable(title, columns, rows, printContext)}
          >
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

export default function ReportViewPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { str, branding } = useSiteContent()
  const toast = useToast()
  const navigate = useNavigate()
  const { search } = useLocation()
  const hidePlanNavigation = useHidePlanNavigation()
  const didHydrateFromQueryRef = useRef(false)
  const prevKindRef = useRef(null)
  const autoBuiltFromQueryRef = useRef(false)

  const [kind, setKind] = useState('student')
  const [entityId, setEntityId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rangePreset, setRangePreset] = useState('all')
  const [entities, setEntities] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const reportCaptureRef = useRef(null)

  const canPrint = can(PAGE_ID, 'reports_print')
  const canExportCsv = can(PAGE_ID, 'reports_export_csv')
  const showEntityOwner = canViewCreator(can, PAGE_ID)
  const canRunForKind = useCallback(
    (k) => Boolean(can(PAGE_ID, REPORT_KIND_PERMISSION[k])),
    [can],
  )

  useEffect(() => {
    if (didHydrateFromQueryRef.current) return
    const params = new URLSearchParams(search)
    const kindParam = String(params.get('reportKind') || '').trim()
    const entityParam = String(params.get('reportEntity') || '').trim()
    const fromParam = String(params.get('from') || '').trim()
    const toParam = String(params.get('to') || '').trim()
    const presetParam = String(params.get('rangePreset') || '').trim()
    if (kindParam && REPORT_KIND_OPTIONS.some((k) => k.value === kindParam)) setKind(kindParam)
    if (entityParam) setEntityId(entityParam)
    if (fromParam) {
      const y = Number(fromParam.slice(0, 4))
      setFromDate(y >= 1900 && y <= 2199 ? gregorianYmdStringToHijriYmd(fromParam) : fromParam)
    }
    if (toParam) {
      const y = Number(toParam.slice(0, 4))
      setToDate(y >= 1900 && y <= 2199 ? gregorianYmdStringToHijriYmd(toParam) : toParam)
    }
    if (presetParam) setRangePreset(presetParam)
    didHydrateFromQueryRef.current = true
  }, [search])

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
    if (prevKindRef.current !== null && prevKindRef.current !== kind) {
      setEntityId('')
    }
    prevKindRef.current = kind
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
    () => ({
      from: fromDate ? hijriYmdLocalDayStartIso(fromDate) : '',
      to: toDate ? hijriYmdLocalDayEndIso(toDate) : '',
    }),
    [fromDate, toDate],
  )
  const isRangeInvalid = useMemo(() => {
    if (!fromDate || !toDate) return false
    const a = parseHijriYmdString(fromDate)
    const b = parseHijriYmdString(toDate)
    if (!a || !b) return false
    return a.compare(b) > 0
  }, [fromDate, toDate])

  useEffect(() => {
    if (!didHydrateFromQueryRef.current) return
    const params = new URLSearchParams(search)
    if (kind) params.set('reportKind', kind)
    else params.delete('reportKind')
    if (entityId) params.set('reportEntity', entityId)
    else params.delete('reportEntity')
    if (fromDate) params.set('from', fromDate)
    else params.delete('from')
    if (toDate) params.set('to', toDate)
    else params.delete('to')
    if (rangePreset && rangePreset !== 'custom') params.set('rangePreset', rangePreset)
    else params.delete('rangePreset')
    const nextSearch = params.toString()
    const currentSearch = String(search || '').replace(/^\?/, '')
    if (nextSearch === currentSearch) return
    navigate({ pathname: '/app/reports/view', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true })
  }, [kind, entityId, fromDate, toDate, rangePreset, search, navigate])

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, getImpersonateUid(user, search)),
    [user, search],
  )
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

  const build = async () => {
    if (!entityId || !canRunForKind(kind)) return
    if (isRangeInvalid) {
      toast.warning(str('reports.toast_invalid_range'))
      return
    }
    setLoadingReport(true)
    try {
      const result =
        kind === 'student'
          ? await buildStudentReport(entities.find((u) => (u.uid || u.id) === entityId), range)
          : kind === 'teacher'
            ? await buildTeacherReport(entities.find((u) => (u.uid || u.id) === entityId), range)
            : await buildGroupReport(kind, entityId, range)
      setReportData(result)
      setActiveTab('all')
    } catch {
      toast.warning(str('reports.toast_failed'))
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    if (!didHydrateFromQueryRef.current || autoBuiltFromQueryRef.current) return
    if (loadingEntities || loadingReport) return
    const params = new URLSearchParams(search)
    const kindParam = String(params.get('reportKind') || '').trim()
    const entityParam = String(params.get('reportEntity') || '').trim()
    if (!entityParam || kindParam !== kind) return
    if (!canRunForKind(kind) || isRangeInvalid) return
    if (!entityOptions.some((o) => o.value === entityParam)) return
    if (entityId !== entityParam) {
      setEntityId(entityParam)
      return
    }
    autoBuiltFromQueryRef.current = true
    build()
  }, [
    entityId,
    kind,
    loadingEntities,
    loadingReport,
    entityOptions,
    search,
    canRunForKind,
    isRangeInvalid,
  ])

  const onPrint = () => {
    if (!canPrint || !reportData) return
    const sections = collectPrintSectionsFromReport(reportData, {
      formatArDateTime,
      roleLabelAr,
      formatExamSelfReportSummary,
      showEntityOwner,
    })
    const kpis = collectPrintKpisFromReport(reportData, {
      plans: str('layout.nav_plans'),
      halakat: str('layout.nav_halakat'),
      activities: str('layout.nav_activities'),
      exams: str('layout.nav_exams'),
      awrad: str('layout.nav_awrad'),
      pages: str('reports.kpi_pages'),
      members: str('reports.kpi_members'),
      sessions: str('reports.kpi_sessions'),
      attendance: str('reports.kpi_attendance'),
      dawrat: str('layout.nav_dawrat'),
      remoteTasmee: str('layout.nav_remote_tasmee'),
      notifications: 'الإشعارات',
    })
    const ok = printMultiSectionReport({
      documentTitle: str('reports.print_title'),
      sections,
      kpis,
      printContext: sectionPrintContext,
      executiveSummary,
    })
    if (!ok) toast.warning('تعذّر فتح نافذة الطباعة. تحقّق من حظر النوافذ المنبثقة.', '')
  }

  const onExportCsv = () => {
    if (!canExportCsv || !reportData) return
    const rows = []
    if (reportData.kind === 'student') {
      const addRows = (section, sectionRows) => {
        for (const row of sectionRows || []) rows.push({ القسم: section, ...row })
      }
      addRows(
        'الخطط',
        (reportData.studentRows?.plans || []).map((r) => mapMembershipDisplayRow(r, { withJoined: true })),
      )
      addRows(
        'الحلقات',
        (reportData.studentRows?.halakat || []).map((r) => mapMembershipDisplayRow(r, { withJoined: true })),
      )
      addRows(
        'الأنشطة',
        (reportData.studentRows?.activities || []).map((r) => ({
          name: r.name || '',
          role: roleLabelAr(r.role),
          startAt: formatArDateTime(r.startAt),
          endAt: formatArDateTime(r.endAt),
          memberContributionText: (r.memberContributionText || '').trim() || '—',
        })),
      )
      addRows(
        'الاختبارات',
        (reportData.studentRows?.exams || []).map((r) => ({
          name: r.name || '',
          role: roleLabelAr(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          examSelfReportSummary: formatExamSelfReportSummary(r),
        })),
      )
      addRows(
        'الدورات',
        (reportData.studentRows?.dawrat || []).map((r) => ({
          name: r.name || '',
          role: roleLabelAr(r.role),
          courseStart: formatArDateTime(r.courseStart),
          courseEnd: formatArDateTime(r.courseEnd),
          memberContributionText: (r.memberContributionText || '').trim() || '—',
        })),
      )
      addRows(
        'التسميع عن بعد',
        (reportData.studentRows?.remoteTasmee || []).map((r) => ({
          name: r.name || '',
          role: roleLabelAr(r.role),
          providerLabel: reportProviderLabel(r.provider),
          mediaTypeLabel: reportMediaTypeLabel(r.mediaType),
        })),
      )
      addRows(
        'الأوراد',
        (reportData.awrad || []).map((r) => ({
          planName: r.planName || '—',
          recordedAt: formatArDateTime(r.recordedAt),
          pagesCount: r.pagesCount ?? '',
          fromPage: r.fromPage ?? '',
          toPage: r.toPage ?? '',
        })),
      )
      addRows(
        'الإشعارات',
        (reportData.notifications || []).map((r) => ({
          title: r.title || '',
          notificationTypeLabel: reportNotificationTypeLabel(r.notificationType),
          createdAt: formatArDateTime(r.createdAt),
          isRead: r.isRead ? 'نعم' : 'لا',
        })),
      )
    } else if (reportData.kind === 'teacher') {
      const addRows = (section, sectionRows) => {
        for (const row of sectionRows || []) rows.push({ القسم: section, ...row })
      }
      addRows('الخطط', (reportData.teacherRows?.plans || []).map((r) => mapMembershipDisplayRow(r)))
      addRows('الحلقات', (reportData.teacherRows?.halakat || []).map((r) => mapMembershipDisplayRow(r)))
      addRows('الأنشطة', (reportData.teacherRows?.activities || []).map((r) => mapMembershipDisplayRow(r)))
      addRows('الاختبارات', (reportData.teacherRows?.exams || []).map((r) => mapMembershipDisplayRow(r)))
      addRows('الدورات', (reportData.teacherRows?.dawrat || []).map((r) => mapMembershipDisplayRow(r)))
      addRows('التسميع عن بعد', (reportData.teacherRows?.remoteTasmee || []).map((r) => mapMembershipDisplayRow(r)))
      addRows(
        'جلسات المعلم',
        (reportData.sessions || []).map((s) => ({
          title: s.title || '',
          startedAt: formatArDateTime(s.startedAt),
          endedAt: formatArDateTime(s.endedAt),
          status: reportSessionStatusLabel(s.status),
        })),
      )
      addRows(
        'تسجيلات الحضور',
        (reportData.attendanceRecorded || []).map((a) => ({
          userName: reportPersonLabel(a.userName, a.userId),
          attendanceStatusLabel: reportAttendanceStatusLabel(a.attendanceStatus),
          pagesCount: a.pagesCount ?? '',
          updatedAt: formatArDateTime(a.updatedAt),
        })),
      )
      addRows(
        'ملخص التسجيلات حسب الطالب',
        (reportData.attendanceByStudent || []).map((a) => ({
          userName: reportPersonLabel(a.userName, a.userId),
          recordsCount: a.recordsCount ?? '',
          pagesTotal: a.pagesTotal ?? '',
          latestUpdatedAt: formatArDateTime(a.latestUpdatedAt),
        })),
      )
    } else {
      if (reportData.entityDetails) {
        rows.push({
          القسم: 'تفاصيل الكيان',
          ...formatEntityDetailsForReport(reportData.entityDetails, reportData.kind, {
            ownerName: showEntityOwner ? reportData.entityDetails?.ownerName || '—' : '',
            formatDate: formatArDateTime,
          }),
        })
      }
      for (const m of reportData.members || []) {
        const baseMemberRow = {
          القسم: 'الأعضاء',
          الاسم: reportPersonLabel(m.displayName, m.userId),
          البريد: m.email || '',
          الدور: roleLabelAr(m.role),
        }
        if (kind === 'exam') {
          rows.push({
            ...baseMemberRow,
            الإنجاز_المُبلَغ: formatExamSelfReportSummary(m),
          })
        } else if (kind === 'activity' || kind === 'dawra') {
          rows.push({
            ...baseMemberRow,
            المساهمة: (m.memberContributionText || '').trim(),
          })
        } else {
          rows.push(baseMemberRow)
        }
      }
      if (reportData.kind === 'halaka') {
        for (const s of reportData.sessions || []) {
          rows.push({
            القسم: 'جلسات الحلقة',
            العنوان: s.title || '',
            startedAt: formatArDateTime(s.startedAt),
            endedAt: formatArDateTime(s.endedAt),
            status: reportSessionStatusLabel(s.status),
          })
        }
        for (const a of reportData.attendanceRows || []) {
          rows.push({
            القسم: 'حضور الحلقة',
            الجلسة: a.sessionTitle || 'جلسة',
            العضو: reportPersonLabel(
              a.userName || halakaMemberNameMap.get(String(a.userId || '').trim()),
              a.userId,
            ),
            الحضور: reportAttendanceStatusLabel(a.attendanceStatus),
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

  const onCopyReportLink = async () => {
    if (typeof window === 'undefined' || !window?.location?.href) return
    const url = window.location.href
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const area = document.createElement('textarea')
        area.value = url
        area.setAttribute('readonly', 'true')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.focus()
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      }
      toast.success(str('reports.toast_link_copied'))
    } catch {
      toast.warning(str('reports.toast_link_copy_failed'))
    }
  }

  const canBuild = Boolean(entityId && canRunForKind(kind) && !isRangeInvalid)
  const clearFilters = useCallback(() => {
    setFromDate('')
    setToDate('')
    setRangePreset('all')
  }, [])
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

  const selectedEntityName = entityMap.get(entityId) || ''

  const sectionPrintContext = useMemo(
    () => ({
      siteTitle: branding.siteTitle,
      reportTypeLabel: REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || '',
      entityName: selectedEntityName,
      fromYmd: fromDate,
      toYmd: toDate,
      issuedAt: new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }),
    }),
    [branding.siteTitle, kind, selectedEntityName, fromDate, toDate],
  )

  const executiveSummary = useMemo(() => {
    if (!reportData) return null
    return buildReportExecutiveSummary(reportData, {
      entityName: selectedEntityName,
      reportTypeLabel: REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || '',
      fromYmd: fromDate,
      toYmd: toDate,
    })
  }, [reportData, selectedEntityName, kind, fromDate, toDate])

  const reportMetaItems = useMemo(() => {
    const issuedAt = new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
    return [
      { label: 'نوع التقرير', value: REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || '—' },
      { label: 'الكيان', value: selectedEntityName || '—' },
      {
        label: 'الفترة (أم القرى)',
        value: fromDate || toDate ? `${fromDate || '—'} ← ${toDate || '—'}` : 'كامل الفترة',
      },
      { label: 'تاريخ الإصدار', value: issuedAt },
    ]
  }, [kind, selectedEntityName, fromDate, toDate])

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
      if (k === 'plan') {
        if (hidePlanNavigation) return ''
        return appLink(`/app/plans?focus=${id}`)
      }
      if (k === 'halaka') return appLink(`/app/halakat?focus=${id}`)
      if (k === 'activity') return appLink(`/app/activities?focus=${id}`)
      if (k === 'exam') return appLink(`/app/exams?focus=${id}`)
      if (k === 'dawra') return appLink(`/app/dawrat?focus=${id}`)
      if (k === 'remote_tasmee') return appLink(`/app/remote-tasmee?focus=${id}`)
      return ''
    },
    [appLink, hidePlanNavigation],
  )

  const reportTabs = useMemo(() => {
    if (!reportData) return []
    if (reportData.kind === 'student') return STUDENT_TABS
    if (reportData.kind === 'teacher') return TEACHER_TABS
    return GROUP_TABS.filter((t) => {
      if (t.id === 'sessions' || t.id === 'attendance') return reportData.kind === 'halaka'
      if (t.id === 'progress') {
        return (
          reportData.kind === 'plan' ||
          reportData.kind === 'halaka' ||
          (['activity', 'exam', 'dawra', 'remote_tasmee'].includes(reportData.kind) &&
            reportData.memberDetails?.length)
        )
      }
      return true
    })
  }, [reportData])

  const onSharePdf = async () => {
    if (!canPrint || !reportData || !reportCaptureRef.current) return
    try {
      toast.info(str('reports.toast_pdf_generating'))
      reportCaptureRef.current.classList.add('rh-print-capture--export')
      const blob = await elementToPdfBlob(reportCaptureRef.current)
      await shareOrDownloadPdf(blob, `report-${kind}-${entityId}.pdf`)
      toast.success(str('reports.toast_pdf_done'))
    } catch {
      toast.warning(str('reports.toast_pdf_failed'))
    } finally {
      reportCaptureRef.current?.classList.remove('rh-print-capture--export')
    }
  }

  if (!canAccessPage(PAGE_ID)) {
    return <p className="rh-plans__empty">{str('reports.no_access')}</p>
  }

  return (
    <div className="rh-plans rh-reports">
      <header className="rh-plans__hero no-print">
        <HapticLink to={appLink('/app/reports')} className="rh-student-progress__back">
          <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> مركز التقارير
        </HapticLink>
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">
              {REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || str('reports.hero_title')}
              {selectedEntityName ? `: ${selectedEntityName}` : ''}
            </h1>
            <p className="rh-plans__desc">تقرير شامل بكل الأقسام — استخدم التبويبات للتصفية أو اطبع التقرير كاملاً.</p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <div className="rh-plans__hero-actions">
            <Button type="button" variant="secondary" icon={Link2} onClick={onCopyReportLink}>
              {str('reports.btn_copy_link')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Share2}
              onClick={onSharePdf}
              disabled={!canPrint || !reportData}
            >
              {str('reports.btn_share_pdf')}
            </Button>
            <Button type="button" variant="secondary" icon={Printer} onClick={onPrint} disabled={!canPrint || !reportData}>
              {str('reports.btn_print')}
            </Button>
            <Button type="button" variant="secondary" icon={RefreshCw} onClick={build} disabled={!canBuild} loading={loadingReport}>
              تحديث
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={onExportCsv}
              disabled={!canExportCsv || !reportData}
            >
              {str('reports.btn_csv')}
            </Button>
          </div>
        </div>
      </header>

      <section className="rh-settings-card rh-reports__filters no-print">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">{str('reports.filters_title')}</h2>
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
        {isRangeInvalid && <p className="rh-reports__range-error">{str('reports.range_invalid_hint')}</p>}
        <div className="rh-reports__filters-actions">
          {kind === 'student' && entityId ? (
            <HapticLink to={appLink(studentProgressLink(entityId))} className="ui-btn ui-btn--secondary ui-btn--sm">
              <RhIcon as={Eye} size={16} strokeWidth={RH_ICON_STROKE} />
              تقرير الإنجاز السريع
            </HapticLink>
          ) : null}
          {entityId ? (
            <ReportQuickLink kind={kind} entityId={entityId} label="فتح في مركز التقارير" />
          ) : null}
          <Button type="button" variant="ghost" icon={FilterX} onClick={clearFilters}>
            {str('reports.btn_clear_filters')}
          </Button>
          <Button type="button" variant="primary" icon={FileText} disabled={!canBuild} loading={loadingReport} onClick={build}>
            {str('reports.btn_build')}
          </Button>
        </div>
      </section>

      {!reportData ? (
        <p className="rh-plans__empty">{str('reports.empty')}</p>
      ) : (
        <ReportTabContext.Provider value={{ activeTab }}>
          {reportTabs.length > 1 ? (
            <nav className="rh-reports-view__tabs card no-print" aria-label="أقسام التقرير">
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={[
                    'rh-reports-view__tab',
                    activeTab === tab.id ? 'rh-reports-view__tab--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : null}
        <ReportPrintContext.Provider value={sectionPrintContext}>
          <div ref={reportCaptureRef} className="rh-print-capture rh-reports__print-capture">
            <PrintDocumentChrome
              brandTitle={branding.siteTitle}
              logoSrc={branding.logoSrc}
              title={str('reports.print_title')}
              metaItems={reportMetaItems}
              footer={str('reports.print_footer', {
                siteTitle: branding.siteTitle,
                date: new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }),
              })}
              headerClassName="rh-reports__capture-doc-head"
              footerClassName="rh-reports__capture-doc-foot"
            >
            {executiveSummary ? <ReportExecutiveSummary summary={executiveSummary} /> : null}
            {reportData.kind === 'student' ? (
        <section className="rh-reports__result">
          <ReportKpiGrid>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.plans}</strong><span>{str('layout.nav_plans')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.halakat}</strong><span>{str('layout.nav_halakat')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.activities}</strong><span>{str('layout.nav_activities')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.exams}</strong><span>{str('layout.nav_exams')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.dawrat}</strong><span>{str('layout.nav_dawrat')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.remoteTasmee}</strong><span>{str('layout.nav_remote_tasmee')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.awrad}</strong><span>{str('layout.nav_awrad')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.totalPages}</strong><span>{str('reports.kpi_pages')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.notifications}</strong><span>الإشعارات</span></div>
          </ReportKpiGrid>
          <SectionTable
            title="الخطط"
            tabId="plans"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibilityLabel', label: 'الظهور' },
              { key: 'joinedAt', label: 'تاريخ الانضمام' },
            ]}
            rows={(reportData.studentRows?.plans || []).map((r) => mapMembershipDisplayRow(r, { withJoined: true }))}
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
            tabId="halakat"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibilityLabel', label: 'الظهور' },
              { key: 'joinedAt', label: 'تاريخ الانضمام' },
            ]}
            rows={(reportData.studentRows?.halakat || []).map((r) => mapMembershipDisplayRow(r, { withJoined: true }))}
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
            tabId="activities"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'startAt', label: 'البداية' },
              { key: 'endAt', label: 'النهاية' },
              { key: 'memberContributionText', label: 'مساهمة الطالب' },
            ]}
            rows={(reportData.studentRows?.activities || []).map((r) => ({
              ...r,
              role: roleLabelAr(r.role),
              startAt: formatArDateTime(r.startAt),
              endAt: formatArDateTime(r.endAt),
              memberContributionText: (r.memberContributionText || '').trim() || '—',
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
            tabId="exams"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibilityLabel', label: 'الظهور' },
              { key: 'examSelfReportSummary', label: 'الإنجاز المُبلَغ' },
            ]}
            rows={(reportData.studentRows?.exams || []).map((r) => ({
              name: r.name || '—',
              role: roleLabelAr(r.role),
              visibilityLabel: reportVisibilityLabel(r.visibility),
              examSelfReportSummary: formatExamSelfReportSummary(r),
            }))}
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
            tabId="dawrat"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'courseStart', label: 'بداية الدورة' },
              { key: 'courseEnd', label: 'نهاية الدورة' },
              { key: 'memberContributionText', label: 'مساهمة العضو' },
            ]}
            rows={(reportData.studentRows?.dawrat || []).map((r) => ({
              ...r,
              role: roleLabelAr(r.role),
              courseStart: formatArDateTime(r.courseStart),
              courseEnd: formatArDateTime(r.courseEnd),
              memberContributionText: (r.memberContributionText || '').trim() || '—',
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
            tabId="remote"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'providerLabel', label: 'المزوّد' },
              { key: 'mediaTypeLabel', label: 'النوع' },
            ]}
            rows={(reportData.studentRows?.remoteTasmee || []).map((r) => ({
              name: r.name || '—',
              role: roleLabelAr(r.role),
              providerLabel: reportProviderLabel(r.provider),
              mediaTypeLabel: reportMediaTypeLabel(r.mediaType),
            }))}
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
            tabId="awrad"
            columns={[
              { key: 'planName', label: 'الخطة' },
              { key: 'recordedAt', label: 'تاريخ الورد' },
              { key: 'pagesCount', label: 'عدد الصفحات' },
              { key: 'fromPage', label: 'من صفحة' },
              { key: 'toPage', label: 'إلى صفحة' },
            ]}
            rows={(reportData.awrad || []).map((r) => ({
              planName: r.planName || '—',
              recordedAt: formatArDateTime(r.recordedAt),
              pagesCount: r.pagesCount ?? 0,
              fromPage: r.fromPage ?? '—',
              toPage: r.toPage ?? '—',
            }))}
          />
          <SectionTable
            title="الإشعارات"
            tabId="notifications"
            columns={[
              { key: 'title', label: 'العنوان' },
              { key: 'notificationTypeLabel', label: 'النوع' },
              { key: 'createdAt', label: 'التاريخ' },
              { key: 'isRead', label: 'مقروء' },
            ]}
            rows={(reportData.notifications || []).map((r) => ({
              title: r.title || '—',
              notificationTypeLabel: reportNotificationTypeLabel(r.notificationType),
              createdAt: formatArDateTime(r.createdAt),
              isRead: r.isRead ? 'نعم' : 'لا',
            }))}
          />
        </section>
      ) : reportData.kind === 'teacher' ? (
        <section className="rh-reports__result">
          <ReportKpiGrid>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.halakat}</strong><span>{str('layout.nav_halakat')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.plans}</strong><span>{str('layout.nav_plans')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.exams}</strong><span>{str('layout.nav_exams')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.activities}</strong><span>{str('layout.nav_activities')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.dawrat}</strong><span>{str('layout.nav_dawrat')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.remoteTasmee}</strong><span>{str('layout.nav_remote_tasmee')}</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.sessions}</strong><span>جلسات مسجلة</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.attendanceRecorded}</strong><span>تسجيلات حضور</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.studentsRecorded}</strong><span>طلاب تم تسجيلهم</span></div>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.pagesRecorded}</strong><span>{str('reports.kpi_pages')}</span></div>
          </ReportKpiGrid>
          <SectionTable
            title="حلقات المعلم"
            tabId="halakat"
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibilityLabel', label: 'الظهور' },
            ]}
            rows={(reportData.teacherRows?.halakat || []).map((r) => mapMembershipDisplayRow(r))}
            actions={(row) => {
              const to = viewLinkByKind('halaka', row.id)
              if (!to) return null
              return <a href={to} className="ui-btn ui-btn--ghost ui-btn--sm"><RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} /></a>
            }}
          />
          <SectionTable
            title="باقي ارتباطات المعلم"
            tabId="memberships"
            columns={[
              { key: 'section', label: 'القسم' },
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'visibilityLabel', label: 'الظهور' },
              { key: 'learnerContribution', label: 'مساهمة / إنجاز مُبلَغ' },
            ]}
            rows={[
              ...(reportData.teacherRows?.plans || []).map((r) => ({
                section: 'الخطط',
                name: r.name || '—',
                role: roleLabelAr(r.role),
                visibilityLabel: reportVisibilityLabel(r.visibility),
                learnerContribution: '—',
              })),
              ...(reportData.teacherRows?.activities || []).map((r) => ({
                section: 'الأنشطة',
                name: r.name || '—',
                role: roleLabelAr(r.role),
                visibilityLabel: reportVisibilityLabel(r.visibility),
                learnerContribution: (r.memberContributionText || '').trim() || '—',
              })),
              ...(reportData.teacherRows?.exams || []).map((r) => ({
                section: 'الاختبارات',
                name: r.name || '—',
                role: roleLabelAr(r.role),
                visibilityLabel: reportVisibilityLabel(r.visibility),
                learnerContribution: formatExamSelfReportSummary(r),
              })),
              ...(reportData.teacherRows?.dawrat || []).map((r) => ({
                section: 'الدورات',
                name: r.name || '—',
                role: roleLabelAr(r.role),
                visibilityLabel: reportVisibilityLabel(r.visibility),
                learnerContribution: (r.memberContributionText || '').trim() || '—',
              })),
              ...(reportData.teacherRows?.remoteTasmee || []).map((r) => ({
                section: 'التسميع عن بعد',
                name: r.name || '—',
                role: roleLabelAr(r.role),
                visibilityLabel: reportVisibilityLabel(r.visibility),
                learnerContribution: '—',
              })),
            ]}
          />
          <SectionTable
            title="جلسات سجّلها المعلم"
            tabId="sessions"
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
              status: reportSessionStatusLabel(s.status),
            }))}
          />
          <SectionTable
            title="سجلات الحضور التي أدخلها المعلم"
            tabId="attendance"
            columns={[
              { key: 'userName', label: 'الطالب' },
              { key: 'attendanceStatusLabel', label: 'الحضور' },
              { key: 'pagesCount', label: 'الصفحات' },
              { key: 'updatedAt', label: 'آخر تحديث' },
            ]}
            rows={(reportData.attendanceRecorded || []).map((a) => ({
              userName: reportPersonLabel(a.userName, a.userId),
              attendanceStatusLabel: reportAttendanceStatusLabel(a.attendanceStatus),
              pagesCount: a.pagesCount ?? 0,
              updatedAt: formatArDateTime(a.updatedAt),
            }))}
          />
          <SectionTable
            title="ملخص تسجيلات المعلم حسب كل طالب"
            tabId="attendance"
            columns={[
              { key: 'userName', label: 'الطالب' },
              { key: 'recordsCount', label: 'عدد التسجيلات' },
              { key: 'pagesTotal', label: 'إجمالي الصفحات' },
              { key: 'latestUpdatedAt', label: 'آخر تحديث' },
            ]}
            rows={(reportData.attendanceByStudent || []).map((r) => ({
              userName: reportPersonLabel(r.userName, r.userId),
              recordsCount: r.recordsCount ?? 0,
              pagesTotal: r.pagesTotal ?? 0,
              latestUpdatedAt: formatArDateTime(r.latestUpdatedAt),
            }))}
          />
        </section>
      ) : (
        <section className="rh-reports__result">
          <ReportKpiGrid>
            <div className="card rh-reports__kpi"><strong>{reportData.summary.members}</strong><span>{str('reports.kpi_members')}</span></div>
            {reportData.kind === 'halaka' && (
              <>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.sessions}</strong><span>{str('reports.kpi_sessions')}</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.attendance}</strong><span>{str('reports.kpi_attendance')}</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.pagesTotal}</strong><span>{str('reports.kpi_pages')}</span></div>
              </>
            )}
            {reportData.kind === 'plan' && (
              <>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.avgProgress ?? 0}%</strong><span>متوسط إنجاز الأعضاء</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.pagesTotal ?? 0}</strong><span>{str('reports.kpi_pages')}</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.awradRecords ?? 0}</strong><span>سجلات الأوراد</span></div>
              </>
            )}
            {(reportData.kind === 'activity' || reportData.kind === 'dawra') && (
              <>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.withContribution ?? 0}</strong><span>سجّلوا إنجازاً</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.withoutContribution ?? 0}</strong><span>لم يسجّلوا بعد</span></div>
              </>
            )}
            {reportData.kind === 'exam' && (
              <>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.examsCompleted ?? 0}</strong><span>أتمّوا الاختبار</span></div>
                <div className="card rh-reports__kpi"><strong>{reportData.summary.examsPending ?? 0}</strong><span>لم يُتمّ بعد</span></div>
              </>
            )}
          </ReportKpiGrid>
          <SectionTable
            title="تفاصيل الكيان"
            tabId="details"
            columns={entityDetailsColumnsForKind(reportData.kind, showEntityOwner)}
            rows={[
              formatEntityDetailsForReport(reportData.entityDetails, reportData.kind, {
                ownerName: showEntityOwner ? reportData.entityDetails?.ownerName || '—' : '',
                formatDate: formatArDateTime,
              }),
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
          <SectionTable
            title={str('reports.members_title')}
            tabId="members"
            columns={[
              { key: 'displayName', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'email', label: 'البريد' },
              ...(reportData.kind === 'activity' || reportData.kind === 'exam' || reportData.kind === 'dawra'
                ? [
                    {
                      key: 'learnerNote',
                      label:
                        reportData.kind === 'exam'
                          ? 'الإنجاز المُبلَغ'
                          : reportData.kind === 'activity'
                            ? 'مساهمة الطالب'
                            : 'مساهمة العضو',
                    },
                  ]
                : []),
            ]}
            rows={(reportData.members || []).map((m) => ({
              displayName: reportPersonLabel(m.displayName, m.userId),
              role: roleLabelAr(m.role),
              email: m.email || '',
              learnerNote:
                reportData.kind === 'exam'
                  ? formatExamSelfReportSummary(m)
                  : (m.memberContributionText || '').trim() || '—',
            }))}
          />
          {reportData.kind === 'plan' && (
            <SectionTable
              title="إنجاز الأعضاء في الخطة"
              tabId="progress"
              columns={[
                { key: 'displayName', label: 'الاسم' },
                { key: 'role', label: 'الدور' },
                { key: 'progressPercent', label: 'نسبة الإنجاز %' },
                { key: 'achievedPages', label: 'أنجز (ص)' },
                { key: 'remainingPages', label: 'بقي (ص)' },
                { key: 'targetPages', label: 'الهدف (ص)' },
                { key: 'awradCount', label: 'عدد الأوراد' },
                { key: 'pagesInAwrad', label: 'صفحات الأوراد' },
                { key: 'latestAwradAt', label: 'آخر ورد' },
              ]}
              rows={(reportData.memberDetails || []).map((r) => ({
                ...r,
                displayName: reportPersonLabel(r.displayName, r.userId),
                role: roleLabelAr(r.role),
                latestAwradAt: formatArDateTime(r.latestAwradAt),
              }))}
            />
          )}
          {reportData.kind === 'activity' && (
            <SectionTable
              title="إنجاز الأعضاء في النشاط"
              tabId="progress"
              columns={[
                { key: 'displayName', label: 'الاسم' },
                { key: 'role', label: 'الدور' },
                { key: 'hasContributionLabel', label: 'سجّل إنجازاً؟' },
                { key: 'contribution', label: 'المساهمة' },
                { key: 'contributionUpdatedAt', label: 'آخر تحديث' },
              ]}
              rows={(reportData.memberDetails || []).map((r) => ({
                ...r,
                displayName: reportPersonLabel(r.displayName, r.userId),
                role: roleLabelAr(r.role),
                hasContributionLabel: r.hasContribution ? 'نعم' : 'لا',
                contributionUpdatedAt: formatArDateTime(r.contributionUpdatedAt),
              }))}
            />
          )}
          {reportData.kind === 'exam' && (
            <SectionTable
              title="إنجاز الأعضاء في الاختبار"
              tabId="progress"
              columns={[
                { key: 'displayName', label: 'الاسم' },
                { key: 'role', label: 'الدور' },
                { key: 'examStatusLabel', label: 'الحالة' },
                { key: 'examNotes', label: 'ملاحظات' },
                { key: 'examUpdatedAt', label: 'آخر تحديث' },
              ]}
              rows={(reportData.memberDetails || []).map((r) => ({
                ...r,
                displayName: reportPersonLabel(r.displayName, r.userId),
                role: roleLabelAr(r.role),
                examStatusLabel: formatExamSelfReportSummary(r),
                examNotes: (r.examSelfReportNotes || '').trim() || '—',
                examUpdatedAt: formatArDateTime(r.examSelfReportUpdatedAt),
              }))}
            />
          )}
          {reportData.kind === 'dawra' && (
            <SectionTable
              title="إنجاز الأعضاء في الدورة"
              tabId="progress"
              columns={[
                { key: 'displayName', label: 'الاسم' },
                { key: 'role', label: 'الدور' },
                { key: 'hasContributionLabel', label: 'سجّل إنجازاً؟' },
                { key: 'contribution', label: 'المساهمة' },
                { key: 'contributionUpdatedAt', label: 'آخر تحديث' },
              ]}
              rows={(reportData.memberDetails || []).map((r) => ({
                ...r,
                displayName: reportPersonLabel(r.displayName, r.userId),
                role: roleLabelAr(r.role),
                hasContributionLabel: r.hasContribution ? 'نعم' : 'لا',
                contributionUpdatedAt: formatArDateTime(r.contributionUpdatedAt),
              }))}
            />
          )}
          {reportData.kind === 'remote_tasmee' && (
            <SectionTable
              title="تفاصيل أعضاء البث"
              tabId="progress"
              columns={[
                { key: 'displayName', label: 'الاسم' },
                { key: 'role', label: 'الدور' },
                { key: 'email', label: 'البريد' },
                { key: 'joinedAt', label: 'تاريخ الانضمام' },
              ]}
              rows={(reportData.memberDetails || []).map((r) => ({
                ...r,
                displayName: reportPersonLabel(r.displayName, r.userId),
                role: roleLabelAr(r.role),
                joinedAt: formatArDateTime(r.joinedAt),
              }))}
            />
          )}
          {reportData.kind === 'halaka' && (
            <SectionTable
              title="تفاصيل أعضاء الحلقة (شامل)"
              tabId="progress"
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
                displayName: reportPersonLabel(r.displayName, r.userId),
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
                tabId="sessions"
                columns={[
                  { key: 'title', label: 'العنوان' },
                  { key: 'startedAt', label: 'البداية' },
                  { key: 'endedAt', label: 'النهاية' },
                  { key: 'status', label: 'الحالة' },
                ]}
                rows={(reportData.sessions || []).map((s) => ({
                  title: s.title || '—',
                  startedAt: formatArDateTime(s.startedAt),
                  endedAt: formatArDateTime(s.endedAt),
                  status: reportSessionStatusLabel(s.status),
                }))}
              />
              <SectionTable
                title="سجل الحضور والتسميع"
                tabId="attendance"
                columns={[
                  { key: 'sessionTitle', label: 'الجلسة' },
                  { key: 'userName', label: 'العضو' },
                  { key: 'attendanceStatusLabel', label: 'الحضور' },
                  { key: 'pagesCount', label: 'الصفحات' },
                  { key: 'fromPage', label: 'من' },
                  { key: 'toPage', label: 'إلى' },
                ]}
                rows={(reportData.attendanceRows || []).map((a) => ({
                  sessionTitle: a.sessionTitle || 'جلسة',
                  userName: reportPersonLabel(
                    a.userName || halakaMemberNameMap.get(String(a.userId || '').trim()),
                    a.userId,
                  ),
                  attendanceStatusLabel: reportAttendanceStatusLabel(a.attendanceStatus),
                  pagesCount: a.pagesCount ?? 0,
                  fromPage: a.fromPage ?? '—',
                  toPage: a.toPage ?? '—',
                }))}
              />
            </>
          )}
        </section>
      )}
            </PrintDocumentChrome>
          </div>
        </ReportPrintContext.Provider>
        </ReportTabContext.Provider>
      )}
    </div>
  )
}
