import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'

/**
 * شريط روابط ثابت بين الصفحات (نفس المبدأ: كل مسار يصل لصفحته).
 * للمشرف أثناء `?uid=` يُمرَّر المعرف في الروابط تلقائياً.
 * @param {{ to: string, label: string }[]} items
 */
export function CrossNav({ items = [], className = '' }) {
  const { user } = useAuth()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)

  if (!items.length) return null
  return (
    <nav
      className={['rh-cross-nav', className].filter(Boolean).join(' ')}
      aria-label="تنقل سريع بين أقسام المنصة"
    >
      {items.map((item, i) => {
        const to = withImpersonationQuery(item.to, impersonateUid)
        return (
          <span key={`${to}:${item.label}`} className="rh-cross-nav__frag">
            {i > 0 && <span className="rh-cross-nav__sep" aria-hidden> · </span>}
            <Link to={to}>{item.label}</Link>
          </span>
        )
      })}
    </nav>
  )
}
