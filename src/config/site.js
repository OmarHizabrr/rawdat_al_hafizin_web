/** عنوان الموقع العام (للروابط المطلقة ووسوم المشاركة). عند النشر على نطاق مخصص حدّث index.html و`.env`. */
export const SITE_ORIGIN =
  import.meta.env.VITE_SITE_ORIGIN ?? 'https://rawdat-al-hafizin-web.vercel.app'

export const SITE_NAME = 'روضة الحافظين'

export const SITE_TITLE = 'روضة الحافظين — برنامج تحفيظ السنة النبوية'

export const SITE_DESCRIPTION =
  'برنامج علمي متكامل لحفظ أحاديث السنة النبوية بجمع الشيخ يحيى بن عبد العزيز اليحيى، بمنهج متدرّج يبدأ بالصحيحين ويمتد لدواوين السنة المعتمدة.'

export const SITE_OG_IMAGE_PATH = '/logo.png'

export function absoluteUrl(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${SITE_ORIGIN}${path}`
}
