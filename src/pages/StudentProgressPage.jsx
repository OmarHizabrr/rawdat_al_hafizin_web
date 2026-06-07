import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Printer,
  RefreshCw,
  Target,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { reportViewPath } from '../config/reportKinds.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { printMultiSectionReport } from '../utils/reportPrintUtils.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useHidePlanNavigation } from '../hooks/useHidePlanNavigation.js'
import { buildStudentProgressReport } from '../services/studentProgressService.js'
import { EXAM_SELF_REPORT_ORDER, examSelfReportStatusLabel } from '../utils/examSelfReportLabels.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { HapticLink } from '../ui/HapticLink.jsx'
import { Button, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const REPORTS_PAGE = PERMISSION_PAGE_IDS.reports

function formatArDateTime(value) {
  const d = new Date(String(value || ''))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
}

function ProgressBar({ percent, label }) {
  const pct = Math.min(100, Math.max(0, Number(percent) || 0))
  return (
    <div className="rh-student-progress__bar-wrap">
      <div className="rh-student-progress__bar-head">
        <span className="rh-student-progress__bar-label">{label}</span>
        <strong className="rh-student-progress__bar-pct">{Math.round(pct)}%</strong>
      </div>
      <div
        className="rh-student-progress__bar"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="rh-student-progress__bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ExamStatusTrack({ statusStep }) {
  const current = statusStep >= 0 ? statusStep : -1
  return (
    <ol className="rh-student-progress__exam-track" aria-label="مسار الإنجاز">
      {EXAM_SELF_REPORT_ORDER.map((step, index) => {
        const done = current >= 0 && index <= current
        const active = current === index
        return (
          <li
            key={step}
            className={[
              'rh-student-progress__exam-step',
              done ? 'rh-student-progress__exam-step--done' : '',
              active ? 'rh-student-progress__exam-step--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="rh-student-progress__exam-step-dot" aria-hidden>
              {done ? (
                <RhIcon as={CheckCircle2} size={16} strokeWidth={RH_ICON_STROKE} />
              ) : (
                <RhIcon as={Circle} size={14} strokeWidth={RH_ICON_STROKE} />
              )}
            </span>
            <span className="rh-student-progress__exam-step-label">{examSelfReportStatusLabel(step)}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function StudentProgressPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { branding, str } = useSiteContent()
  const hidePlanNavigation = useHidePlanNavigation()
  const toast = useToast()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [reloadTick, setReloadTick] = useState(0)

  const impersonateUid = getImpersonateUid(user, location.search)
  const queryUid = String(searchParams.get('uid') || '').trim()
  const targetUid = impersonateUid || queryUid || user?.uid || ''
  const viewingOther = Boolean(targetUid && user?.uid && targetUid !== user.uid)
  const canViewOthers = isAdmin(user) || can(REPORTS_PAGE, 'student_report')
  const allowed = !viewingOther || canViewOthers

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, viewingOther ? targetUid : impersonateUid),
    [viewingOther, targetUid, impersonateUid],
  )

  useEffect(() => {
    const name = report?.student?.displayName || targetUid
    document.title = viewingOther
      ? `إنجاز ${name} — ${branding.siteTitle}`
      : `إنجازي — ${branding.siteTitle}`
  }, [report?.student?.displayName, targetUid, viewingOther, branding.siteTitle])

  useEffect(() => {
    if (!allowed || !targetUid) {
      setReport(null)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    buildStudentProgressReport(targetUid)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null)
          toast.warning('تعذّر تحميل تقرير الإنجاز.', 'تنبيه')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [allowed, targetUid, toast, reloadTick])

  const reloadReport = useCallback(() => {
    setReloadTick((tick) => tick + 1)
  }, [])

  const onPrint = useCallback(() => {
    if (!report) return
    const studentName = report.student?.displayName || targetUid
    const sections = [
      {
        title: 'ملخص الإنجاز',
        columns: [
          { key: 'metric', label: 'المؤشر' },
          { key: 'value', label: 'القيمة' },
        ],
        rows: [
          { metric: 'متوسط إنجاز الخطط', value: `${report.summary.plansAvgPercent}%` },
          {
            metric: 'صفحات أنجزها / الهدف',
            value: `${report.summary.plansPagesDone} / ${report.summary.plansPagesTarget}`,
          },
          {
            metric: 'أنشطة سجّل فيها إنجازاً',
            value: `${report.summary.activitiesWithContribution} / ${report.summary.activitiesCount}`,
          },
          {
            metric: 'اختبارات أتمّها',
            value: `${report.summary.examsCompleted} / ${report.summary.examsCount}`,
          },
        ],
      },
    ]
    if (report.plans.length) {
      sections.push({
        title: 'الخطط',
        columns: [
          { key: 'name', label: 'الاسم' },
          { key: 'progressPercent', label: 'الإنجاز %' },
          { key: 'achievedPages', label: 'أنجز (ص)' },
          { key: 'remainingPages', label: 'بقي (ص)' },
          { key: 'targetPages', label: 'الهدف (ص)' },
        ],
        rows: report.plans.map((p) => ({
          name: p.name,
          progressPercent: `${Math.round(p.progressPercent || 0)}%`,
          achievedPages: p.achievedPages,
          remainingPages: p.remainingPages,
          targetPages: p.targetPages,
        })),
      })
    }
    if (report.activities.length) {
      sections.push({
        title: 'الأنشطة',
        columns: [
          { key: 'name', label: 'الاسم' },
          { key: 'status', label: 'الحالة' },
          { key: 'contribution', label: 'المساهمة' },
        ],
        rows: report.activities.map((a) => ({
          name: a.name,
          status: a.hasContribution ? 'سجّل إنجازاً' : 'لم يُسجّل',
          contribution: a.contribution || '—',
        })),
      })
    }
    if (report.exams.length) {
      sections.push({
        title: 'الاختبارات',
        columns: [
          { key: 'name', label: 'الاسم' },
          { key: 'statusLabel', label: 'الحالة' },
          { key: 'notes', label: 'ملاحظات' },
        ],
        rows: report.exams.map((e) => ({
          name: e.name,
          statusLabel: e.statusLabel,
          notes: e.notes || '—',
        })),
      })
    }
    const kpis = [
      { label: 'متوسط إنجاز الخطط', value: `${report.summary.plansAvgPercent}%` },
      {
        label: 'صفحات أنجزها / الهدف',
        value: `${report.summary.plansPagesDone} / ${report.summary.plansPagesTarget}`,
      },
      {
        label: 'أنشطة سجّل فيها إنجازاً',
        value: `${report.summary.activitiesWithContribution} / ${report.summary.activitiesCount}`,
      },
      {
        label: 'اختبارات أتمّها',
        value: `${report.summary.examsCompleted} / ${report.summary.examsCount}`,
      },
    ]
    const ok = printMultiSectionReport({
      documentTitle: viewingOther ? `إنجاز ${studentName}` : 'تقرير إنجازي',
      sections,
      kpis,
      printContext: {
        siteTitle: branding.siteTitle,
        entityName: studentName,
        reportTypeLabel: viewingOther ? 'تقرير إنجاز الطالب' : 'تقرير إنجازي',
      },
    })
    if (!ok) toast.warning('تعذّر فتح صفحة الطباعة. تحقّق من حظر النوافذ المنبثقة.', 'تنبيه')
  }, [report, targetUid, viewingOther, branding.siteTitle])

  const crossItems = useMemo(
    () => [
      { to: appLink('/app'), label: str('layout.nav_home') },
      ...(hidePlanNavigation ? [] : [{ to: appLink('/app/plans'), label: str('layout.nav_plans') }]),
      { to: appLink('/app/activities'), label: str('layout.nav_activities') },
      { to: appLink('/app/exams'), label: str('layout.nav_exams') },
      ...(canAccessPage(REPORTS_PAGE)
        ? [{ to: appLink('/app/reports'), label: str('layout.nav_reports') }]
        : []),
    ],
    [appLink, str, hidePlanNavigation, canAccessPage],
  )

  const sections = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, count: null },
    { id: 'plans', label: 'الخطط', icon: Layers, count: report?.summary?.plansCount ?? 0 },
    { id: 'activities', label: 'الأنشطة', icon: Calendar, count: report?.summary?.activitiesCount ?? 0 },
    { id: 'exams', label: 'الاختبارات', icon: ClipboardList, count: report?.summary?.examsCount ?? 0 },
  ]

  if (!allowed) {
    return (
      <div className="rh-student-progress">
        <header className="rh-student-progress__hero card">
          <p className="rh-student-progress__denied">لا تملك صلاحية عرض إنجاز هذا الطالب.</p>
          <Button type="button" variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>
            رجوع
          </Button>
        </header>
      </div>
    )
  }

  const student = report?.student
  const initial = (student?.displayName || '?').charAt(0)

  return (
    <div className="rh-student-progress">
      <header className="rh-student-progress__hero card">
        <HapticLink to={appLink(viewingOther ? '/app/plans' : '/app')} className="rh-student-progress__back">
          <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> {viewingOther ? 'رجوع' : 'الرئيسية'}
        </HapticLink>

        <div className="rh-student-progress__profile">
          <span className="rh-student-progress__avatar" aria-hidden>
            {student?.photoURL ? <img src={student.photoURL} alt="" width={72} height={72} /> : initial}
          </span>
          <div className="rh-student-progress__profile-copy">
            <p className="rh-student-progress__eyebrow">{viewingOther ? 'تقرير إنجاز الطالب' : 'تقرير إنجازي'}</p>
            <h1 className="rh-student-progress__title">{student?.displayName || (loading ? '…' : 'طالب')}</h1>
            {student?.email ? <p className="rh-student-progress__email">{student.email}</p> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            disabled={loading || !targetUid}
            onClick={reloadReport}
            className="rh-student-progress__refresh"
          >
            تحديث
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Printer}
            disabled={loading || !report}
            onClick={onPrint}
            className="rh-student-progress__refresh"
          >
            طباعة
          </Button>
        </div>

        {!loading && report ? (
          <div className="rh-student-progress__kpis">
            <button
              type="button"
              className="rh-student-progress__kpi rh-student-progress__kpi--btn"
              onClick={() => setActiveSection('plans')}
            >
              <RhIcon as={Target} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <strong>{report.summary.plansAvgPercent}%</strong>
              <span>متوسط إنجاز الخطط</span>
            </button>
            <button
              type="button"
              className="rh-student-progress__kpi rh-student-progress__kpi--btn"
              onClick={() => setActiveSection('plans')}
            >
              <RhIcon as={BookOpen} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <strong>
                {report.summary.plansPagesDone} / {report.summary.plansPagesTarget}
              </strong>
              <span>صفحات أنجزها / الهدف</span>
            </button>
            <button
              type="button"
              className="rh-student-progress__kpi rh-student-progress__kpi--btn"
              onClick={() => setActiveSection('activities')}
            >
              <RhIcon as={Calendar} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <strong>
                {report.summary.activitiesWithContribution} / {report.summary.activitiesCount}
              </strong>
              <span>أنشطة سجّل فيها إنجازاً</span>
            </button>
            <button
              type="button"
              className="rh-student-progress__kpi rh-student-progress__kpi--btn"
              onClick={() => setActiveSection('exams')}
            >
              <RhIcon as={GraduationCap} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <strong>
                {report.summary.examsCompleted} / {report.summary.examsCount}
              </strong>
              <span>اختبارات أتمّها</span>
            </button>
          </div>
        ) : null}
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <nav className="rh-student-progress__tabs card" aria-label="أقسام التقرير">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              type="button"
              className={['rh-student-progress__tab', activeSection === section.id ? 'rh-student-progress__tab--active' : '']
                .filter(Boolean)
                .join(' ')}
              aria-current={activeSection === section.id ? 'page' : undefined}
              onClick={() => setActiveSection(section.id)}
            >
              <RhIcon as={Icon} size={18} strokeWidth={RH_ICON_STROKE} aria-hidden />
              {section.label}
              {section.count != null ? (
                <span className="rh-student-progress__tab-count">{section.count}</span>
              ) : null}
            </button>
          )
        })}
      </nav>

      {loading ? <p className="rh-student-progress__loading card">جاري تحميل تقرير الإنجاز…</p> : null}

      {!loading && report && activeSection === 'overview' ? (
        <section className="rh-student-progress__section">
          <div className="rh-student-progress__overview-grid">
            <button
              type="button"
              className="rh-student-progress__overview-card card"
              onClick={() => setActiveSection('plans')}
            >
              <RhIcon as={Layers} size={22} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <h2>الخطط</h2>
              <p>
                {report.summary.plansCount > 0
                  ? `${report.summary.plansAvgPercent}% متوسط · أنجز ${report.summary.plansPagesDone} ص · بقي ${report.summary.plansPagesRemaining} ص`
                  : 'لا توجد خطط مسجّلة'}
              </p>
            </button>
            <button
              type="button"
              className="rh-student-progress__overview-card card"
              onClick={() => setActiveSection('activities')}
            >
              <RhIcon as={Calendar} size={22} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <h2>الأنشطة</h2>
              <p>
                {report.summary.activitiesCount > 0
                  ? `${report.summary.activitiesWithContribution} من ${report.summary.activitiesCount} سجّل فيها إنجازاً`
                  : 'لا توجد أنشطة مسجّلة'}
              </p>
            </button>
            <button
              type="button"
              className="rh-student-progress__overview-card card"
              onClick={() => setActiveSection('exams')}
            >
              <RhIcon as={ClipboardList} size={22} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <h2>الاختبارات</h2>
              <p>
                {report.summary.examsCount > 0
                  ? `${report.summary.examsCompleted} من ${report.summary.examsCount} أتمّها`
                  : 'لا توجد اختبارات مسجّلة'}
              </p>
            </button>
          </div>
        </section>
      ) : null}

      {!loading && report && activeSection === 'plans' ? (
        <section className="rh-student-progress__section">
          {report.plans.length === 0 ? (
            <p className="rh-student-progress__empty card">لا توجد خطط مسجّلة لهذا الطالب.</p>
          ) : (
            <ul className="rh-student-progress__cards">
              {report.plans.map((plan) => (
                <li key={plan.id} className="rh-student-progress__card card">
                  <div className="rh-student-progress__card-head">
                    <div>
                      <h2 className="rh-student-progress__card-title">{plan.name}</h2>
                      <p className="rh-student-progress__card-meta">
                        <span className="rh-plans__saved-badge">{plan.roleLabel}</span>
                        · ورد {plan.dailyPages} ص/يوم
                      </p>
                    </div>
                    <div className="rh-student-progress__card-actions">
                      <HapticLink to={appLink(`/app/awrad?plan=${encodeURIComponent(plan.id)}`)} className="ui-btn ui-btn--ghost ui-btn--sm">
                        الأوراد
                      </HapticLink>
                    </div>
                  </div>

                  <ProgressBar percent={plan.progressPercent} label={`أنجز ${plan.achievedPages} من ${plan.targetPages} صفحة`} />

                  <div className="rh-student-progress__stats">
                    <div className="rh-student-progress__stat rh-student-progress__stat--done">
                      <span className="rh-student-progress__stat-label">أنجز</span>
                      <strong>{plan.achievedPages} ص</strong>
                    </div>
                    <div className="rh-student-progress__stat rh-student-progress__stat--remain">
                      <span className="rh-student-progress__stat-label">بقي</span>
                      <strong>{plan.remainingPages} ص</strong>
                    </div>
                    <div className="rh-student-progress__stat">
                      <span className="rh-student-progress__stat-label">الصفحة التالية</span>
                      <strong>{plan.nextFromPage}</strong>
                    </div>
                  </div>

                  {plan.todayApplies ? (
                    <p
                      className={[
                        'rh-student-progress__today',
                        plan.todayComplete ? 'rh-student-progress__today--ok' : 'rh-student-progress__today--pending',
                      ].join(' ')}
                    >
                      {plan.todayComplete
                        ? 'ورد اليوم: مكتمل'
                        : plan.pagesOwed > 0
                          ? `ورد اليوم: متأخر ${plan.pagesOwed} صفحة`
                          : 'ورد اليوم: لم يُسجَّل بعد'}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!loading && report && activeSection === 'activities' ? (
        <section className="rh-student-progress__section">
          {report.activities.length === 0 ? (
            <p className="rh-student-progress__empty card">لا توجد أنشطة مسجّلة.</p>
          ) : (
            <ul className="rh-student-progress__cards">
              {report.activities.map((activity) => (
                <li key={activity.id} className="rh-student-progress__card card">
                  <div className="rh-student-progress__card-head">
                    <div>
                      <h2 className="rh-student-progress__card-title">{activity.name}</h2>
                      <p className="rh-student-progress__card-meta">
                        {activity.startAt ? formatArDateTime(activity.startAt) : '—'}
                        {activity.endAt ? ` → ${formatArDateTime(activity.endAt)}` : ''}
                      </p>
                    </div>
                    <span
                      className={[
                        'rh-student-progress__status-pill',
                        activity.hasContribution
                          ? 'rh-student-progress__status-pill--success'
                          : 'rh-student-progress__status-pill--pending',
                      ].join(' ')}
                    >
                      {activity.hasContribution ? 'سجّل إنجازاً' : 'لم يُسجّل بعد'}
                    </span>
                  </div>
                  {activity.hasContribution ? (
                    <p className="rh-student-progress__contribution">{activity.contribution}</p>
                  ) : (
                    <p className="rh-student-progress__contribution rh-student-progress__contribution--muted">
                      لم يُدخل الطالب وصفاً لإنجازه في هذا النشاط بعد.
                    </p>
                  )}
                  {activity.contributionUpdatedAt ? (
                    <p className="rh-student-progress__updated">آخر تحديث: {formatArDateTime(activity.contributionUpdatedAt)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!loading && report && activeSection === 'exams' ? (
        <section className="rh-student-progress__section">
          {report.exams.length === 0 ? (
            <p className="rh-student-progress__empty card">لا توجد اختبارات مسجّلة.</p>
          ) : (
            <ul className="rh-student-progress__cards">
              {report.exams.map((exam) => (
                <li key={exam.id} className="rh-student-progress__card card">
                  <div className="rh-student-progress__card-head">
                    <div>
                      <h2 className="rh-student-progress__card-title">{exam.name}</h2>
                      <p className="rh-student-progress__card-meta">
                        <span className="rh-plans__saved-badge">{exam.roleLabel}</span>
                      </p>
                    </div>
                    <span
                      className={[
                        'rh-student-progress__status-pill',
                        exam.isComplete
                          ? 'rh-student-progress__status-pill--success'
                          : exam.status
                            ? 'rh-student-progress__status-pill--info'
                            : 'rh-student-progress__status-pill--pending',
                      ].join(' ')}
                    >
                      {exam.statusLabel}
                    </span>
                  </div>
                  <ExamStatusTrack statusStep={exam.statusStep} />
                  {exam.notes ? <p className="rh-student-progress__contribution">{exam.notes}</p> : null}
                  {exam.updatedAt ? (
                    <p className="rh-student-progress__updated">آخر تحديث: {formatArDateTime(exam.updatedAt)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!loading && report && canAccessPage(REPORTS_PAGE) && can(REPORTS_PAGE, 'student_report') ? (
        <footer className="rh-student-progress__footer card">
          <p>تريد تقريراً مفصّلاً بفلاتر زمنية وجداول؟</p>
          <HapticLink
            to={appLink(reportViewPath({ kind: 'student', entityId: targetUid }))}
            className="ui-btn ui-btn--secondary ui-btn--sm"
          >
            <RhIcon as={FileText} size={16} strokeWidth={RH_ICON_STROKE} />
            التقرير الشامل
          </HapticLink>
        </footer>
      ) : null}
    </div>
  )
}
