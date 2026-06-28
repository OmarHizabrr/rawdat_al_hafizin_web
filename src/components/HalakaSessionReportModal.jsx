import { ArrowUp, ChevronDown, FileText, Printer, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSiteContent } from '../context/useSiteContent.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, Modal, SearchField } from '../ui/index.js'
import { buildHalakaSessionReportData } from '../utils/buildHalakaSessionReport.js'
import { formatNowMedium12Ar } from '../utils/formatDateTimeAr.js'
import { printMultiSectionReport } from '../utils/reportPrintUtils.js'

function defaultStudentExpanded(count) {
  return count > 0 && count <= 4
}

export function HalakaSessionReportModal({ open, onClose, halaka, session, attendanceRows }) {
  const { branding } = useSiteContent()
  const scrollRef = useRef(null)
  const [studentQuery, setStudentQuery] = useState('')
  const [hideEmptyStudents, setHideEmptyStudents] = useState(false)
  const [expandedStudents, setExpandedStudents] = useState({})
  const [showScrollTop, setShowScrollTop] = useState(false)

  const report = useMemo(
    () =>
      halaka && session
        ? buildHalakaSessionReportData({ halaka, session, attendanceRows })
        : null,
    [attendanceRows, halaka, session],
  )

  useEffect(() => {
    if (!open) {
      setStudentQuery('')
      setHideEmptyStudents(false)
      setExpandedStudents({})
      setShowScrollTop(false)
    }
  }, [open])

  const filteredStudentReports = useMemo(() => {
    if (!report) return []
    let list = report.studentReports
    if (hideEmptyStudents) list = list.filter((s) => s.entriesCount > 0)
    const q = studentQuery.trim().toLowerCase()
    if (q) list = list.filter((s) => (s.displayName || '').toLowerCase().includes(q))
    return list
  }, [hideEmptyStudents, report, studentQuery])

  const sectionNav = useMemo(() => {
    if (!report) return []
    const items = []
    if (report.executiveSummary.paragraphs.length) items.push({ id: 'summary', label: 'الملخص' })
    items.push({ id: 'kpis', label: 'المؤشرات' })
    if (report.volumeStats.length > 0) items.push({ id: 'volumes', label: 'المجلدات' })
    items.push({ id: 'students', label: 'الطلاب' })
    if (report.entriesChronological.length > 0) items.push({ id: 'timeline', label: 'السجل الزمني' })
    if (report.absentStudents.length > 0) items.push({ id: 'absent', label: 'الغائبون' })
    return items
  }, [report])

  const handlePrint = () => {
    if (!report) return
    const ok = printMultiSectionReport({
      documentTitle: report.title,
      kpis: report.kpis,
      executiveSummary: report.executiveSummary,
      sections: report.printSections,
      introMeta: report.meta,
      printContext: {
        siteTitle: branding?.siteTitle || 'روضة الحافظين',
        reportTypeLabel: 'تقرير جلسة حلقة',
        entityName: `${report.halakaName} — ${session?.title || ''}`,
        issuedAt: formatNowMedium12Ar(),
      },
    })
    if (!ok) window.print()
  }

  const scrollToSection = useCallback((sectionId) => {
    scrollRef.current
      ?.querySelector(`#rh-report-section-${sectionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollTop(el.scrollTop > 280)
  }, [])

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const isStudentExpanded = useCallback(
    (userId, count) => expandedStudents[userId] ?? defaultStudentExpanded(count),
    [expandedStudents],
  )

  const toggleStudentExpanded = useCallback((userId, count) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [userId]: !(prev[userId] ?? defaultStudentExpanded(count)),
    }))
  }, [])

  const expandAllStudents = useCallback(() => {
    if (!report) return
    const next = {}
    for (const s of filteredStudentReports) {
      if (s.entriesCount > 0) next[s.userId] = true
    }
    setExpandedStudents(next)
  }, [filteredStudentReports, report])

  const collapseAllStudents = useCallback(() => {
    setExpandedStudents({})
  }, [])

  if (!report) return null

  const { stats } = report

  return (
    <Modal
      open={open}
      title="تقرير جلسة الحلقة"
      onClose={onClose}
      size="xl"
      className="rh-session-report-modal"
      contentClassName="rh-session-report-shell"
    >
      <div className="rh-session-report__toolbar">
        {sectionNav.length > 1 ? (
          <nav className="rh-session-report__nav" aria-label="أقسام التقرير">
            {sectionNav.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rh-session-report__nav-chip"
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="rh-session-report__toolbar-actions">
          <Button type="button" variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
            طباعة / PDF
          </Button>
          <Button type="button" variant="ghost" size="sm" icon={X} onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>

      <div className="rh-session-report" ref={scrollRef} onScroll={handleScroll}>
        <header className="rh-session-report__hero">
          <div className="rh-session-report__hero-badge">
            <RhIcon as={FileText} size={18} strokeWidth={RH_ICON_STROKE} />
            تقرير الجلسة
          </div>
          <h2 className="rh-session-report__hero-title">{report.title}</h2>
          <p className="rh-session-report__hero-sub">{report.halakaName}</p>
          <dl className="rh-session-report__meta">
            {report.meta.map((item) => (
              <div key={item.label} className="rh-session-report__meta-item">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        {report.executiveSummary.paragraphs.length ? (
          <section id="rh-report-section-summary" className="rh-session-report__summary rh-session-report__section-anchor">
            <h3 className="rh-session-report__section-title">الملخص التنفيذي</h3>
            {report.executiveSummary.paragraphs.map((p) => (
              <p key={p} className="rh-session-report__summary-p">
                {p}
              </p>
            ))}
            <ul className="rh-session-report__highlights">
              {report.executiveSummary.highlights.map((h) => (
                <li key={h.label}>
                  <span>{h.label}</span>
                  <strong>{h.value}</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="rh-report-section-kpis" className="rh-session-report__section-anchor">
          <div className="rh-session-report__kpis">
            {report.kpis.map((kpi) => (
              <div key={kpi.label} className="rh-session-report__kpi">
                <span className="rh-session-report__kpi-value">{kpi.value}</span>
                <span className="rh-session-report__kpi-label">{kpi.label}</span>
              </div>
            ))}
          </div>

          {stats.activeStudents > 0 ? (
            <div className="rh-session-report__progress">
              <div className="rh-session-report__progress-head">
                <span>نسبة الطلاب الذين سجّلوا حفظاً</span>
                <strong>
                  {stats.studentsWithEntries}/{stats.activeStudents} ({stats.recordPercent}%)
                </strong>
              </div>
              <div className="rh-session-report__progress-track" aria-hidden>
                <span
                  className="rh-session-report__progress-fill rh-session-report__progress-fill--animated"
                  style={{ width: `${stats.recordPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </section>

        {report.volumeStats.length > 0 ? (
          <section id="rh-report-section-volumes" className="rh-session-report__section rh-session-report__section-anchor">
            <h3 className="rh-session-report__section-title">توزيع الصفحات حسب المجلد</h3>
            <ul className="rh-session-report__volume-list">
              {report.volumeStats.map((v) => (
                <li key={v.volId} className="rh-session-report__volume-item">
                  <div className="rh-session-report__volume-head">
                    <span className="rh-session-report__volume-label">{v.label}</span>
                    <span className="rh-session-report__volume-meta">
                      {v.pages} ص · {v.entries} دفعة · {v.studentsCount} طالب
                    </span>
                  </div>
                  <div className="rh-session-report__volume-track" aria-hidden>
                    <span
                      className="rh-session-report__volume-fill rh-session-report__volume-fill--animated"
                      style={{ width: `${v.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="rh-report-section-students" className="rh-session-report__section rh-session-report__section-anchor">
          <div className="rh-session-report__section-head">
            <h3 className="rh-session-report__section-title">
              تفاصيل الطلاب والتسجيلات
              <span className="rh-session-report__section-count">{filteredStudentReports.length}</span>
            </h3>
            <div className="rh-session-report__student-tools">
              <SearchField
                className="rh-session-report__student-search"
                label="بحث عن طالب"
                placeholder="اسم الطالب…"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
              />
              <button
                type="button"
                className={[
                  'rh-session-report__tool-chip',
                  hideEmptyStudents ? 'rh-session-report__tool-chip--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setHideEmptyStudents((v) => !v)}
              >
                إخفاء بدون تسجيل
              </button>
              <button type="button" className="rh-session-report__tool-chip" onClick={expandAllStudents}>
                توسيع الكل
              </button>
              <button type="button" className="rh-session-report__tool-chip" onClick={collapseAllStudents}>
                طيّ الكل
              </button>
            </div>
          </div>

          {filteredStudentReports.length === 0 ? (
            <p className="rh-session-report__student-empty rh-session-report__student-empty--filter">
              لا يوجد طالب مطابق للبحث أو التصفية الحالية.
            </p>
          ) : (
            <div className="rh-session-report__students">
              {filteredStudentReports.map((student) => {
                const entriesOpen = isStudentExpanded(student.userId, student.entriesCount)
                return (
                  <article
                    key={student.userId}
                    className={[
                      'rh-session-report__student',
                      student.entriesCount === 0 ? 'rh-session-report__student--empty' : '',
                      entriesOpen ? 'rh-session-report__student--open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className="rh-session-report__student-head"
                      onClick={() => student.entriesCount > 0 && toggleStudentExpanded(student.userId, student.entriesCount)}
                      aria-expanded={student.entriesCount > 0 ? entriesOpen : undefined}
                      disabled={student.entriesCount === 0}
                    >
                      <div className="rh-session-report__student-head-main">
                        {student.entriesCount > 0 ? (
                          <RhIcon
                            as={ChevronDown}
                            size={16}
                            strokeWidth={RH_ICON_STROKE}
                            className={entriesOpen ? 'rh-session-report__chevron--open' : ''}
                          />
                        ) : (
                          <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                        )}
                        <div>
                          <h4 className="rh-session-report__student-name">{student.displayName}</h4>
                          <span className="rh-session-report__student-status">{student.attendanceLabel}</span>
                        </div>
                      </div>
                      <div className="rh-session-report__student-stats">
                        <span>{student.entriesCount} دفعة</span>
                        <span>{student.pagesTotal} ص</span>
                        {student.tasmeeLabel !== '0:00' && student.tasmeeLabel !== '—' ? (
                          <span>تسميع {student.tasmeeLabel}</span>
                        ) : null}
                      </div>
                    </button>
                    {student.entries.length > 0 && entriesOpen ? (
                      <ul className="rh-session-report__entries">
                        {student.entries.map((entry, idx) => (
                          <li key={entry.id || `${student.userId}_${idx}`} className="rh-session-report__entry">
                            <span className="rh-session-report__entry-vol">{entry.volumeLabel}</span>
                            <span className="rh-session-report__entry-range">{entry.rangeLabel}</span>
                            <span className="rh-session-report__entry-pages">{entry.pagesCount} ص</span>
                            {entry.recordedAtLabel !== '—' ? (
                              <span className="rh-session-report__entry-time">{entry.recordedAtLabel}</span>
                            ) : null}
                            {entry.notes ? (
                              <span className="rh-session-report__entry-notes">{entry.notes}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : student.entries.length === 0 ? (
                      <p className="rh-session-report__student-empty">لم يُسجَّل حفظ في هذه الجلسة</p>
                    ) : (
                      <p className="rh-session-report__student-collapsed-hint">
                        {student.entriesCount} تسجيل — اضغط لعرض التفاصيل
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {report.entriesChronological.length > 0 ? (
          <section id="rh-report-section-timeline" className="rh-session-report__section rh-session-report__section-anchor">
            <h3 className="rh-session-report__section-title">
              السجل الزمني للتسجيلات
              <span className="rh-session-report__section-count">{report.entriesChronological.length}</span>
            </h3>
            <div className="rh-session-report__table-wrap">
              <table className="rh-session-report__table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>المجلد</th>
                    <th>النطاق</th>
                    <th>صفحات</th>
                    <th>الوقت</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entriesChronological.map((e) => (
                    <tr key={e.id || `${e.userId}_${e.recordedAt}_${e.fromPage}`}>
                      <td>{e.displayName}</td>
                      <td>{e.volumeLabel}</td>
                      <td>{e.rangeLabel}</td>
                      <td>{e.pagesCount || '—'}</td>
                      <td>{e.recordedAtLabel}</td>
                      <td>{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {report.absentStudents.length > 0 ? (
          <section
            id="rh-report-section-absent"
            className="rh-session-report__section rh-session-report__section--muted rh-session-report__section-anchor"
          >
            <h3 className="rh-session-report__section-title">طلاب غائبون / بعذر بدون تسجيل</h3>
            <p className="rh-session-report__absent-list">
              {report.absentStudents.map((s) => s.displayName).join(' · ')}
            </p>
          </section>
        ) : null}
      </div>

      {showScrollTop ? (
        <button
          type="button"
          className="rh-session-report__scroll-top"
          aria-label="العودة لأعلى التقرير"
          onClick={scrollToTop}
        >
          <RhIcon as={ArrowUp} size={18} strokeWidth={RH_ICON_STROKE} />
        </button>
      ) : null}
    </Modal>
  )
}
