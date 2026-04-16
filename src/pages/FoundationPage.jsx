import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_NAME, SITE_TITLE } from '../config/site.js'
import { Button, SearchableSelect, TextAreaField, TextField, useToast } from '../ui/index.js'

const STAGE_OPTIONS = [
  { value: 'sahihain', label: 'الجمع بين الصحيحين' },
  { value: 'bukhari', label: 'مفردات البخاري' },
  { value: 'muslim', label: 'مفردات مسلم' },
  { value: 'abidawud', label: 'زوائد أبي داود' },
  { value: 'tirmidhi', label: 'زوائد الترمذي' },
  { value: 'other', label: 'مراحل أخرى' },
]

export default function FoundationPage() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [stage, setStage] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    document.title = `أساس الواجهة — ${SITE_TITLE}`
  }, [])

  const nameError = useMemo(() => {
    if (!showErrors) return ''
    if (!name.trim()) return 'الرجاء إدخال الاسم'
    return ''
  }, [name, showErrors])

  const stageError = useMemo(() => {
    if (!showErrors) return ''
    if (!stage) return 'الرجاء اختيار مرحلة من القائمة'
    return ''
  }, [stage, showErrors])

  const validateDemo = () => {
    setShowErrors(true)
    if (!name.trim() || !stage) {
      toast.warning('يرجى تصحيح الحقول المطلوبة قبل المتابعة.', 'تنبيه')
      return
    }
    toast.success('هذا مثال فقط — النموذج صالح وجاهز للربط لاحقاً.', 'تم بنجاح')
  }

  return (
    <div className="page foundation-page">
      <header className="foundation-header">
        <div className="foundation-header-inner">
          <Link to="/" className="foundation-back">
            ← العودة للرئيسية
          </Link>
          <h1>أساس الواجهة</h1>
          <p className="foundation-lead">
            حقول موحّدة، قائمة منسدلة قابلة للبحث، أزرار بأنماط متعددة، ورسائل للمستخدم — جاهزة للبناء عليها في {SITE_NAME}.
          </p>
        </div>
      </header>

      <main className="content foundation-content">
        <section className="card">
          <h2>الحقول</h2>
          <TextField
            label="الاسم"
            placeholder="مثال: فلان الفلاني"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="يظهر نص المساعدة تحت الحقل عند عدم وجود خطأ."
            error={nameError}
            required
            autoComplete="name"
          />
          <SearchableSelect
            label="المرحلة الدراسية"
            options={STAGE_OPTIONS}
            value={stage}
            onChange={setStage}
            placeholder="اختر المرحلة"
            searchPlaceholder="ابحث باسم المرحلة…"
            emptyText="لا توجد مرحلة مطابقة"
            hint="يمكن البحث بالكتابة ثم الاختيار من لوحة المفاتيح أو الفأرة."
            error={stageError}
            required
          />
          <TextAreaField
            label="ملاحظات (اختياري)"
            placeholder="أي ملاحظات للفريق…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
          <div className="foundation-actions">
            <Button type="button" variant="primary" onClick={validateDemo}>
              تحقق وإظهار رسالة
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowErrors(false)}>
              إخفاء أخطاء العرض
            </Button>
          </div>
        </section>

        <section className="card">
          <h2>الأزرار</h2>
          <div className="foundation-button-row">
            <Button variant="primary">أساسي</Button>
            <Button variant="secondary">ثانوي</Button>
            <Button variant="ghost">شفاف</Button>
            <Button variant="danger">تنبيه خطر</Button>
          </div>
          <div className="foundation-button-row">
            <Button variant="primary" size="sm">
              صغير
            </Button>
            <Button variant="secondary" size="md">
              وسط
            </Button>
            <Button variant="ghost" size="lg">
              كبير
            </Button>
          </div>
        </section>

        <section className="card">
          <h2>رسائل المستخدم (Toast)</h2>
          <p className="lead">استخدم <code className="inline-code">useToast()</code> من أي صفحة داخل التطبيق.</p>
          <div className="foundation-button-row foundation-button-row--wrap">
            <Button variant="secondary" onClick={() => toast.success('تم حفظ التقدم بنجاح.', 'تم')}>
              نجاح
            </Button>
            <Button variant="secondary" onClick={() => toast.info('يمكنك المتابعة لاحقاً من نفس النقطة.', 'معلومة')}>
              معلومة
            </Button>
            <Button variant="secondary" onClick={() => toast.warning('تحقق من الاتصال ثم أعد المحاولة.', 'تنبيه')}>
              تنبيه
            </Button>
            <Button variant="danger" onClick={() => toast.danger('تعذر إتمام العملية. جرّب لاحقاً.', 'خطأ')}>
              خطأ
            </Button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          <Link to="/">الرئيسية</Link>
        </p>
      </footer>
    </div>
  )
}
