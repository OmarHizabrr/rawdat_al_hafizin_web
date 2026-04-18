import { useContext } from 'react'
import { PermissionsContext } from './permissionsContext.js'

export function usePermissions() {
  return useContext(PermissionsContext)
}
