import { useLocation } from 'react-router-dom'
import { HapticLink } from '../../ui/HapticLink.jsx'
import { DASHBOARD_ACCENT_STYLES } from '../../data/dashboardMenuItems.js'
import { useAuth } from '../../context/useAuth.js'
import { getImpersonateUid, withImpersonationQuery } from '../../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

export function DashboardMenuCard({ item }) {
  const { user } = useAuth()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const accent = DASHBOARD_ACCENT_STYLES[item.accent] || DASHBOARD_ACCENT_STYLES.slate

  return (
    <HapticLink
      to={withImpersonationQuery(item.to, impersonateUid)}
      className={[
        'tw-group tw-flex tw-h-full tw-flex-col tw-gap-3 tw-rounded-2xl tw-border tw-border-slate-200/80',
        'tw-bg-white tw-p-4 tw-shadow-sm tw-ring-1 tw-ring-transparent tw-transition-all',
        'hover:tw--translate-y-0.5 hover:tw-shadow-md hover:tw-ring-2',
        accent.ring,
      ].join(' ')}
    >
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-2">
        <span
          className={[
            'tw-inline-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-xl',
            accent.bg,
            accent.icon,
          ].join(' ')}
          aria-hidden
        >
          <RhIcon as={item.Icon} size={22} strokeWidth={RH_ICON_STROKE} />
        </span>
        {item.badge ? (
          <span className={['tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[0.65rem] tw-font-bold', accent.badge].join(' ')}>
            {item.badge}
          </span>
        ) : null}
      </div>
      <div className="tw-min-w-0 tw-flex-1">
        <h3 className="tw-text-base tw-font-bold tw-text-slate-900 group-hover:tw-text-slate-950">{item.title}</h3>
        <p className="tw-mt-1 tw-text-sm tw-leading-relaxed tw-text-slate-600">{item.description}</p>
      </div>
      <span className="tw-text-xs tw-font-semibold tw-text-slate-500 group-hover:tw-text-slate-700">فتح ←</span>
    </HapticLink>
  )
}
