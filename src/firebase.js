// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: 'AIzaSyCNgJVGz_SQK1ukAjcDcgOvlUfbjaX_07A',
  authDomain: 'rawdat-al-hafizin.firebaseapp.com',
  projectId: 'rawdat-al-hafizin',
  storageBucket: 'rawdat-al-hafizin.firebasestorage.app',
  messagingSenderId: '54372707069',
  appId: '1:54372707069:web:0ebaa35d0f00c122fb6c94',
  measurementId: 'G-G5HR1WKHMB',
}

const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const auth = getAuth(app)
const storage = getStorage(app)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export { app, analytics, auth, googleProvider, storage }
