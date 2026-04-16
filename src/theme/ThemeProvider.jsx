import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './themeContext.js'
import { readStoredTheme, systemPrefersDark, writeStoredTheme } from './themeStorage.js'

const META_THEME = {
  light: '#f8f9fa',
  dark: '#131314',
}

function applyDomTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? META_THEME.dark : META_THEME.light)
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readStoredTheme())
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? systemPrefersDark() : false,
  )

  const resolved = useMemo(() => {
    if (preference === 'dark') return 'dark'
    if (preference === 'light') return 'light'
    return systemDark ? 'dark' : 'light'
  }, [preference, systemDark])

  useEffect(() => {
    applyDomTheme(resolved)
  }, [resolved])

  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystemDark(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const setPreference = useCallback((pref) => {
    setPreferenceState(pref)
    writeStoredTheme(pref)
    if (pref === 'system') {
      setSystemDark(systemPrefersDark())
    }
  }, [])

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolved,
    }),
    [preference, setPreference, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
