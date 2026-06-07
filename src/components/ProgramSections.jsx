import { useMemo } from 'react'
import { ProgramBlockContent } from './ProgramBlockContent.jsx'
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
            <ProgramBlockContent section={s} />
          </section>
        )
      })}
    </div>
  )
}
