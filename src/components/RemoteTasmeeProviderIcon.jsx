import { remoteTasmeeProviderLucideIcon } from '../utils/remoteTasmeeProviderIcons.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/**
 * @param {{ provider: string, size?: number, className?: string, style?: import('react').CSSProperties, title?: string, 'aria-hidden'?: boolean }} props
 */
export function RemoteTasmeeProviderIcon({ provider, size = 18, className, style, title, 'aria-hidden': ariaHidden }) {
  const Cmp = remoteTasmeeProviderLucideIcon(provider)
  return (
    <RhIcon
      as={Cmp}
      size={size}
      strokeWidth={RH_ICON_STROKE}
      className={className}
      style={style}
      title={title}
      aria-hidden={ariaHidden}
    />
  )
}
