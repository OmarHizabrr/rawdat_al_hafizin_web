export const THEME_STORAGE_KEY = 'rh.theme'

export function readStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

export function writeStoredTheme(pref) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
