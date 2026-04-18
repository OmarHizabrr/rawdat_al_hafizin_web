import { createContext } from 'react'

export const PermissionsContext = createContext({
  ready: true,
  usesProfile: false,
  canAccessPage: () => true,
  can: () => true,
  firstAccessiblePath: () => '/app',
})
