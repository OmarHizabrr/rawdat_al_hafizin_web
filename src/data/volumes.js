/** مجلدات البرنامج مع عدد الصفحات لكل مجلد */
export const VOLUMES = [
  { id: 'j1', label: 'المجلد الأول (الصحيحان)', pages: 188 },
  { id: 'j2', label: 'المجلد الثاني', pages: 193 },
  { id: 'j3', label: 'المجلد الثالث', pages: 211 },
  { id: 'j4', label: 'المجلد الرابع', pages: 176 },
  { id: 'muf-bukhari', label: 'مفردات البخاري', pages: 176 },
  { id: 'muf-muslim', label: 'مفردات مسلم', pages: 214 },
  { id: 'z-abidawud-1', label: 'زوائد أبي داود (١)', pages: 271 },
  { id: 'z-abidawud-2', label: 'زوائد أبي داود (٢)', pages: 276 },
  { id: 'z-tirmidhi', label: 'زوائد الترمذي', pages: 224 },
  { id: 'z-nasaai', label: 'زوائد النسائي وابن ماجه والدارمي', pages: 142 },
  { id: 'masanid', label: 'المسانيد', pages: 319 },
  { id: 'sihah', label: 'الصحاح والمعاجم', pages: 138 },
]

export const VOLUME_BY_ID = Object.fromEntries(VOLUMES.map((v) => [v.id, v]))
