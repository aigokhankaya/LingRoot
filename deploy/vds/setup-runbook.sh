#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# LingRoot VDS Setup Runbook
# Target: Vulut VDS10 (4 Core / 10 GB / 100 GB NVMe)
# OS: Ubuntu 22.04 LTS
# ═══════════════════════════════════════════════════════
#
# This script is a REFERENCE runbook — run steps manually
# or adapt for your automation tool (Ansible, etc.)
#
# Prerequisites:
#   - SSH access to VDS with root/sudo
#   - DNS A records for signoz.lingroot.com, otel.lingroot.com, mfa.lingroot.com
#   - .env file filled with actual values

set -euo pipefail

VDS_IP="${VDS_IP:?Set VDS_IP}"
DEPLOY_USER="lingroot"

echo "═══════════════════════════════════════════════"
echo " Step 1: System Setup"
echo "═══════════════════════════════════════════════"

# Update system
# sudo apt update && sudo apt upgrade -y

# Install Docker
# curl -fsSL https://get.docker.com | sh
# sudo usermod -aG docker $DEPLOY_USER

# Install Docker Compose v2 (usually bundled with Docker now)
# docker compose version

# Install Nginx + Certbot
# sudo apt install -y nginx certbot python3-certbot-nginx

# Install Node.js 20 LTS (for MFA server)
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt install -y nodejs

echo "═══════════════════════════════════════════════"
echo " Step 2: Firewall (UFW)"
echo "═══════════════════════════════════════════════"

# sudo ufw default deny incoming
# sudo ufw default allow outgoing
# sudo ufw allow 22/tcp    # SSH
# sudo ufw allow 80/tcp    # HTTP (certbot)
# sudo ufw allow 443/tcp   # HTTPS
# sudo ufw enable

echo "═══════════════════════════════════════════════"
echo " Step 3: SigNoz Installation"
echo "═══════════════════════════════════════════════"

# Clone SigNoz
# mkdir -p /opt/lingroot && cd /opt/lingroot
# git clone -b main https://github.com/SigNoz/signoz.git
# cd signoz/deploy/docker/clickhouse-setup/

# Copy override file (resource limits)
# cp /path/to/deploy/vds/docker-compose.override.yml .

# Copy custom OTel Collector config
# cp /path/to/deploy/vds/otel-collector-config.yaml /opt/lingroot/signoz/

# Set OTEL_AUTH_TOKEN in the environment
# export OTEL_AUTH_TOKEN="your-strong-random-token"

# Start SigNoz
# docker compose -f docker-compose.yaml -f docker-compose.override.yml up -d

# Verify: curl http://localhost:8080 → SigNoz UI

echo "═══════════════════════════════════════════════"
echo " Step 4: MFA Service Setup"
echo "═══════════════════════════════════════════════"

# Copy MFA project files
# mkdir -p /opt/lingroot/mfa
# scp -r mfa/* $DEPLOY_USER@$VDS_IP:/opt/lingroot/mfa/

# Install dependencies
# cd /opt/lingroot/mfa && npm install --production

# Pull MFA Docker image (for alignment jobs)
# docker pull mmcauliffe/montreal-forced-aligner

# Download MFA models (acoustic + dictionary)
# mkdir -p /opt/lingroot/mfa-models/{acoustic,dictionary}
# MFA will auto-download on first use, or pre-download:
# docker run --rm -v /opt/lingroot/mfa-models:/mfa-models \
#   mmcauliffe/montreal-forced-aligner \
#   mfa model download acoustic english_mfa
# docker run --rm -v /opt/lingroot/mfa-models:/mfa-models \
#   mmcauliffe/montreal-forced-aligner \
#   mfa model download dictionary english_mfa

# Install systemd service
# sudo cp /path/to/deploy/vds/mfa.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl enable mfa
# sudo systemctl start mfa

# Verify: curl http://localhost:5002/health → {"status":"ok"}

echo "═══════════════════════════════════════════════"
echo " Step 5: Nginx + SSL"
echo "═══════════════════════════════════════════════"

# Copy Nginx config
# sudo cp /path/to/deploy/vds/nginx/lingroot-vds.conf /etc/nginx/sites-available/
# sudo ln -s /etc/nginx/sites-available/lingroot-vds.conf /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificates
# sudo certbot --nginx \
#   -d signoz.lingroot.com \
#   -d otel.lingroot.com \
#   -d mfa.lingroot.com

