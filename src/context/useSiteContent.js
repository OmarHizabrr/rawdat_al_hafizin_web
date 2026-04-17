import { useContext } from 'react'
import { SiteContentContext } from './siteContentContext.js'

export function useSiteContent() {
  const ctx = useContext(SiteContentContext)
  if (!ctx) {
    throw new Error('useSiteContent يجب أن يُستدعى داخل SiteContentProvider')
  }
  return ctx
}
