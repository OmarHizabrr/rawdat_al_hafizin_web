/**
 * الثلاثون جزءاً من المصحف — حدود السور والآيات وفق التقسيم المعروف للمصحف العُثماني.
 * يُستخدم للعرض والبحث فقط؛ القيمة المحفوظة في النموذج هي رقم الجزء (١–٣٠).
 */

/** تحويل الأرقام العربية إلى أرقام هندية شرقية */
export function toArabicIndicDigits(num) {
  const d = '٠١٢٣٤٥٦٧٨٩'
  return String(num).replace(/\d/g, (c) => d[Number(c)])
}

/** صياغة عدد السور بأسلوب عربي مقبول */
function surahCountPhrase(n) {
  if (n === 1) return 'سورة واحدة'
  if (n === 2) return 'سورتان'
  if (n >= 3 && n <= 10) return `${toArabicIndicDigits(n)} سور`
  return `${toArabicIndicDigits(n)} سورة`
}

/**
 * لكل جزء: عدد السور المختلفة التي يمر بها الجزء (جزئياً أو كاملة).
 * يُستخرج من حدود البداية والنهاية بين السور ١–١١٤.
 */
const SURAH_COUNT_BY_JUZ = [
  2, 1, 2, 2, 1, 2, 2, 2, 2, 2, 3, 2, 3, 2, 2, 3, 2, 3, 3, 3, 5, 4, 4, 3, 5, 6, 7, 9, 11, 37,
]

/**
 * أسماء السور من النبأ (٧٨) إلى الناس (١١٤) في جزء عمّ — للبحث في القائمة فقط، لا تُعرض في الواجهة.
 */
const JUZ_AMMA_SURAH_NAMES_FOR_SEARCH = [
  'النبأ',
  'النازعات',
  'عبس',
  'التكوير',
  'الانفطار',
  'المطففين',
  'الانشقاق',
  'البروج',
  'الطارق',
  'الأعلى',
  'الغاشية',
  'الفجر',
  'البلد',
  'الشمس',
  'الليل',
  'الضحى',
  'الشرح',
  'التين',
  'العلق',
  'القدر',
  'البينة',
  'الزلزلة',
  'العاديات',
  'القارعة',
  'التكاثر',
  'العصر',
  'الهمزة',
  'الفيل',
  'قريش',
  'الماعون',
  'الكوثر',
  'الكافرون',
  'النصر',
  'المسد',
  'الإخلاص',
  'الفلق',
  'الناس',
].join(' ')

