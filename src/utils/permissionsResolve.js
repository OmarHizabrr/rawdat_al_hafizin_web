import {
  PERMISSION_PAGES,
  getPagePathById,
  PERMISSION_FALLBACK_ORDER,
} from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'

const ALL_PAGE_IDS = new Set(PERMISSION_PAGES.map((p) => p.id))

function pageEntryVisible(pages, pageId) {
  if (!pages || typeof pages !== 'object') return false
  const entry = pages[pageId]
  if (!entry || typeof entry !== 'object') return false
  if (entry.visible === false) return false
  return true
}

export function firstAccessiblePathFromPagesMap(pages) {
  for (const id of PERMISSION_FALLBACK_ORDER) {
    if (pageEntryVisible(pages, id)) return getPagePathById(id)
  }
  return '/app/settings'
}

/** صفحات أولية للمستخدم الجديد: البداية والإعدادات وخدمات التواصل */
function starterSyntheticPagesMap() {
  return {
    welcome: { actions: {} },
    settings: { actions: { settings_theme: true, settings_edit_profile: true } },
    leave_request: { actions: {} },
    certificates: { actions: {} },
  }
}

function permissionApiFromPagesMap(pages, usesProfile) {
  return {
    ready: true,
    usesProfile,
    canAccessPage: (pageId) => {
      if (!pageId || !ALL_PAGE_IDS.has(pageId)) return true
      return pageEntryVisible(pages, pageId)
    },
    can: (pageId, actionId) => {
      if (!actionId) return false
      if (!pageId || !ALL_PAGE_IDS.has(pageId)) return true
      if (!pageEntryVisible(pages, pageId)) return false
      return pages?.[pageId]?.actions?.[actionId] === true
    },
    firstAccessiblePath: () => firstAccessiblePathFromPagesMap(pages),
  }
}

/** مسار الدخول الافتراضي بعد تسجيل الدخول (للمستخدم الجديد → البداية) */
export function getPostLoginLandingPath(user) {
  if (!user) return '/app'
  if (isAdmin(user)) return '/app'
  const pid = typeof user.permissionProfileId === 'string' ? user.permissionProfileId.trim() : ''
  if (pid) return '/app'
  if (user.starterAccess === true) return '/app/welcome'
  return '/app'
}

/**
 * @param {import('../config/roles.js').UserLike | null | undefined} user
 * @param {{ resolved: boolean, data: { pages?: Record<string, { visible?: boolean, actions?: Record<string, boolean> }> } | null }} profileState
 */
export function buildPermissionApi(user, profileState) {
  if (!user) {
    return {
      ready: true,
      usesProfile: false,
      canAccessPage: () => false,
      can: () => false,
      firstAccessiblePath: () => '/app',
    }
  }

  if (isAdmin(user)) {
    return {
      ready: true,
      usesProfile: false,
      canAccessPage: () => true,
      can: () => true,
      firstAccessiblePath: () => '/app',
    }
  }

  const pid = typeof user.permissionProfileId === 'string' ? user.permissionProfileId.trim() : ''

  if (pid) {
    const { resolved, data } = profileState || { resolved: false, data: null }
    if (!resolved) {
      return {
        ready: false,
        usesProfile: true,
        canAccessPage: () => false,
        can: () => false,
        firstAccessiblePath: () => '/app',
      }
    }

    if (!data || typeof data !== 'object') {
      return {
        ready: true,
        usesProfile: true,
        canAccessPage: () => true,
        can: () => true,
        firstAccessiblePath: () => '/app',
      }
    }

    return permissionApiFromPagesMap(data.pages, true)
  }

  if (user.starterAccess === true) {
    return permissionApiFromPagesMap(starterSyntheticPagesMap(), false)
  }

  return {
    ready: true,
    usesProfile: false,
    canAccessPage: () => true,
    can: () => true,
    firstAccessiblePath: () => '/app',
  }
}
