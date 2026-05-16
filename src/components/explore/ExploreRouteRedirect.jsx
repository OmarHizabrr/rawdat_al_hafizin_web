import { Navigate, useLocation } from 'react-router-dom'
import { EXPLORE_PARENT_PATHS } from '../../utils/exploreModalLink.js'

/**
 * يوجّه روابط /explore القديمة إلى الصفحة الأب مع ?explore=1 لفتح النافذة.
 * @param {{ kind: import('./explorePublicKinds.js').ExploreKind }} props
 */
export default function ExploreRouteRedirect({ kind }) {
  const { search } = useLocation()
  const parent = EXPLORE_PARENT_PATHS[kind]
  const params = new URLSearchParams(search)
  params.set('explore', '1')
  const q = params.toString()
  return <Navigate to={q ? `${parent}?${q}` : `${parent}?explore=1`} replace />
}
