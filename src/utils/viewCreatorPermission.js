import { useMemo } from 'react'
import { usePermissions } from '../context/usePermissions.js'

/** معرّف إجراء موحّد: إظهار منشئ/مالك/كاتب العنصر في الواجهة */
export const VIEW_CREATOR_ACTION = 'view_creator'

/**
 * @param {(pageId: string, actionId: string) => boolean} can
 * @param {string | undefined} pageId
 */
export function canViewCreator(can, pageId) {
  if (!pageId) return true
  return can(pageId, VIEW_CREATOR_ACTION)
}

/** @param {string | undefined} pageId */
export function useCanViewCreator(pageId) {
  const { can, ready } = usePermissions()
  return useMemo(() => {
    if (!ready) return false
    return canViewCreator(can, pageId)
  }, [can, pageId, ready])
}

/** يزيل حقول المنشئ من عنصر استكشاف قبل العرض */
export function stripExploreCreatorFields(item) {
  if (!item || typeof item !== 'object') return item
  const {
    creatorUid: _uid,
    creatorDisplayName: _name,
    creatorEmail: _email,
    creatorPhoto: _photo,
    creatorPhotoURL: _photoUrl,
    createdByName: _cbn,
    createdByImageUrl: _cbi,
    ...rest
  } = item
  return rest
}

/** يزيل ذكر «المنشئ» من تلميح البحث عند إخفاء هوية المنشئ */
export function searchHintWithoutCreator(hint) {
  return String(hint || '')
    .replace(/\s*،\s*أو\s*المنشئ\s*$/u, '')
    .replace(/\s*،\s*المنشئ\s*$/u, '')
    .replace(/\s*أو\s*المنشئ\s*$/u, '')
    .trim()
}

/**
 * @param {object} p
 * @param {string} q
 */
export function exploreItemMatchesCreator(p, q) {
  const creator = `${p.creatorDisplayName || ''} ${p.creatorEmail || ''} ${p.creatorUid || ''}`.toLowerCase()
  return creator.includes(q)
}
