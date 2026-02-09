#!/bin/sh
# Railway Secret Files Startup Script
# Writes JSON credentials from env vars to /etc/secrets/ before starting the server.
# This replicates Render's "Secret Files" feature for Railway compatibility.

set -e

mkdir -p /etc/secrets

if [ -n "$FIREBASE_FCM_JSON" ]; then
  printf '%s' "$FIREBASE_FCM_JSON" > /etc/secrets/firebase-fcm.json
  echo "[start.sh] Written firebase-fcm.json"
fi

if [ -n "$GOOGLE_PLAY_SA_JSON" ]; then
  printf '%s' "$GOOGLE_PLAY_SA_JSON" > /etc/secrets/google-play-service-account.json
  echo "[start.sh] Written google-play-service-account.json"
fi

if [ -n "$GOOGLE_TTS_KEY_JSON" ]; then
  printf '%s' "$GOOGLE_TTS_KEY_JSON" > /etc/secrets/google-tts-key.json
  echo "[start.sh] Written google-tts-key.json"
fi

exec node server.js