# Verify:
# curl https://signoz.lingroot.com → SigNoz login page
# curl https://mfa.lingroot.com/health → {"status":"ok"}
# curl -X POST https://otel.lingroot.com/v1/traces → 200 or 400 (expected)

echo "═══════════════════════════════════════════════"
echo " Step 6: Backend Environment Update (Render)"
echo "═══════════════════════════════════════════════"

# Add these to Render backend environment variables:
#
# OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.lingroot.com
# OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <your-OTEL_AUTH_TOKEN>
# OTEL_SERVICE_NAME=lingroot-backend
# MFA_SERVICE_URL=https://mfa.lingroot.com
#
# After deploy, check SigNoz:
#   Services → lingroot-backend should appear with traces

echo "═══════════════════════════════════════════════"
echo " Step 7: SigNoz Dashboard Import"
echo "═══════════════════════════════════════════════"

# In SigNoz UI (signoz.lingroot.com):
#
# 1. Go to Dashboards → New Dashboard → Import
# 2. Import each JSON from deploy/vds/signoz/dashboards/:
#    - api-overview.json      → API Overview
#    - llm-costs.json         → LLM & API Costs
#    - client-errors.json     → Client Errors
#    - tts-pipeline.json      → TTS Pipeline
#
# Note: SigNoz may require adjusting queries to match your
# exact schema version. Test each panel after import.

echo "═══════════════════════════════════════════════"
echo " Step 8: SigNoz Alert Setup"
echo "═══════════════════════════════════════════════"

# In SigNoz UI (signoz.lingroot.com):
#
# 1. Go to Settings → Alert Channels → Add Slack Channel
#    - Webhook URL: your Slack webhook URL
#    - Channel Name: #lingroot-alerts
#
# 2. Go to Alerts → New Alert → Create from alert-rules.json definitions:
#
#    Alert 1: High Error Rate (>5%)
#    - Source: Traces
#    - Query: countIf(statusCode >= 500) * 100.0 / count(*)
#    - Filter: serviceName = lingroot-backend, kind = Server
#    - Condition: > 5
#    - Window: 5 minutes
#    - Channel: Slack
#
#    Alert 2: High P95 Latency (>5s)
#    - Source: Traces
#    - Query: quantile(0.95)(durationNano) / 1e9
#    - Filter: serviceName = lingroot-backend, kind = Server
#    - Condition: > 5
#    - Window: 5 minutes
#    - Channel: Slack
#
#    Alert 3: Daily LLM Cost (>$2)
#    - Source: Metrics
#    - Metric: llm_cost_usd (sum)
#    - Condition: > 2.0
#    - Window: 24 hours
#    - Frequency: 30 minutes
#    - Channel: Slack
#
#    Alert 4: Client Error Spike (>10 in 5min)
#    - Source: Traces
#    - Query: count(*) where name LIKE 'client-error.%'
#    - Condition: > 10
#    - Window: 5 minutes
#    - Channel: Slack
#
#    Alert 5: TTS Failure Rate (>10%)
#    - Source: Traces
#    - Query: countIf(hasError = true) * 100.0 / count(*)
#    - Filter: name LIKE '%tts%', kind = Client
#    - Condition: > 10
#    - Window: 10 minutes
#    - Channel: Slack
#
#    Alert 6: MFA Service Unhealthy
#    - Source: Traces
#    - Query: countIf(hasError = true) where name LIKE '%mfa%'
#    - Condition: > 3
#    - Window: 5 minutes
#    - Channel: Slack

echo "═══════════════════════════════════════════════"
echo " Step 9: Verification Checklist"
echo "═══════════════════════════════════════════════"

# □ SigNoz UI accessible at signoz.lingroot.com
# □ MFA health check at mfa.lingroot.com/health
# □ OTel Collector accepting data at otel.lingroot.com
# □ Backend traces visible in SigNoz (lingroot-backend service)
# □ Winston logs visible in SigNoz Logs tab
# □ Exceptions visible in SigNoz Exceptions tab
# □ llm_cost_usd metric visible in SigNoz Metrics
# □ All 4 dashboards imported and panels rendering data
# □ All 6 alerts created and test notification sent
# □ Cloudflare Tunnel stopped (MFA now via VDS)
# □ Backend MFA_SERVICE_URL updated to mfa.lingroot.com
# □ UFW firewall active (only 22, 80, 443 open)

echo ""
echo "Setup complete. Monitor SigNoz for incoming telemetry data."
