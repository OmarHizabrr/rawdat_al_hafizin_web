import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase.js'

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

/** تحديث الاسم وصورة الملف في Firebase Auth (المستخدم الحالي فقط) */
export async function updateFirebaseAuthProfile(firebaseUser, { displayName, photoURL }) {
  if (!firebaseUser) return
  const name = typeof displayName === 'string' ? displayName.trim() : ''
  const photo = typeof photoURL === 'string' ? photoURL.trim() : ''
  await updateProfile(firebaseUser, {
    displayName: name || firebaseUser.displayName || '',
    photoURL: photo || '',
  })
}
