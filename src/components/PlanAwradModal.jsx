import { useEffect, useMemo, useState } from 'react'
import { Modal, ScrollArea } from '../ui/index.js'
import { subscribeAwrad } from '../utils/awradStorage.js'

function asDate(v) {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-SA')
}

/**
 * نافذة تعرض أوراد خطة محددة لمستخدم محدد (للمعاينة من الإدارة أو من بطاقة الخطة).
 */
export function PlanAwradModal({ open, onClose, userId, plan }) {
  const [awrad, setAwrad] = useState([])

  useEffect(() => {
    if (!open || !userId) return
    const unsub = subscribeAwrad(userId, setAwrad)
    return () => unsub()
  }, [open, userId])

  const rows = useMemo(() => {
    const pid = plan?.id
    if (!pid) return []
    return awrad.filter((w) => w.planId === pid)
  }, [awrad, plan?.id])

  if (!plan) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`أوراد الخطة: ${plan.name || plan.id}`}
      size="md"
      className="ui-modal--raised"
    >
      <p className="rh-plan-peek__hint">
        السجلات المرتبطة بهذه الخطة فقط — مرتبة من الأحدث.
      </p>
      <ScrollArea className="rh-plan-peek__scroll" padded maxHeight="min(52dvh, 420px)">
        <ul className="rh-plan-peek__list">
          {rows.length === 0 ? (
            <li className="rh-plan-peek__empty">لا توجد أوراد مسجّلة لهذه الخطة.</li>
          ) : (
            rows.map((w) => (
              <li key={w.id} className="rh-plan-peek__item">
                <strong>{w.pagesCount} صفحات</strong>
                <span>{asDate(w.recordedAt)}</span>
                {w.mode === 'range' && w.fromPage != null && w.toPage != null && (
                  <span>
                    من {w.fromPage} إلى {w.toPage}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </Modal>
  )
}
