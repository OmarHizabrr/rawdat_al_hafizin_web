import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CrossNav } from '../components/CrossNav.jsx'
import { PROGRAM_BLOCK_CONTENT_MODE_OPTIONS, programBlockContentModeHint, programBlockContentModeLabel, resolveProgramBlockContentModeIcon } from '../data/programBlockContentModes.js'
import { PROGRAM_BLOCK_ICON_OPTIONS, resolveProgramBlockIcon } from '../data/programBlockIcons.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { saveProgramBlocks } from '../services/siteConfigService.js'
import {
  buildDefaultProgramBlocksForSeed,
  buildProgramBlocksFromStrings,
  normalizeProgramBlock,
  sortProgramBlocks,
} from '../utils/programBlocks.js'
import { firestoreApi } from '../services/firestoreApi.js'
import {
  Button,
  Modal,
  NumberStepField,
  SearchableSelect,
  TextAreaField,
  TextField,
  useToast,
} from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function emptyBlock(order = 0) {
  return normalizeProgramBlock(
    {
      id: firestoreApi.getNewId('program_blocks'),
      order,
      title: '',
      icon: 'BookOpenText',
      contentMode: 'lead',
      body: '',
      enabled: true,
    },
    order,
  )
}

export default function AdminProgramBlocksPage() {
  const { user } = useAuth()
  const { branding, programBlocks, hasCustomProgramBlocks, str } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(() => emptyBlock())
  const [deleting, setDeleting] = useState(null)
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [seedSubmitting, setSeedSubmitting] = useState(false)
  const [reorderBusy, setReorderBusy] = useState(false)

  useEffect(() => {
    document.title = `أقسام البداية — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    setRows(programBlocks.map((b, i) => normalizeProgramBlock(b, i)))
  }, [programBlocks])

  const sorted = useMemo(() => sortProgramBlocks(rows), [rows])

  const persistRows = useCallback(
    async (nextRows, successMsg) => {
      if (!user) return false
      setSaveSubmitting(true)
      try {
        await saveProgramBlocks(user, nextRows)
        if (successMsg) toast.success(successMsg, 'تم')
        return true
      } catch {
        toast.warning('تعذّر الحفظ. تحقق من صلاحيات المشرف والاتصال.', 'تنبيه')
        return false
      } finally {
        setSaveSubmitting(false)
      }
    },
    [user, toast],
  )

  const openAdd = () => {
    const order = sorted.length ? Math.max(...sorted.map((r) => r.order)) + 1 : 0
    setDraft(emptyBlock(order))
    setEditorOpen(true)
  }

  const openEdit = (row) => {
    setDraft(normalizeProgramBlock(row))
    setEditorOpen(true)
  }

  const handleSaveDraft = async () => {
    if (!String(draft.title || '').trim()) {
      toast.warning('أدخل عنوان القسم.', 'تنبيه')
      return
    }
    const normalized = normalizeProgramBlock(draft)
    const exists = sorted.some((r) => r.id === normalized.id)
    const next = exists
      ? sorted.map((r) => (r.id === normalized.id ? normalized : r))
      : [...sorted, normalized]
    const ok = await persistRows(next, exists ? 'تم تحديث القسم.' : 'تمت إضافة القسم.')
    if (ok) setEditorOpen(false)
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteSubmitting(true)
    try {
      const next = sorted.filter((r) => r.id !== deleting.id)
      const ok = await persistRows(next, 'تم حذف القسم.')
      if (ok) setDeleting(null)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleSeedDefaults = async () => {
    if (!user) return
    setSeedSubmitting(true)
    try {
      await saveProgramBlocks(user, buildDefaultProgramBlocksForSeed())
      toast.success('تم استيراد الأقسام السبعة الافتراضية.', 'تم')
    } catch {
      toast.warning('تعذّر الاستيراد.', 'تنبيه')
    } finally {
      setSeedSubmitting(false)
    }
  }

  const handleImportFromStrings = async () => {
    if (!user) return
    setSeedSubmitting(true)
    try {
      await saveProgramBlocks(user, buildProgramBlocksFromStrings(str))
      toast.success('تم استيراد الأقسام من النصوص الثابتة الحالية.', 'تم')
    } catch {
      toast.warning('تعذّر الاستيراد.', 'تنبيه')
    } finally {
      setSeedSubmitting(false)
    }
  }

  const moveRow = async (rowId, direction) => {
    const list = sortProgramBlocks(sorted)
    const idx = list.findIndex((r) => r.id === rowId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) return
    const reordered = [...list]
    const [item] = reordered.splice(idx, 1)
    reordered.splice(swapIdx, 0, item)
    const next = reordered.map((r, i) => ({ ...r, order: i }))
    setReorderBusy(true)
    try {
      await persistRows(next)
    } finally {
      setReorderBusy(false)
    }
  }

  const toggleEnabled = async (row) => {
    const next = sorted.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r))
    await persistRows(next, row.enabled ? 'تم إخفاء القسم.' : 'تم إظهار القسم.')
  }

  const contentHint = programBlockContentModeHint(draft.contentMode)
  const DraftIcon = resolveProgramBlockIcon(draft.icon)

  const crossItems = [
    { to: '/app/admin', label: str('layout.nav_admin') },
    { to: '/app/welcome', label: 'صفحة البداية' },
    { to: '/app/admin/copy', label: 'النصوص الثابتة' },
  ]

  const usingCustomBlocks = hasCustomProgramBlocks

  return (
    <div className="rh-admin-program-blocks">
      <header className="rh-admin-program-blocks__hero card">
        <div className="rh-admin-program-blocks__head-row">
          <HapticLink to="/app/admin" className="rh-admin-program-blocks__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} aria-hidden />
            {str('layout.nav_admin')}
          </HapticLink>
        </div>
        <h1 className="rh-admin-program-blocks__title">أقسام صفحة البداية</h1>
        <p className="rh-admin-program-blocks__desc">
          أضف ورتّب أقسام صفحة <strong>البداية</strong> والصفحة العامة: عنوان، أيقونة، ونوع المحتوى (نقاط أو فقرات أو
          نص سردي). التغييرات تظهر مباشرة للزوار.
          {!usingCustomBlocks ? (
            <>
              {' '}
              حالياً تُعرض الأقسام من <strong>النصوص الثابتة</strong> — اضغط «استيراد» لبدء التخصيص من لوحة هذه
              الصفحة.
            </>
          ) : null}
        </p>
        <CrossNav items={crossItems} className="rh-admin-program-blocks__cross" />
      </header>

      <section className="rh-admin-program-blocks__toolbar card">
        <Button type="button" variant="primary" icon={Plus} onClick={openAdd}>
          قسم جديد
        </Button>
        <Button type="button" variant="secondary" icon={RefreshCw} loading={seedSubmitting} onClick={handleSeedDefaults}>
          استيراد الافتراضي
        </Button>
        <Button
          type="button"
          variant="secondary"
          icon={RefreshCw}
          loading={seedSubmitting}
          onClick={handleImportFromStrings}
        >
          استيراد من النصوص الحالية
        </Button>
      </section>

      <div className="rh-admin-program-blocks__table-wrap card">
        {sorted.length === 0 ? (
          <p className="rh-admin-program-blocks__empty">لا توجد أقسام بعد. أضف قسماً أو استورد الافتراضي.</p>
        ) : (
          <table className="rh-admin-program-blocks__table">
            <thead>
              <tr>
                <th scope="col">الترتيب</th>
                <th scope="col">القسم</th>
                <th scope="col">نوع المحتوى</th>
                <th scope="col">الحالة</th>
                <th scope="col">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const RowIcon = resolveProgramBlockIcon(row.icon)
                return (
                  <tr key={row.id} className={row.enabled ? '' : 'rh-admin-program-blocks__row--muted'}>
                    <td>
                      <div className="rh-admin-program-blocks__order">
                        <span>{row.order + 1}</span>
                        <div className="rh-admin-program-blocks__order-btns">
                          <button
                            type="button"
                            className="rh-admin-program-blocks__order-btn"
                            disabled={idx === 0 || reorderBusy || saveSubmitting}
                            aria-label="تحريك لأعلى"
                            onClick={() => void moveRow(row.id, 'up')}
                          >
                            <RhIcon as={ArrowUp} size={14} strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            className="rh-admin-program-blocks__order-btn"
                            disabled={idx === sorted.length - 1 || reorderBusy || saveSubmitting}
                            aria-label="تحريك لأسفل"
                            onClick={() => void moveRow(row.id, 'down')}
                          >
                            <RhIcon as={ArrowDown} size={14} strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rh-admin-program-blocks__title-cell">
                        <span className="rh-admin-program-blocks__row-icon" aria-hidden>
                          <RhIcon as={RowIcon} size={18} strokeWidth={RH_ICON_STROKE} />
                        </span>
                        <strong>{row.title}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="rh-admin-program-blocks__title-cell">
                        {(() => {
                          const ModeIcon = resolveProgramBlockContentModeIcon(row.contentMode)
                          return (
                            <span className="rh-admin-program-blocks__row-icon rh-admin-program-blocks__row-icon--mode" aria-hidden>
                              <RhIcon as={ModeIcon} size={16} strokeWidth={RH_ICON_STROKE} />
                            </span>
                          )
                        })()}
                        <span>{programBlockContentModeLabel(row.contentMode)}</span>
                      </div>
                    </td>
                    <td>{row.enabled ? 'ظاهر' : 'مخفي'}</td>
                    <td>
                      <div className="rh-admin-program-blocks__actions">
                        <Button type="button" size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(row)}>
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          icon={EyeOff}
                          onClick={() => void toggleEnabled(row)}
                        >
                          {row.enabled ? 'إخفاء' : 'إظهار'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleting(row)}>
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={draft.id ? 'تعديل قسم' : 'قسم جديد'} size="lg" contentClassName="ui-modal__content--plan-members">
        <div className="rh-plan-members-modal__body">
          <div className="rh-admin-program-blocks__form">
          <TextField
            label="عنوان القسم"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="مثال: التعريف بالبرنامج"
          />
          <SearchableSelect
            label="الأيقونة"
            value={draft.icon}
            onChange={(v) => setDraft((d) => ({ ...d, icon: v }))}
            options={PROGRAM_BLOCK_ICON_OPTIONS}
            searchPlaceholder="ابحث عن أيقونة…"
          />
          <div className="rh-admin-program-blocks__icon-preview" aria-hidden>
            <RhIcon as={DraftIcon} size={28} strokeWidth={RH_ICON_STROKE} />
            <span>معاينة الأيقونة</span>
          </div>
          <SearchableSelect
            label="نوع المحتوى"
            value={draft.contentMode}
            onChange={(v) => setDraft((d) => ({ ...d, contentMode: v }))}
            options={PROGRAM_BLOCK_CONTENT_MODE_OPTIONS}
            searchPlaceholder="ابحث عن نوع المحتوى…"
          />
          <TextAreaField
            label="المحتوى"
            hint={contentHint}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            rows={8}
          />
          <NumberStepField
            label="ترتيب الظهور في الصفحة"
            value={draft.order}
            onChange={(n) => setDraft((d) => ({ ...d, order: n }))}
            min={0}
            max={999}
          />
          </div>
        </div>
        <div className="rh-modal-footer rh-admin-program-blocks__form-actions">
          <Button type="button" variant="primary" icon={Save} loading={saveSubmitting} onClick={() => void handleSaveDraft()}>
            حفظ
          </Button>
          <Button type="button" variant="ghost" icon={X} disabled={saveSubmitting} onClick={() => setEditorOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="حذف القسم">
        <p>هل تريد حذف «{deleting?.title}»؟</p>
        <div className="rh-modal-footer rh-admin-program-blocks__form-actions">
          <Button type="button" variant="danger" icon={Trash2} loading={deleteSubmitting} onClick={() => void handleDelete()}>
            حذف
          </Button>
          <Button type="button" variant="ghost" icon={X} disabled={deleteSubmitting} onClick={() => setDeleting(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