/** صف واحد لكل جزء: عنوان مختصر للزر، عنوان كامل، والمدى النصي */
const JUZ_ROWS = [
  {
    juz: 1,
    range: 'من الفاتحة إلى البقرة (١٤١)',
    searchText: 'الفاتحة البقرة آلم جزء أول أولى',
  },
  {
    juz: 2,
    range: 'من البقرة (١٤٢) إلى البقرة (٢٥٢)',
    searchText: 'البقرة ثان ثاني',
  },
  {
    juz: 3,
    range: 'من البقرة (٢٥٣) إلى آل عمران (٩٢)',
    searchText: 'آل عمران ثالث ثالثة',
  },
  {
    juz: 4,
    range: 'من آل عمران (٩٣) إلى النساء (٢٣)',
    searchText: 'النساء رابع',
  },
  {
    juz: 5,
    range: 'من النساء (٢٤) إلى النساء (١٤٧)',
    searchText: 'النساء خامس',
  },
  {
    juz: 6,
    range: 'من النساء (١٤٨) إلى المائدة (٨١)',
    searchText: 'المائدة سادس سادسة',
  },
  {
    juz: 7,
    range: 'من المائدة (٨٢) إلى الأنعام (١١٠)',
    searchText: 'الأنعام سابع',
  },
  {
    juz: 8,
    range: 'من الأنعام (١١١) إلى الأعراف (٨٧)',
    searchText: 'الأعراف ثامن',
  },
  {
    juz: 9,
    range: 'من الأعراف (٨٨) إلى الأنفال (٤٠)',
    searchText: 'الأنفال تاسع',
  },
  {
    juz: 10,
    range: 'من الأنفال (٤١) إلى التوبة (٩٢)',
    searchText: 'التوبة عاشر عشرة',
  },
  {
    juz: 11,
    range: 'من التوبة (٩٣) إلى هود (٥)',
    searchText: 'هود يونس الحادي عشر',
  },
  {
    juz: 12,
    range: 'من هود (٦) إلى يوسف (٥٢)',
    searchText: 'يوسف ثاني عشر',
  },
  {
    juz: 13,
    range: 'من يوسف (٥٣) إلى إبراهيم (٥٢)',
    searchText: 'إبراهيم الرعد يوسف ثالث عشر',
  },
  {
    juz: 14,
    range: 'من الحجر (١) إلى النحل (١٢٨)',
    searchText: 'الحجر النحل رابع عشر',
  },
  {
    juz: 15,
    range: 'من الإسراء إلى الكهف (٧٤)',
    searchText: 'الإسراء الكهف خامس عشر',
  },
  {
    juz: 16,
    range: 'من الكهف (٧٥) إلى طه (١٣٥)',
    searchText: 'طه مريم سادس عشر',
  },
  {
    juz: 17,
    range: 'من الأنبياء إلى الحج',
    searchText: 'الأنبياء الحج سابع عشر',
  },
  {
    juz: 18,
    range: 'من المؤمنين إلى الفرقان (٢٠)',
    searchText: 'المؤمنون النور الفرقان ثامن عشر',
  },
  {
    juz: 19,
    range: 'من الفرقان (٢١) إلى النمل (٥٥)',
    searchText: 'الشعراء النمل تاسع عشر',
  },
  {
    juz: 20,
    range: 'من النمل (٥٦) إلى العنكبوت (٤٥)',
    searchText: 'القصص العنكبوت عشرون',
  },
  {
    juz: 21,
    range: 'من العنكبوت (٤٦) إلى الأحزاب (٣٠)',
    searchText: 'لقمان السجدة الأحزاب واحد وعشرون',
  },
  {
    juz: 22,
    range: 'من الأحزاب (٣١) إلى يس (٢٧)',
    searchText: 'سبأ فاطر يس اثنان وعشرون',
  },
  {
    juz: 23,
    range: 'من يس (٢٨) إلى الزمر (٣١)',
    searchText: 'الصافات الزمر ثلاثة وعشرون',
  },
  {
    juz: 24,
    range: 'من الزمر (٣٢) إلى فصلت (٤٦)',
    searchText: 'غافر فصلت أربعة وعشرون',
  },
  {
    juz: 25,
    range: 'من فصلت (٤٧) إلى الجاثية (٣٧)',
    searchText: 'الشورى الزخرف الجاثية خمسة وعشرون',
  },
  {
    juz: 26,
    range: 'من الأحقاف إلى الذاريات (٣٠)',
    searchText: 'محمد الفتح الذاريات ستة وعشرون',
  },
  {
    juz: 27,
    range: 'من الذاريات (٣١) إلى الحديد',
    searchText: 'القمر الرحمن الحديد سبعة وعشرون',
  },
  {
    juz: 28,
    range: 'من المجادلة إلى التحريم',
    searchText: 'المجادلة الجمعة ثمانية وعشرون',
  },
  {
    juz: 29,
    range: 'من الملك إلى المرسلات',
    searchText: 'الملك نوح القلم المرسلات تسعة وعشرون',
  },
  {
    juz: 30,
    range: 'من النبأ إلى الناس — جزء عمّ',
    searchText: 'عم عمّ جزء النبأ الناس قصار السور ثلاثون آخر المصحف',
  },
]

function buildRow(row, surahCount) {
  const jAr = toArabicIndicDigits(row.juz)
  const title = `الجزء ${jAr}`
  const withoutMin = row.range.replace(/^من /, '')
  const triggerLabel =
    row.juz === 30 ? `${jAr} — جزء عمّ (٣٧ سورة)` : `${jAr} — ${withoutMin.length > 56 ? `${withoutMin.slice(0, 54)}…` : withoutMin}`

  const searchParts = [title, row.range, row.searchText, jAr, 'جزء']
  if (row.juz === 30) searchParts.push(JUZ_AMMA_SURAH_NAMES_FOR_SEARCH)

  return {
    value: row.juz,
    triggerLabel,
    label: `${title} — ${row.range}`,
    detail: `${surahCountPhrase(surahCount)} · ${row.range}`,
    searchText: searchParts.filter(Boolean).join(' '),
  }
}

/** خيارات قائمة «مقدار الحفظ» لاستخدامها مع SearchableSelect */
export function getQuranMemorizedJuzOptions({ includeZero = false } = {}) {
  const out = []
  if (includeZero) {
    out.push({
      value: 0,
      triggerLabel: '٠ — غير محدد',
      label: '٠ — لم يُحدد عدد الأجزاء',
      detail: 'اختر هذا إن لم يكن التقدير متاحاً',
      searchText: 'صفر لا يوجد غير محدد',
    })
  }
  for (let i = 0; i < JUZ_ROWS.length; i += 1) {
    out.push(buildRow(JUZ_ROWS[i], SURAH_COUNT_BY_JUZ[i]))
  }
  return out
}
