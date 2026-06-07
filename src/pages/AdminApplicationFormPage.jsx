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
import {
  APPLICATION_FORM_FIELD_TYPE_OPTIONS,
  applicationFormFieldTypeHint,
  applicationFormFieldTypeLabel,
  resolveApplicationFormFieldTypeIcon,
} from '../data/applicationFormFieldTypes.js'
import { DEFAULT_APPLICATION_FORM_FIELDS } from '../data/defaultApplicationFormFields.js'
import { APPLICATION_FORM_LEGACY_KEY_OPTIONS } from '../data/applicationFormLegacyKeys.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { saveApplicationFormFields } from '../services/siteConfigService.js'
import {
  fieldOptionsToText,
  normalizeApplicationFormField,
  parseFieldOptionsText,
  sortApplicationFormFields,
  buildDefaultFormValues,
} from '../utils/applicationFormFields.js'
import { ApplicationFormRenderer } from '../components/application/ApplicationFormRenderer.jsx'
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

const OPTION_TYPES = new Set(['select', 'multi_select', 'radio', 'checkbox_group'])
const NUMBER_TYPES = new Set(['number', 'quran_juz'])
const PLACEHOLDER_TYPES = new Set(['text', 'textarea', 'url', 'select', 'multi_select', 'quran_juz'])

const PLACEHOLDER_EXAMPLES = {
  text: 'مثال: أدخل اسمك الرباعي',
  textarea: 'اكتب تفاصيلك هنا…',
  url: 'https://example.com',
  select: 'اختر من القائمة…',
  multi_select: 'اختر واحداً أو أكثر…',
  quran_juz: 'اختر عدد الأجزاء',
}

function emptyField(order = 0) {
  return normalizeApplicationFormField(
    {
      id: firestoreApi.getNewId('app_form_field'),
      order,
      label: '',
      type: 'text',
      required: false,
      enabled: true,
      legacyKey: '',
      hint: '',
      placeholder: '',
      options: [],
      min: null,
      max: null,
      bindUserEmail: false,
      minQuranJuz: null,
    },
    order,
  )
}

