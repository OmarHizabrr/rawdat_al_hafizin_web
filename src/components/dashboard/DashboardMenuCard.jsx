import { useLocation } from 'react-router-dom'
import { HapticLink } from '../../ui/HapticLink.jsx'
import { useAuth } from '../../context/useAuth.js'
import { getImpersonateUid, withImpersonationQuery } from '../../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

export function DashboardMenuCard({ item }) {
  const { user } = useAuth()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)

  return (
    <HapticLink to={withImpersonationQuery(item.to, impersonateUid)} className="rh-student-workspace__menu-card">
      <div className="rh-student-workspace__menu-card-top">
        <span className="rh-student-workspace__menu-icon" aria-hidden>
          <RhIcon as={item.Icon} size={22} strokeWidth={RH_ICON_STROKE} />
        </span>
        {item.badge ? <span className="rh-student-workspace__menu-badge">{item.badge}</span> : null}
      </div>
      <div>
        <h3 className="rh-student-workspace__menu-title">{item.title}</h3>
        <p className="rh-student-workspace__menu-desc">{item.description}</p>
      </div>
      <span className="rh-student-workspace__menu-cta">فتح ←</span>
    </HapticLink>
  )
}
