export function ScrollArea({ children, className = '', maxHeight, padded = false }) {
  return (
    <div
      className={['ui-scroll', padded ? 'ui-scroll--padded' : '', className].filter(Boolean).join(' ')}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  )
}
