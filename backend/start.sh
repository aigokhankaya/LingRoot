#!/bin/sh
# Railway Secret Files Startup Script
# Writes JSON credentials from env vars to /etc/secrets/ before starting the server.
# This replicates Render's "Secret Files" feature for Railway compatibility.
# Uses Node.js to avoid shell interpretation of JSON special characters.

node -e "
const fs = require('fs');
fs.mkdirSync('/etc/secrets', { recursive: true });
const mapping = {
  FIREBASE_FCM_JSON: 'firebase-fcm.json',
  GOOGLE_PLAY_SA_JSON: 'google-play-service-account.json',
  GOOGLE_TTS_KEY_JSON: 'google-tts-key.json'
};
for (const [envVar, fileName] of Object.entries(mapping)) {
  if (process.env[envVar]) {
    fs.writeFileSync('/etc/secrets/' + fileName, process.env[envVar]);
    console.log('[start.sh] Written ' + fileName);
  }
}
"

exec node server.js
