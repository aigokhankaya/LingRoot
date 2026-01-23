#!/bin/bash
# 🔊 Download Sound Effects Script
# 
# This script downloads free sound effects for LingRoot gamification.
# Source: Mixkit.co (Free for commercial use)
#
# Usage: bash download-sounds.sh

SOUNDS_DIR="frontend/public/sounds"

# Create directory if not exists
mkdir -p "$SOUNDS_DIR"

echo "🔊 Downloading gamification sound effects..."

# XP Gain - Coin sound
curl -L -o "$SOUNDS_DIR/xp-gain.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" 2>/dev/null

# Level Up - Achievement 
curl -L -o "$SOUNDS_DIR/level-up.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3" 2>/dev/null

# Achievement - Unlock sound
curl -L -o "$SOUNDS_DIR/achievement.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" 2>/dev/null

# Streak - Bonus sound
curl -L -o "$SOUNDS_DIR/streak.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3" 2>/dev/null

# Click - UI click
curl -L -o "$SOUNDS_DIR/click.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" 2>/dev/null

# Success - Positive notification
curl -L -o "$SOUNDS_DIR/success.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3" 2>/dev/null

# Error - Negative notification
curl -L -o "$SOUNDS_DIR/error.mp3" \
  "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3" 2>/dev/null

echo "✅ Sound effects downloaded to $SOUNDS_DIR"
echo ""
echo "Files created:"
ls -la "$SOUNDS_DIR"/*.mp3 2>/dev/null || echo "⚠️ No MP3 files found. Download may have failed."
echo ""
echo "💡 Note: These are preview files from Mixkit."
echo "   For production, download full versions from:"
echo "   - https://mixkit.co/free-sound-effects/game/"
echo "   - https://freesound.org/"
