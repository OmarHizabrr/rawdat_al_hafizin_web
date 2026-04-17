import {
  BookOpenText,
  Compass,
  LibraryBig,
  Sparkles,
  Sprout,
  Target,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { useSiteContent } from '../context/useSiteContent.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const SECTION_ICONS = {
  intro: BookOpenText,
  goals: Target,
  approach: Compass,
  content: LibraryBig,
  features: Sparkles,
  audience: Users,
  message: Sprout,
}

function lines(str) {
  return String(str || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ProgramSections({ className = '' }) {
  const { str } = useSiteContent()

  const sections = useMemo(
    () => [
      {
        id: 'intro',
        title: str('program.intro.title'),
        mode: 'lead',
        lead: str('program.intro.lead'),
      },
      {
        id: 'goals',
        title: str('program.goals.title'),
        mode: 'list',
        list: lines(str('program.goals.list')),
      },
      {
        id: 'approach',
        title: str('program.approach.title'),
        mode: 'paragraphs',
        paragraphs: [str('program.approach.p1'), str('program.approach.p2')],
      },
      {
        id: 'content',
        title: str('program.content.title'),
        mode: 'list',
        list: lines(str('program.content.list')),
      },
      {
        id: 'features',
        title: str('program.features.title'),
        mode: 'list',
        list: lines(str('program.features.list')),
      },
      {
        id: 'audience',
        title: str('program.audience.title'),
        mode: 'list',
        list: lines(str('program.audience.list')),
      },
      {
        id: 'message',
        title: str('program.message.title'),
        mode: 'message',
        lead: str('program.message.lead'),
      },
    ],
    [str],
  )

  return (
    <div className={className}>
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.id]
        return (
          <section key={s.id} id={s.id} className="card">
            <h2>
              <span className="card-icon" aria-hidden>
                {Icon ? <RhIcon as={Icon} size={22} strokeWidth={RH_ICON_STROKE} /> : null}
              </span>
              {s.title}
            </h2>
            {s.mode === 'lead' && (
              <p className="lead">{s.lead}</p>
            )}
            {s.mode === 'message' && <p className="lead emphasis">{s.lead}</p>}
            {s.mode === 'paragraphs' &&
              s.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            {s.mode === 'list' && s.list?.length > 0 && (
              <ul>
                {s.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
