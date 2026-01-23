// Firebase Admin initializer for server-side FCM usage
// This module centralizes firebase-admin initialization so that
// pushNotification and other utilities can safely import a single instance.

const admin = require('firebase-admin');
const logger = require('../common/logger.js');

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized) {
    return admin;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
      // Prefer explicit service account file for FCM
      const svc = require(process.env.FIREBASE_SERVICE_ACCOUNT_FILE);
      admin.initializeApp({
        credential: admin.credential.cert(svc),
      });
      logger.info('[FirebaseAdmin] Initialized from FIREBASE_SERVICE_ACCOUNT_FILE', {
        file: process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
        projectId: svc.project_id,
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Fallback: service account JSON provided inline via env var
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(svc),
      });
      logger.info('[FirebaseAdmin] Initialized from FIREBASE_SERVICE_ACCOUNT env', {
        projectId: svc.project_id,
      });
    } else {
      // Final fallback: GOOGLE_APPLICATION_CREDENTIALS / default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      logger.info('[FirebaseAdmin] Initialized from applicationDefault() credentials');
    }
    isInitialized = true;
  } catch (err) {
    logger.error('[FirebaseAdmin] Failed to initialize firebase-admin:', err);
  }

  return admin;
}

function getMessaging() {
  const app = initFirebaseAdmin();
  try {
    return app.messaging();
  } catch (err) {
    logger.error('[FirebaseAdmin] messaging() not available:', err);
    return null;
  }
}

module.exports = {
  initFirebaseAdmin,
  getMessaging,
};
