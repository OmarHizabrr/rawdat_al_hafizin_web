import { useMemo } from 'react'
import { resolveProgramBlockIcon } from '../data/programBlockIcons.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { programBlockToViewModel } from '../utils/programBlocks.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export function ProgramSections({ className = '' }) {
  const { programBlocks } = useSiteContent()

  const sections = useMemo(
    () => programBlocks.map((block) => programBlockToViewModel(block)),
    [programBlocks],
  )

  if (!sections.length) return null

  return (
    <div className={className}>
      {sections.map((s) => {
        const Icon = resolveProgramBlockIcon(s.icon)
        return (
          <section key={s.id} id={s.id} className="card">
            <h2>
              <span className="card-icon" aria-hidden>
                <RhIcon as={Icon} size={22} strokeWidth={RH_ICON_STROKE} />
              </span>
              {s.title}
            </h2>
            {s.mode === 'lead' && s.lead ? <p className="lead">{s.lead}</p> : null}
            {s.mode === 'message' && s.lead ? <p className="lead emphasis">{s.lead}</p> : null}
            {s.mode === 'paragraphs' &&
              s.paragraphs?.map((p, i) => (
                <p key={`${s.id}-p-${i}`}>{p}</p>
              ))}
            {s.mode === 'list' && s.list?.length > 0 ? (
              <ul>
                {s.list.map((item, i) => (
                  <li key={`${s.id}-li-${i}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
