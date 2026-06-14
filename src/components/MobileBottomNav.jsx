import { LayoutGrid } from 'lucide-react'
import { HapticNavLink } from '../ui/HapticLink.jsx'
import { withImpersonationQuery } from '../utils/impersonation.js'
import { rhHapticChromeTap } from '../utils/haptics.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export function MobileBottomNav({ tabs = [], impersonateUid = '', moreOpen = false, onMoreClick }) {
  if (!tabs.length) return null

  return (
    <nav className="rh-bottom-nav" aria-label="التنقل السريع">
      <ul className="rh-bottom-nav__list">
        {tabs.map((item) => (
          <li key={item.to} className="rh-bottom-nav__cell">
            <HapticNavLink
              to={withImpersonationQuery(item.to, impersonateUid)}
              end={item.end}
              aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
              className={({ isActive }) =>
                ['rh-bottom-nav__item', isActive ? 'rh-bottom-nav__item--active' : ''].filter(Boolean).join(' ')
              }
            >
              <span className="rh-bottom-nav__icon-wrap" aria-hidden>
                <RhIcon as={item.Icon} size={22} strokeWidth={RH_ICON_STROKE} />
                {item.badge ? (
                  <span className="rh-bottom-nav__badge" aria-hidden>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="rh-bottom-nav__label">{item.label}</span>
            </HapticNavLink>
          </li>
        ))}
        <li className="rh-bottom-nav__cell">
          <button
            type="button"
            className={['rh-bottom-nav__item', 'rh-bottom-nav__item--more', moreOpen ? 'rh-bottom-nav__item--active' : '']
              .filter(Boolean)
              .join(' ')}
            aria-label="المزيد من الصفحات"
            aria-expanded={moreOpen}
            onPointerDown={(e) => rhHapticChromeTap(e)}
            onClick={onMoreClick}
          >
            <span className="rh-bottom-nav__icon-wrap" aria-hidden>
              <RhIcon as={LayoutGrid} size={22} strokeWidth={RH_ICON_STROKE} />
            </span>
            <span className="rh-bottom-nav__label">المزيد</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
