import { Check, Star } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function TextParagraphs({ section, className = '' }) {
  if (section.paragraphs?.length) {
    return section.paragraphs.map((p, i) => (
      <p key={`${section.id}-p-${i}`} className={className || undefined}>
        {p}
      </p>
    ))
  }
  if (!section.text) return null
  return String(section.text)
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => (
      <p key={`${section.id}-t-${i}`} className={className || undefined}>
        {p}
      </p>
    ))
}

export function ProgramBlockContent({ section }) {
  const { mode, id } = section

  if (mode === 'lead' && section.text) {
    return <p className="lead">{section.text}</p>
  }

  if (mode === 'message' && section.text) {
    return <p className="lead emphasis">{section.text}</p>
  }

  if (mode === 'text') {
    return <TextParagraphs section={section} />
  }

  if (mode === 'paragraphs' && section.paragraphs?.length) {
    return section.paragraphs.map((p, i) => <p key={`${id}-p-${i}`}>{p}</p>)
  }

  if (mode === 'quote' && section.text) {
    return (
      <blockquote className="rh-program-block__quote">
        <p>{section.text}</p>
      </blockquote>
    )
  }

  if (mode === 'verse' && section.text) {
    return <p className="rh-program-block__verse">{section.text}</p>
  }

  if ((mode === 'callout' || mode === 'warning' || mode === 'success') && section.text) {
    return (
      <aside className={`rh-program-block__callout rh-program-block__callout--${mode}`}>
        <p>{section.text}</p>
      </aside>
    )
  }

  if (mode === 'list' && section.items?.length) {
    return (
      <ul>
        {section.items.map((item, i) => (
          <li key={`${id}-li-${i}`}>{item}</li>
        ))}
      </ul>
    )
  }

  if (mode === 'numbered' && section.items?.length) {
    return (
      <ol>
        {section.items.map((item, i) => (
          <li key={`${id}-ol-${i}`}>{item}</li>
        ))}
      </ol>
    )
  }

  if (mode === 'checklist' && section.items?.length) {
    return (
      <ul className="rh-program-block__checklist">
        {section.items.map((item, i) => (
          <li key={`${id}-chk-${i}`}>
            <RhIcon as={Check} size={16} strokeWidth={2.5} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (mode === 'steps' && section.items?.length) {
    return (
      <ol className="rh-program-block__steps">
        {section.items.map((item, i) => (
          <li key={`${id}-step-${i}`}>
            <span className="rh-program-block__step-num" aria-hidden>
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    )
  }

  if (mode === 'highlights' && section.items?.length) {
    return (
      <ul className="rh-program-block__highlights">
        {section.items.map((item, i) => (
          <li key={`${id}-hi-${i}`}>
            <RhIcon as={Star} size={15} strokeWidth={RH_ICON_STROKE} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (mode === 'definition' && section.definitions?.length) {
    return (
      <dl className="rh-program-block__definitions">
        {section.definitions.map((row, i) => (
          <div key={`${id}-def-${i}`} className="rh-program-block__definition-row">
            {row.term ? <dt>{row.term}</dt> : null}
            <dd>{row.definition}</dd>
          </div>
        ))}
      </dl>
    )
  }

  if (mode === 'links' && section.links?.length) {
    return (
      <ul className="rh-program-block__links">
        {section.links.map((link, i) => {
          const external = /^https?:\/\//i.test(link.href)
          return (
            <li key={`${id}-lnk-${i}`}>
              {external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ) : (
                <HapticLink to={link.href}>{link.label}</HapticLink>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  if (mode === 'cards' && section.cards?.length) {
    return (
      <div className="rh-program-block__cards">
        {section.cards.map((card, i) => (
          <article key={`${id}-card-${i}`} className="rh-program-block__card">
            <h3 className="rh-program-block__card-title">{card.title}</h3>
            {card.body ? <p>{card.body}</p> : null}
          </article>
        ))}
      </div>
    )
  }

  if (mode === 'badges' && section.badges?.length) {
    return (
      <div className="rh-program-block__badges">
        {section.badges.map((badge, i) => (
          <span key={`${id}-badge-${i}`} className="rh-program-block__badge">
            {badge}
          </span>
        ))}
      </div>
    )
  }

  return null
}
