import admin from 'firebase-admin'
import { config } from './env.js'

// Initialize Firebase Admin SDK
// Ideally, use a service account key file properly secured or environment variables
// For this environment, we'll assume application default credentials or a service account path in env
// If no service account is provided, it might fall back to Google Cloud default credentials if running on GCP

import { readFileSync } from 'fs'
import { join } from 'path'

try {
  let serviceAccount = null;

  if (config.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      // Resolve path relative to project root (where package.json is)
      const serviceAccountPath = join(process.cwd(), config.FIREBASE_SERVICE_ACCOUNT_PATH);
      const fileContent = readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log('🔑 Loaded Service Account from:', serviceAccountPath);
    } catch (err) {
      console.warn('⚠️ Could not load service account file:', err.message);
    }
  }

  const adminConfig = {
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    databaseURL: config.FIREBASE_DATABASE_URL
  };

  if (!admin.apps.length) {
    admin.initializeApp(adminConfig);
    console.log('🔥 Firebase Admin Initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin Initialization Error:', error);
}

export const auth = admin.auth();
export const db = admin.firestore();
export const rtdb = admin.database();

export default admin;
