import {
  BookOpenText,
  Compass,
  LibraryBig,
  Sparkles,
  Sprout,
  Target,
  Users,
} from 'lucide-react'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const SECTION_ICONS = {
  intro: BookOpenText,
  goals: Target,
  approach: Compass,
  content: LibraryBig,
  features: Sparkles,
  audience: Users,
  message: Sprout,
}

const sections = [
  {
    id: 'intro',
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
    title: 'أهداف البرنامج',
    list: ['العناية بالسنة النبوية', 'تمكين الطالب من حفظ أكبر قدر من الأحاديث الصحيحة'],
  },
  {
    id: 'approach',
    title: 'منهج البرنامج',
    paragraphs: [
      'يقوم البرنامج على: التدرّج العلمي من الأصح إلى ما دونه، وجمع الأحاديث دون تكرار قدر الإمكان، والتركيز على دواوين السنة المعتمدة.',
      'ويبدأ بـ: الجمع بين صحيح البخاري وصحيح مسلم، ثم الانتقال إلى الزوائد وبقية كتب السنة.',
    ],
  },
  {
    id: 'content',
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
    title: 'مميزات البرنامج',
    list: [
      'الاعتماد على أصح مصادر السنة',
      'ترتيب علمي متقن ومتدرّج مع حذف التكرار والأسانيد واعتماد الروايات الجامعة',
      'مناسب لجميع طلاب العلم',
    ],
  },
  {
    id: 'audience',
    title: 'الفئة المستهدفة',
    list: ['طلاب وطالبات العلم الشرعي', 'الراغبون في حفظ السنة النبوية'],
  },
  {
    id: 'message',
    title: 'رسالة البرنامج',
    body: <p className="lead emphasis">الإسهام في تخريج جيلٍ مرتبطٍ بسنة النبي ﷺ.</p>,
  },
]

export function ProgramSections({ className = '' }) {
  return (
    <div className={className}>
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.id]
        return (
          <section key={s.id} id={s.id} className="card">
            <h2>
              <span className="card-icon" aria-hidden>
                {Icon ? <RhIcon as={Icon} size={22} strokeWidth={RH_ICON_STROKE} /> : null}
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
        )
      })}
    </div>
  )
}
