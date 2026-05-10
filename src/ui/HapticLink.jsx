import { forwardRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { rhHapticNavigate } from '../utils/haptics.js'

/**
 * رابط React Router مع اهتزاز خفيف عند اللمس (نفس منطق التنقل في الشريط الجانبي).
 */
export const HapticLink = forwardRef(function HapticLink({ onPointerDown, ...props }, ref) {
  return (
    <Link
      ref={ref}
      {...props}
      onPointerDown={(e) => {
        rhHapticNavigate(e)
        onPointerDown?.(e)
      }}
    />
  )
})

export const HapticNavLink = forwardRef(function HapticNavLink({ onPointerDown, ...props }, ref) {
  return (
    <NavLink
      ref={ref}
      {...props}
      onPointerDown={(e) => {
        rhHapticNavigate(e)
        onPointerDown?.(e)
      }}
    />
  )
})
