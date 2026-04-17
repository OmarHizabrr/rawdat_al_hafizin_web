import { Link } from 'react-router-dom'

/**
 * شريط روابط ثابت بين الصفحات (نفس المبدأ: كل مسار يصل لصفحته).
 * @param {{ to: string, label: string }[]} items
 */
export function CrossNav({ items = [], className = '' }) {
  if (!items.length) return null
  return (
    <nav
      className={['rh-cross-nav', className].filter(Boolean).join(' ')}
      aria-label="تنقل سريع بين أقسام المنصة"
    >
      {items.map((item, i) => (
        <span key={item.to} className="rh-cross-nav__frag">
          {i > 0 && <span className="rh-cross-nav__sep" aria-hidden> · </span>}
          <Link to={item.to}>{item.label}</Link>
        </span>
      ))}
    </nav>
  )
}
