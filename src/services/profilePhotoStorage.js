import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase.js'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** مسار موحّد: users_profile_media/{userId}/… — يجب أن تطابق قواعد Storage */
export function assertProfilePhotoFile(file) {
  if (!file || !(file instanceof File)) {
    throw new Error('PROFILE_PHOTO_INVALID')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('PROFILE_PHOTO_TOO_LARGE')
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('PROFILE_PHOTO_TYPE')
  }
}

function extensionForFile(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  return 'jpg'
}

/**
 * رفع صورة الملف الشخصي إلى Storage وإرجاع رابط التحميل.
 * @param {string} userId صاحب الصورة (مسار التخزين)
 */
export async function uploadUserProfileAvatar(userId, file) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('PROFILE_PHOTO_INVALID')
  }
  assertProfilePhotoFile(file)
  const ext = extensionForFile(file)
  const objectPath = `users_profile_media/${userId}/avatar_${Date.now()}.${ext}`
  const storageRef = ref(storage, objectPath)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}

/** رسالة عربية لأخطاء التحقق من الملف (قبل/أثناء الرفع) */
export function messageForProfilePhotoError(err) {
  const code = typeof err === 'string' ? err : err?.message
  switch (code) {
    case 'PROFILE_PHOTO_TOO_LARGE':
      return 'حجم الصورة يزيد عن 2 ميجابايت.'
    case 'PROFILE_PHOTO_TYPE':
      return 'يُسمح بصور ‎JPEG أو PNG أو WebP أو GIF فقط.'
    case 'PROFILE_PHOTO_INVALID':
      return 'ملف غير صالح.'
    default:
      return null
  }
}
