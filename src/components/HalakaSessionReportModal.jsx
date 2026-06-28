import { FileText, Printer, X } from 'lucide-react'
import { useMemo } from 'react'
import { useSiteContent } from '../context/useSiteContent.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, Modal } from '../ui/index.js'
import { buildHalakaSessionReportData } from '../utils/buildHalakaSessionReport.js'
import { formatNowMedium12Ar } from '../utils/formatDateTimeAr.js'
import { printMultiSectionReport } from '../utils/reportPrintUtils.js'

export function HalakaSessionReportModal({ open, onClose, halaka, session, attendanceRows }) {
  const { branding } = useSiteContent()
  const report = useMemo(
    () =>
      halaka && session
        ? buildHalakaSessionReportData({ halaka, session, attendanceRows })
        : null,
    [attendanceRows, halaka, session],
  )

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

  if (!report) return null

  const { stats } = report

  return (
    <Modal
      open={open}
      title="تقرير جلسة الحلقة"
      onClose={onClose}
      size="xl"
      className="rh-session-report-modal"
      contentClassName="rh-session-report"
    >
      <div className="rh-session-report__toolbar">
        <Button type="button" variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
          طباعة / PDF
        </Button>
        <Button type="button" variant="ghost" size="sm" icon={X} onClick={onClose}>
          إغلاق
        </Button>
      </div>

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
        <section className="rh-session-report__summary">
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

      <section className="rh-session-report__kpis">
        {report.kpis.map((kpi) => (
          <div key={kpi.label} className="rh-session-report__kpi">
            <span className="rh-session-report__kpi-value">{kpi.value}</span>
            <span className="rh-session-report__kpi-label">{kpi.label}</span>
          </div>
        ))}
      </section>

      {stats.activeStudents > 0 ? (
        <div className="rh-session-report__progress">
          <div className="rh-session-report__progress-head">
            <span>نسبة الطلاب الذين سجّلوا حفظاً</span>
            <strong>
              {stats.studentsWithEntries}/{stats.activeStudents} ({stats.recordPercent}%)
            </strong>
          </div>
          <div className="rh-session-report__progress-track" aria-hidden>
            <span className="rh-session-report__progress-fill" style={{ width: `${stats.recordPercent}%` }} />
          </div>
        </div>
      ) : null}

      {report.volumeStats.length > 0 ? (
        <section className="rh-session-report__section">
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
                  <span className="rh-session-report__volume-fill" style={{ width: `${v.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rh-session-report__section">
        <h3 className="rh-session-report__section-title">تفاصيل الطلاب والتسجيلات</h3>
        <div className="rh-session-report__students">
          {report.studentReports.map((student) => (
            <article
              key={student.userId}
              className={[
                'rh-session-report__student',
                student.entriesCount === 0 ? 'rh-session-report__student--empty' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <header className="rh-session-report__student-head">
                <div>
                  <h4 className="rh-session-report__student-name">{student.displayName}</h4>
                  <span className="rh-session-report__student-status">{student.attendanceLabel}</span>
                </div>
                <div className="rh-session-report__student-stats">
                  <span>{student.entriesCount} دفعة</span>
                  <span>{student.pagesTotal} ص</span>
                  {student.tasmeeLabel !== '0:00' && student.tasmeeLabel !== '—' ? (
                    <span>تسميع {student.tasmeeLabel}</span>
                  ) : null}
                </div>
              </header>
              {student.entries.length > 0 ? (
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
              ) : (
                <p className="rh-session-report__student-empty">لم يُسجَّل حفظ في هذه الجلسة</p>
              )}
            </article>
          ))}
        </div>
      </section>

      {report.entriesChronological.length > 0 ? (
        <section className="rh-session-report__section">
          <h3 className="rh-session-report__section-title">
            السجل الزمني للتسجيلات ({report.entriesChronological.length})
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
        <section className="rh-session-report__section rh-session-report__section--muted">
          <h3 className="rh-session-report__section-title">طلاب غائبون / بعذر بدون تسجيل</h3>
          <p className="rh-session-report__absent-list">
            {report.absentStudents.map((s) => s.displayName).join(' · ')}
          </p>
        </section>
      ) : null}
    </Modal>
  )
}
