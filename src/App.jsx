import { useCallback } from 'react'

const sections = [
  {
    id: 'intro',
    icon: '📘',
    title: 'التعريف بالبرنامج',
    body: (
      <>
        <p className="lead">
          برنامج تحفيظ السنة النبوية بجمع الشيخ يحيى بن عبد العزيز اليحيى هو برنامج علمي متكامل
          يُعنى بحفظ أحاديث السنة النبوية وفق منهجٍ متدرّج، يبدأ بأصح كتب السنة، ثم يتوسّع ليشمل
          بقية دواوين الحديث، مع اعتماد الجمع بين الروايات وحذف التكرار والأسانيد، ليكون الحافظ على
          صلةٍ مباشرة بأكبر قدر ممكن من كلام النبي ﷺ.
        </p>
      </>
    ),
  },
  {
    id: 'goals',
    icon: '🎯',
    title: 'أهداف البرنامج',
    list: ['العناية بالسنة النبوية', 'تمكين الطالب من حفظ أكبر قدر من الأحاديث الصحيحة'],
  },
  {
    id: 'approach',
    icon: '🧭',
    title: 'منهج البرنامج',
    paragraphs: [
      'يقوم البرنامج على: التدرّج العلمي من الأصح إلى ما دونه، وجمع الأحاديث دون تكرار قدر الإمكان، والتركيز على دواوين السنة المعتمدة.',
      'ويبدأ بـ: الجمع بين صحيح البخاري وصحيح مسلم، ثم الانتقال إلى الزوائد وبقية كتب السنة.',
    ],
  },
  {
    id: 'content',
    icon: '📚',
    title: 'محتوى البرنامج',
    list: [
      'الجمع بين الصحيحين (أربع مجلدات)',
      'مفردات البخاري',
      'مفردات مسلم',
      'زوائد أبي داود (مجلدان)',
      'زوائد الترمذي',
      'زوائد النسائي وابن ماجه والدارمي',
      'المسانيد',
      'الصحاح والمعاجم',
    ],
  },
  {
    id: 'features',
    icon: '🌟',
    title: 'مميزات البرنامج',
    list: [
      'الاعتماد على أصح مصادر السنة',
      'ترتيب علمي متقن ومتدرّج مع حذف التكرار والأسانيد واعتماد الروايات الجامعة',
      'مناسب لجميع طلاب العلم',
    ],
  },
  {
    id: 'audience',
    icon: '👥',
    title: 'الفئة المستهدفة',
    list: ['طلاب وطالبات العلم الشرعي', 'الراغبون في حفظ السنة النبوية'],
  },
  {
    id: 'message',
    icon: '🌱',
    title: 'رسالة البرنامج',
    body: <p className="lead emphasis">الإسهام في تخريج جيلٍ مرتبطٍ بسنة النبي ﷺ.</p>,
  },
]

export default function App() {
  const scrollToJourney = useCallback(() => {
    document.getElementById('start-journey')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-inner">
          <img className="logo" src="/logo.png" alt="شعار روضة الحافظين" width={120} height={120} />
          <p className="eyebrow">بجمع الشيخ يحيى بن عبد العزيز اليحيى</p>
          <h1>روضة الحافظين</h1>
          <p className="subtitle">برنامج تحفيظ السنة النبوية — منصة ويب تدعم الهاتف والمتصفح</p>
          <button type="button" className="cta" onClick={scrollToJourney}>
            ابدأ رحلتك إلى هنا
          </button>
        </div>
      </header>

      <main className="content">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="card">
            <h2>
              <span className="card-icon" aria-hidden>
                {s.icon}
              </span>
              {s.title}
            </h2>
            {s.body}
            {s.paragraphs?.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section id="start-journey" className="card cta-panel" aria-label="بداية الرحلة">
          <h2>بداية رحلتك</h2>
          <p>هنا نضع لك خطوتك الأولى؛ أخبرنا بالتفاصيل القادمة لنكمل المسارات والتسجيل.</p>
        </section>
      </main>

      <footer className="footer">
        <p>روضة الحافظين — برنامج تحفيظ السنة النبوية</p>
      </footer>
    </div>
  )
}
