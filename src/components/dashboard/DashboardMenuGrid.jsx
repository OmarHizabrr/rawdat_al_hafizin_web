import { DashboardMenuCard } from './DashboardMenuCard.jsx'

export function DashboardMenuGrid({ items = [] }) {
  if (!items.length) {
    return (
      <p className="rh-student-workspace__empty" style={{ padding: 'var(--rh-space-6)' }}>
        لا توجد عناصر متاحة في القائمة.
      </p>
    )
  }

  return (
    <div className="rh-student-workspace__menu-grid">
      {items.map((item) => (
        <DashboardMenuCard key={item.id} item={item} />
      ))}
    </div>
  )
}
