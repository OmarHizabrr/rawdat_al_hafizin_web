import { ExternalLink } from 'lucide-react'
import { displayTitleForPlanLink, normalizePlanResourceLinks } from '../utils/planResourceLinks.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/**
 * @param {object} props
 * @param {unknown} props.links
 * @param {string} [props.className]
 */
export function PlanResourceLinksBlock({ links, className = '' }) {
  const rows = normalizePlanResourceLinks(links)
  if (!rows.length) return null

  return (
    <div className={['rh-plan-resource-links', className].filter(Boolean).join(' ')}>
      <p className="rh-plan-resource-links__title">روابط وقنوات</p>
      <ul className="rh-plan-resource-links__list">
        {rows.map((row) => {
          const title = displayTitleForPlanLink(row)
          return (
            <li key={row.id} className="rh-plan-resource-links__item">
              <a
                className="rh-plan-resource-links__link"
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="rh-plan-resource-links__badge">{title}</span>
                <span className="rh-plan-resource-links__url">{row.url}</span>
                <RhIcon as={ExternalLink} size={16} strokeWidth={RH_ICON_STROKE} className="rh-plan-resource-links__icon" />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
