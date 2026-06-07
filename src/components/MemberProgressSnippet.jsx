import { MemberProgressPeek } from './MemberProgressPeek.jsx'

/**
 * سطر مختصر: أنجز / بقي / أنشطة / اختبارات.
 */
export function MemberProgressSnippet({ summary, loading }) {
  if (loading) {
    return <p className="rh-member-progress-snippet rh-member-progress-snippet--loading">جاري حساب الإنجاز…</p>
  }
  if (!summary) return null

  return (
    <div className="rh-member-progress-snippet" aria-label="ملخص الإنجاز">
      {summary.plansCount > 0 ? (
        <>
          <span className="rh-member-progress-snippet__chip">خطط {summary.plansAvgPercent}%</span>
          <span className="rh-member-progress-snippet__chip rh-member-progress-snippet__chip--done">
            أنجز {summary.plansPagesDone} ص
          </span>
          <span className="rh-member-progress-snippet__chip rh-member-progress-snippet__chip--remain">
            بقي {summary.plansPagesRemaining} ص
          </span>
        </>
      ) : (
        <span className="rh-member-progress-snippet__chip">لا خطط</span>
      )}
      {summary.activitiesCount > 0 ? (
        <span className="rh-member-progress-snippet__chip">
          أنشطة {summary.activitiesWithContribution}/{summary.activitiesCount}
        </span>
      ) : null}
      {summary.examsCount > 0 ? (
        <span className="rh-member-progress-snippet__chip">
          اختبارات {summary.examsCompleted}/{summary.examsCount}
        </span>
      ) : null}
    </div>
  )
}

/**
 * ملخص سريع + زر العين لفتح التقرير الكامل.
 */
export function MemberProgressTools({ userId, summary, loading }) {
  return (
    <div className="rh-member-progress-tools">
      <MemberProgressSnippet summary={summary} loading={loading} />
      <MemberProgressPeek userId={userId} />
    </div>
  )
}
