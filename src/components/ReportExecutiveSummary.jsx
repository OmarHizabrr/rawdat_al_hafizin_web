/**
 * ملخص تنفيذي — يُعرض أعلى التقرير على الشاشة وفي منطقة التقاط PDF
 *
 * @param {object} props
 * @param {{ paragraphs?: string[], highlights?: { label: string, value: string|number }[], rangeLabel?: string }} props.summary
 * @param {string} [props.className]
 */
export function ReportExecutiveSummary({ summary, className = '' }) {
  if (!summary?.paragraphs?.length && !summary?.highlights?.length) return null

  const cls = ['rh-reports__executive', className].filter(Boolean).join(' ')

  return (
    <section className={cls} aria-label="الملخص التنفيذي">
      <div className="rh-reports__executive-head">
        <h2 className="rh-reports__executive-title">الملخص التنفيذي</h2>
        {summary.rangeLabel ? (
          <span className="rh-reports__executive-range">{summary.rangeLabel}</span>
        ) : null}
      </div>
      {summary.paragraphs?.length ? (
        <div className="rh-reports__executive-body">
          {summary.paragraphs.map((p, i) => (
            <p key={i} className="rh-reports__executive-p">
              {p}
            </p>
          ))}
        </div>
      ) : null}
      {summary.highlights?.length ? (
        <ul className="rh-reports__executive-highlights">
          {summary.highlights.map((h, i) => (
            <li key={`${h.label}-${i}`} className="rh-reports__executive-highlight">
              <span className="rh-reports__executive-highlight-label">{h.label}</span>
              <strong className="rh-reports__executive-highlight-value">{h.value ?? '—'}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
