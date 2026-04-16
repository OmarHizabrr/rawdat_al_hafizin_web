// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCNgJVGz_SQK1ukAjcDcgOvlUfbjaX_07A',
  authDomain: 'rawdat-al-hafizin.firebaseapp.com',
  projectId: 'rawdat-al-hafizin',
  storageBucket: 'rawdat-al-hafizin.firebasestorage.app',
  messagingSenderId: '54372707069',
  appId: '1:54372707069:web:0ebaa35d0f00c122fb6c94',
  measurementId: 'G-G5HR1WKHMB',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export { app, analytics }
