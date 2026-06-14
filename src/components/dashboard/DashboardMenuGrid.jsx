import { DashboardMenuCard } from './DashboardMenuCard.jsx'

export function DashboardMenuGrid({ items = [] }) {
  if (!items.length) {
    return (
      <p className="tw-rounded-xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-p-6 tw-text-center tw-text-sm tw-text-slate-600">
        لا توجد عناصر متاحة في القائمة.
      </p>
    )
  }

  return (
    <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2 xl:tw-grid-cols-3 2xl:tw-grid-cols-4">
      {items.map((item) => (
        <DashboardMenuCard key={item.id} item={item} />
      ))}
    </div>
  )
}