export default function AdminApplicationFormPage() {
  const { user } = useAuth()
  const { branding, applicationFormFields, hasCustomApplicationFormFields } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(() => emptyField())
  const [optionsText, setOptionsText] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [seedSubmitting, setSeedSubmitting] = useState(false)
  const [reorderBusy, setReorderBusy] = useState(false)

  useEffect(() => {
    document.title = `حقول طلب الالتحاق — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    setRows(applicationFormFields.map((f, i) => normalizeApplicationFormField(f, i)))
  }, [applicationFormFields])

  const sorted = useMemo(() => sortApplicationFormFields(rows), [rows])

  const fieldStats = useMemo(() => {
    const enabled = sorted.filter((r) => r.enabled)
    return {
      total: sorted.length,
      enabled: enabled.length,
      hidden: sorted.length - enabled.length,
      required: enabled.filter((r) => r.required).length,
    }
  }, [sorted])

  const previewField = useMemo(() => {
    if (!editorOpen) return null
    return normalizeApplicationFormField({
      ...draft,
      options: OPTION_TYPES.has(draft.type) ? parseFieldOptionsText(optionsText) : draft.options,
    })
  }, [editorOpen, draft, optionsText])

  const previewValues = useMemo(() => {
    if (!previewField) return {}
    return buildDefaultFormValues([previewField])
  }, [previewField])

  const persistRows = useCallback(
    async (nextRows, successMsg) => {
      if (!user) return false
      setSaveSubmitting(true)
      try {
        await saveApplicationFormFields(user, nextRows)
        if (successMsg) toast.success(successMsg, 'تم')
        return true
      } catch {
        toast.warning('تعذّر الحفظ. تحقق من صلاحيات المشرف.', 'تنبيه')
        return false
      } finally {
        setSaveSubmitting(false)
      }
    },
    [user, toast],
  )

  const openAdd = () => {
    const order = sorted.length ? Math.max(...sorted.map((r) => r.order)) + 1 : 0
    setDraft(emptyField(order))
    setOptionsText('')
    setEditorOpen(true)
  }

  const openEdit = (row) => {
    const n = normalizeApplicationFormField(row)
    setDraft(n)
    setOptionsText(fieldOptionsToText(n.options))
    setEditorOpen(true)
  }

  const handleSaveDraft = async () => {
    const id = String(draft.id || '').trim()
    if (!/^[a-z][a-z0-9_]*$/i.test(id)) {
      toast.warning('رمز الحقل الداخلي غير صالح. استخدم حروفاً إنجليزية وأرقاماً فقط.', 'تنبيه')
      return
    }
    if (!String(draft.label || '').trim()) {
      toast.warning('أدخل تسمية الحقل.', 'تنبيه')
      return
    }
    const normalized = normalizeApplicationFormField({
      ...draft,
      id,
      options: OPTION_TYPES.has(draft.type) ? parseFieldOptionsText(optionsText) : draft.options,
    })
    const exists = sorted.some((r) => r.id === normalized.id)
    const next = exists
      ? sorted.map((r) => (r.id === normalized.id ? normalized : r))
      : [...sorted, normalized]
    const ok = await persistRows(next, exists ? 'تم تحديث الحقل.' : 'تمت إضافة الحقل.')
    if (ok) setEditorOpen(false)
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteSubmitting(true)
    try {
      const next = sorted.filter((r) => r.id !== deleting.id)
      const ok = await persistRows(next, 'تم حذف الحقل.')
      if (ok) setDeleting(null)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleSeedDefaults = async () => {
    if (!user) return
    setSeedSubmitting(true)
    try {
      await saveApplicationFormFields(user, DEFAULT_APPLICATION_FORM_FIELDS)
      toast.success('تم استيراد الحقول الافتراضية للاستمارة.', 'تم')
    } catch {
      toast.warning('تعذّر الاستيراد.', 'تنبيه')
    } finally {
      setSeedSubmitting(false)
    }
  }

  const moveRow = async (rowId, direction) => {
    const list = sortApplicationFormFields(sorted)
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
    await persistRows(next, row.enabled ? 'تم إخفاء الحقل.' : 'تم إظهار الحقل.')
  }

  const DraftTypeIcon = resolveApplicationFormFieldTypeIcon(draft.type)
  const showOptions = OPTION_TYPES.has(draft.type)
  const showNumberBounds = NUMBER_TYPES.has(draft.type)
  const showMinQuran = draft.type === 'quran_juz'
  const showPlaceholder = PLACEHOLDER_TYPES.has(draft.type)
  const placeholderExample = PLACEHOLDER_EXAMPLES[draft.type] || 'نص يظهر داخل الحقل قبل الكتابة'

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app/admin/applications', label: 'طلبات الالتحاق' },
    { to: '/app/application', label: 'صفحة الطلب' },
  ]

  return (
    <div className="rh-admin-program-blocks rh-admin-app-form-fields">
      <header className="rh-admin-program-blocks__hero card">
        <div className="rh-admin-program-blocks__head-row">
          <HapticLink to="/app/admin" className="rh-admin-program-blocks__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} aria-hidden />
            لوحة التحكم
          </HapticLink>
        </div>
        <h1 className="rh-admin-program-blocks__title">حقول استمارة طلب الالتحاق</h1>
        <p className="rh-admin-program-blocks__desc">
          أضف ورتّب حقول صفحة طلب الالتحاق: نوع الحقل، إلزامي أو اختياري، وخيارات القوائم. التغييرات تظهر مباشرة
          للطلاب وللفريق عند مراجعة الطلبات.
          {!hasCustomApplicationFormFields ? (
            <> حالياً تُستخدم <strong>الحقول الافتراضية</strong> — اضغط «استيراد الافتراضي» للتخصيص.</>
          ) : null}
        </p>
        <CrossNav items={crossItems} className="rh-admin-program-blocks__cross" />
      </header>

      <section className="rh-admin-program-blocks__toolbar card rh-admin-app-form-fields__toolbar">
        <div className="rh-admin-app-form-fields__toolbar-actions">
          <Button type="button" variant="primary" icon={Plus} onClick={openAdd}>
            حقل جديد
          </Button>
          <Button type="button" variant="secondary" icon={RefreshCw} loading={seedSubmitting} onClick={handleSeedDefaults}>
            استيراد الافتراضي
          </Button>
        </div>
        {sorted.length > 0 ? (
          <div className="rh-admin-app-form-fields__stats" aria-label="إحصاء الحقول">
            <span className="rh-admin-app-form-fields__stat">
              <strong>{fieldStats.enabled}</strong> ظاهر
            </span>
            <span className="rh-admin-app-form-fields__stat">
              <strong>{fieldStats.required}</strong> إلزامي
            </span>
            {fieldStats.hidden > 0 ? (
              <span className="rh-admin-app-form-fields__stat rh-admin-app-form-fields__stat--muted">
                <strong>{fieldStats.hidden}</strong> مخفي
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="rh-admin-program-blocks__table-wrap card">
        {sorted.length === 0 ? (
          <p className="rh-admin-program-blocks__empty">لا توجد حقول. أضف حقلاً أو استورد الافتراضي.</p>
        ) : (
          <table className="rh-admin-program-blocks__table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">الحقل</th>
                <th scope="col">النوع</th>
                <th scope="col">إلزامي</th>
                <th scope="col">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const TypeIcon = resolveApplicationFormFieldTypeIcon(row.type)
                return (
                  <tr key={row.id} className={row.enabled ? '' : 'rh-admin-program-blocks__row--muted'}>
                    <td>
                      <div className="rh-admin-program-blocks__order">
                        <span>{row.order + 1}</span>
                        <div className="rh-admin-program-blocks__order-btns">
                          <button type="button" className="rh-admin-program-blocks__order-btn" disabled={idx === 0 || reorderBusy} aria-label="أعلى" onClick={() => void moveRow(row.id, 'up')}>
                            <RhIcon as={ArrowUp} size={14} strokeWidth={2.25} />
                          </button>
                          <button type="button" className="rh-admin-program-blocks__order-btn" disabled={idx === sorted.length - 1 || reorderBusy} aria-label="أسفل" onClick={() => void moveRow(row.id, 'down')}>
                            <RhIcon as={ArrowDown} size={14} strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rh-admin-program-blocks__title-cell">
                        <strong>{row.label}</strong>
                        <span className="rh-admin-users__code">{row.id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="rh-admin-program-blocks__title-cell">
                        <span className="rh-admin-program-blocks__row-icon rh-admin-program-blocks__row-icon--mode" aria-hidden>
                          <RhIcon as={TypeIcon} size={16} strokeWidth={RH_ICON_STROKE} />
                        </span>
                        <span>{applicationFormFieldTypeLabel(row.type)}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={[
                          'rh-admin-app-form-fields__badge',
                          row.required ? 'rh-admin-app-form-fields__badge--required' : 'rh-admin-app-form-fields__badge--optional',
                        ].join(' ')}
                      >
                        {row.required ? 'إلزامي' : 'اختياري'}
                      </span>
                    </td>
                    <td>
                      <div className="rh-admin-program-blocks__actions">
                        <Button type="button" size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(row)}>
                          تعديل
                        </Button>
                        <Button type="button" size="sm" variant="ghost" icon={EyeOff} onClick={() => void toggleEnabled(row)}>
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

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={draft.label ? 'تعديل حقل' : 'حقل جديد'} size="lg">
        <div className="rh-admin-app-form-fields__editor">
          <div className="rh-admin-program-blocks__form rh-admin-app-form-fields__editor-form">
          <TextField
            label="اسم الحقل كما يظهر للطالب"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            required
            placeholder="مثال: الوظيفة الحالية"
          />
          <SearchableSelect
            label="نوع الحقل"
            value={draft.type}
            onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
            options={APPLICATION_FORM_FIELD_TYPE_OPTIONS}
            placeholder="اختر نوع الحقل"
            searchPlaceholder="ابحث عن نوع…"
          />
          <div className="rh-admin-program-blocks__icon-preview" aria-hidden>
            <RhIcon as={DraftTypeIcon} size={28} strokeWidth={RH_ICON_STROKE} />
            <span>{applicationFormFieldTypeHint(draft.type)}</span>
          </div>
          <TextField
            label="شرح إضافي تحت الحقل (اختياري)"
            value={draft.hint}
            onChange={(e) => setDraft((d) => ({ ...d, hint: e.target.value }))}
            placeholder="مثال: اختر آخر جزء أنجزته حفظاً"
          />
          {showPlaceholder ? (
            <TextField
              label="نص توضيحي داخل الحقل (اختياري)"
              value={draft.placeholder}
              onChange={(e) => setDraft((d) => ({ ...d, placeholder: e.target.value }))}
              placeholder={placeholderExample}
              hint="يظهر بلون خافت داخل الحقل قبل أن يكتب الطالب."
            />
          ) : null}
          {showOptions ? (
            <TextAreaField
              label="خيارات الاختيار"
              hint="كل سطر = خيار واحد. يمكنك كتابة الاسم فقط، أو: القيمة|الاسم الظاهر"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              rows={6}
              placeholder={'ذكر\nأنثى\nأو: أمي|لا أقرأ ولا أكتب'}
            />
          ) : null}
          {showNumberBounds ? (
            <div className="rh-admin-app-form-fields__bounds">
              <NumberStepField label="الحد الأدنى" value={draft.min ?? 0} min={0} max={9999} onChange={(v) => setDraft((d) => ({ ...d, min: v }))} />
              <NumberStepField label="الحد الأقصى" value={draft.max ?? 9999} min={0} max={9999} onChange={(v) => setDraft((d) => ({ ...d, max: v }))} />
            </div>
          ) : null}
          {showMinQuran ? (
            <NumberStepField
              label="الحد الأدنى للقبول (أجزاء)"
              hint="مثلاً 30 — يُرفض الطلب إن كان أقل."
              value={draft.minQuranJuz ?? 30}
              min={0}
              max={30}
              onChange={(v) => setDraft((d) => ({ ...d, minQuranJuz: v }))}
            />
          ) : null}
          <SearchableSelect
            label="ربط ببيانات النظام (اختياري)"
            value={draft.legacyKey || ''}
            onChange={(v) => setDraft((d) => ({ ...d, legacyKey: v || '' }))}
            options={APPLICATION_FORM_LEGACY_KEY_OPTIONS}
            placeholder="اختر إن كان يطابق حقلاً قديماً"
            searchPlaceholder="ابحث عن اسم الحقل…"
            hint="يساعد على ظهور البيانات في التقارير والتصدير. اختر «لا ربط» للحقول الجديدة."
          />
          <NumberStepField label="ترتيب الظهور في الاستمارة" value={draft.order} min={0} max={999} onChange={(v) => setDraft((d) => ({ ...d, order: v }))} />
          <label className="rh-app-form__checkbox-item rh-admin-app-form-fields__check-row">
            <input type="checkbox" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} />
            <span>حقل إلزامي — لا يُرسل الطلب بدونه</span>
          </label>
          {draft.type === 'email' ? (
            <label className="rh-app-form__checkbox-item rh-admin-app-form-fields__check-row">
              <input type="checkbox" checked={draft.bindUserEmail} onChange={(e) => setDraft((d) => ({ ...d, bindUserEmail: e.target.checked }))} />
              <span>أخذ البريد من حساب Google (للقراءة فقط)</span>
            </label>
          ) : null}

          <details className="rh-admin-app-form-fields__advanced">
            <summary>إعدادات تقنية (للمشرف المتقدم)</summary>
            <TextField
              label="رمز الحقل الداخلي"
              value={draft.id}
              onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value.replace(/\s/g, '_') }))}
              hint="لا تغيّره بعد حفظ بيانات الطلاب إلا للضرورة."
              dir="ltr"
            />
          </details>
          <div className="rh-admin-program-blocks__form-actions">
            <Button type="button" variant="primary" icon={Save} loading={saveSubmitting} onClick={() => void handleSaveDraft()}>
              حفظ
            </Button>
            <Button type="button" variant="ghost" icon={X} disabled={saveSubmitting} onClick={() => setEditorOpen(false)}>
              إلغاء
            </Button>
          </div>
          </div>

          {previewField?.label ? (
            <aside className="rh-admin-app-form-fields__preview card" aria-label="معاينة الحقل">
              <h3 className="rh-admin-app-form-fields__preview-title">معاينة للطالب</h3>
              <p className="rh-admin-app-form-fields__preview-desc">هكذا سيظهر الحقل في صفحة طلب الالتحاق.</p>
              <ApplicationFormRenderer
                fields={[previewField]}
                values={previewValues}
                onChange={() => {}}
                className="rh-admin-app-form-fields__preview-form"
              />
            </aside>
          ) : null}
        </div>
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="حذف الحقل">
        <p>حذف «{deleting?.label}»؟ لن تُحذف بيانات الطلاب المحفوظة سابقاً.</p>
        <div className="rh-admin-program-blocks__form-actions">
          <Button type="button" variant="danger" icon={Trash2} loading={deleteSubmitting} onClick={() => void handleDelete()}>
            حذف
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setDeleting(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
