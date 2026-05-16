import { Compass } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { usePermissions } from '../../context/usePermissions.js'
import { Button } from '../../ui/index.js'
import { EXPLORE_KIND_CONFIG } from './explorePublicKinds.js'

const ExplorePublicModal = lazy(() =>
  import('./ExplorePublicModal.jsx').then((m) => ({ default: m.ExplorePublicModal })),
)

/**
 * زر استكشاف العامة — يظهر فقط لمن تملك صلاحية صفحة الاستكشاف (canAccessPage).
 * @param {object} props
 * @param {import('./explorePublicKinds.js').ExploreKind} props.kind
 * @param {string} props.label
 * @param {string} [props.className]
 * @param {'primary'|'secondary'} [props.variant]
 * @param {boolean} [props.open] — تحكم خارجي اختياري
 * @param {(open: boolean) => void} [props.onOpenChange]
 */
export function ExplorePublicTrigger({
  kind,
  label,
  className = '',
  variant = 'secondary',
  open: controlledOpen,
  onOpenChange,
}) {
  const { canAccessPage } = usePermissions()
  const config = EXPLORE_KIND_CONFIG[kind]
  const [internalOpen, setInternalOpen] = useState(false)

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  if (!canAccessPage(config.permissionPageId)) return null

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={['rh-plans__explore-link', className].filter(Boolean).join(' ')}
        icon={Compass}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <ExplorePublicModal kind={kind} open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  )
}
