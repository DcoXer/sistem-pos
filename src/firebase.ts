import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyD8uY0lGmdRIfUjE-XbXcfxQG2sKkkferY",
  authDomain: "sistem-pos-46818.firebaseapp.com",
  projectId: "sistem-pos-46818",
  storageBucket: "sistem-pos-46818.firebasestorage.app",
  messagingSenderId: "125130283825",
  appId: "1:125130283825:web:9cb973b275144bd1d4ae10",
  measurementId: "G-T6H0NDHE34"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const appId = firebaseConfig.projectId

// Aktifkan offline persistence — data cached lokal di IndexedDB browser
// Kalau sinyal jelek, Firestore baca dari cache dulu, tidak trigger snapshot kosong
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence hanya bisa aktif di satu tab
    console.warn('[Firestore] Persistence gagal: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    // Browser lama tidak support IndexedDB
    console.warn('[Firestore] Persistence tidak didukung browser ini')
  }
})
