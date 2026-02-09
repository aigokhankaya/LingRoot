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
  let val = process.env[envVar];
  if (!val) continue;
  // Strip surrounding quotes that users may paste from Railway Raw Editor
  val = val.trim();
  if ((val.startsWith('\"') && val.endsWith('\"')) || (val.startsWith(\"'\") && val.endsWith(\"'\"))) {
    val = val.slice(1, -1);
  }
  fs.writeFileSync('/etc/secrets/' + fileName, val);
  console.log('[start.sh] Written ' + fileName);
  // Validate JSON
  try {
    JSON.parse(val);
    console.log('[start.sh] Valid JSON: ' + fileName);
  } catch (e) {
    console.error('[start.sh] WARNING: ' + fileName + ' is not valid JSON: ' + e.message);
  }
}
"

exec node server.js
