import { PeekButton } from './PeekButton.jsx'
import { studentProgressLink } from '../utils/studentProgressLink.js'

/**
 * زر العين — يفتح تقرير إنجاز الطالب (أنجز / بقي).
 */
export function MemberProgressPeek({ userId, title = 'تقرير إنجاز الطالب — أنجز / بقي' }) {
  if (!userId) return null
  return <PeekButton to={studentProgressLink(userId)} title={title} />
}
