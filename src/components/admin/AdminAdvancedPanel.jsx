/**
 * قسم قابل للطي للإعدادات التقنية — يُخفى عن المستخدم العادي.
 */
export function AdminAdvancedPanel({ summary = 'إعدادات تقنية (للمشرف المتقدم)', children, className = '' }) {
  return (
    <details className={['rh-admin-advanced-panel', className].filter(Boolean).join(' ')}>
      <summary>{summary}</summary>
      <div className="rh-admin-advanced-panel__body">{children}</div>
    </details>
  )
}
