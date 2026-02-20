import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
}

let app;
let auth;
let db;
let rtdb;
let googleProvider;

const isConfigured = !!firebaseConfig.apiKey;

if (isConfigured) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    rtdb = getDatabase(app)
    googleProvider = new GoogleAuthProvider()
} else {
    console.warn('⚠️ Firebase config missing! Using mock objects to prevent crash.')
    app = {}
    // Mock Auth
    auth = {
        currentUser: null,
        onAuthStateChanged: (cb) => { cb(null); return () => { } },
        signInWithPopup: async () => { throw new Error('Firebase not configured') },
        signOut: async () => { }
    }
    // Mock Firestore
    const mockCollection = () => ({
        doc: () => ({
            get: async () => ({ exists: false, data: () => ({}) }),
            set: async () => { },
            update: async () => { },
            onSnapshot: () => () => { }
        }),
        where: () => ({ get: async () => ({ forEach: () => { } }) }),
        add: async () => { }
    })
    db = { collection: mockCollection }
    // Mock RTDB
    rtdb = { ref: () => ({ onValue: () => { }, set: async () => { } }) }
    googleProvider = {}
}

export { auth, db, rtdb, googleProvider }
export default app
