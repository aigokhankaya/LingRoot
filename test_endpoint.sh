#!/bin/bash

# Test the my-features endpoint
# Replace YOUR_TOKEN with actual JWT token from mobile app

TOKEN="YOUR_TOKEN_HERE"

echo "Testing /api/subscriptions/my-features endpoint..."
curl -X GET \
  https://lingloops-backend.onrender.com/api/subscriptions/my-features \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo "Testing /api/health endpoint..."
curl -X GET \
  https://lingloops-backend.onrender.com/api/health \
  -v
