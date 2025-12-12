# Cloudflare Tunnel Integration

**Last Updated:** December 2025  
**Service:** Cloudflare Tunnel (cloudflared)  
**Files:** `setup-cloudflare-tunnel.ps1`, `test-cloudflare-tunnel.ps1`

## Overview

Cloudflare Tunnel provides secure, encrypted tunnels to expose local development servers to the internet without opening ports or configuring firewalls.

## Use Cases

1. **Local Development Testing** - Test mobile apps against local backend
2. **Demo Deployments** - Quick demos without full deployment
3. **Webhook Testing** - Receive webhooks from external services
4. **MFA Testing** - Test MFA flows with real callbacks

## Configuration

### Installation

```powershell
# Windows (Chocolatey)
choco install cloudflared

# Windows (Winget)
winget install Cloudflare.cloudflared

# macOS
brew install cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

### Authentication

```powershell
# Login to Cloudflare
cloudflared tunnel login

# This opens browser for authentication
# Saves certificate to ~/.cloudflared/cert.pem
```

### Create Tunnel

```powershell
# Create named tunnel
cloudflared tunnel create lingroot

# This creates:
# - Tunnel ID (UUID)
# - Credentials file (~/.cloudflared/<tunnel-id>.json)
```

### Configuration File

```yaml
# ~/.cloudflared/config.yml
tunnel: lingroot
credentials-file: /path/to/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: api.lingroot.example.com
    service: http://localhost:5001
  - hostname: web.lingroot.example.com
    service: http://localhost:3000
  - service: http_status:404
```

### DNS Configuration

```powershell
# Route DNS to tunnel
cloudflared tunnel route dns lingroot api.lingroot.example.com
cloudflared tunnel route dns lingroot web.lingroot.example.com
```

## Usage

### Start Tunnel

```powershell
# Start with config file
cloudflared tunnel run lingroot

# Or specify inline
cloudflared tunnel --url http://localhost:5001
```

### Quick Tunnel (No Setup)

```powershell
# Instant public URL (temporary)
cloudflared tunnel --url http://localhost:5001

# Output: https://random-words.trycloudflare.com
```

## Setup Script

```powershell
# setup-cloudflare-tunnel.ps1

param(
    [string]$TunnelName = "lingroot-mfa",
    [int]$BackendPort = 5001
)

Write-Host "Setting up Cloudflare Tunnel: $TunnelName"

# Check if cloudflared is installed
if (!(Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "Installing cloudflared..."
    choco install cloudflared -y
}

# Check if logged in
$certPath = "$env:USERPROFILE\.cloudflared\cert.pem"
if (!(Test-Path $certPath)) {
    Write-Host "Please login to Cloudflare..."
    cloudflared tunnel login
}

# Check if tunnel exists
$tunnels = cloudflared tunnel list 2>&1
if ($tunnels -notmatch $TunnelName) {
    Write-Host "Creating tunnel..."
    cloudflared tunnel create $TunnelName
}

# Create config
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
$config = @"
tunnel: $TunnelName
credentials-file: $env:USERPROFILE\.cloudflared\$TunnelName.json

ingress:
  - service: http://localhost:$BackendPort
"@

Set-Content -Path $configPath -Value $config

Write-Host "Setup complete! Run: cloudflared tunnel run $TunnelName"
```

## Environment Integration

### Backend Configuration

```env
# .env
CLOUDFLARE_TUNNEL_URL=https://api.lingroot.example.com
FRONTEND_URL=https://web.lingroot.example.com
```

### Frontend Configuration

```env
# .env.local
NEXT_PUBLIC_API_URL=https://api.lingroot.example.com
```

### CORS Configuration

```javascript
// server.js
const allowedOrigins = [
  'http://localhost:3000',
  'https://web.lingroot.example.com',
  process.env.FRONTEND_URL
].filter(Boolean);
```

## Testing

### Test Script

```powershell
# test-cloudflare-tunnel.ps1

param(
    [string]$TunnelUrl = "https://api.lingroot.example.com"
)

Write-Host "Testing Cloudflare Tunnel..."

# Health check
$response = Invoke-WebRequest -Uri "$TunnelUrl/api/health" -UseBasicParsing
if ($response.StatusCode -eq 200) {
    Write-Host "✓ Health check passed" -ForegroundColor Green
} else {
    Write-Host "✗ Health check failed" -ForegroundColor Red
}

# API test
try {
    $response = Invoke-RestMethod -Uri "$TunnelUrl/api/config/public" -Method Get
    Write-Host "✓ API accessible" -ForegroundColor Green
} catch {
    Write-Host "✗ API error: $_" -ForegroundColor Red
}
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `ERR_CONNECTION_REFUSED` | Backend not running | Start backend first |
| `502 Bad Gateway` | Backend crashed | Check backend logs |
| `DNS resolution failed` | DNS not propagated | Wait or use IP |
| `Tunnel not found` | Wrong tunnel name | Check `cloudflared tunnel list` |

### Debug Mode

```powershell
# Run with verbose logging
cloudflared tunnel --loglevel debug run lingroot
```

### Check Tunnel Status

```powershell
# List tunnels
cloudflared tunnel list

# Tunnel info
cloudflared tunnel info lingroot

# Check connections
cloudflared tunnel route ip show lingroot
```

## Security Considerations

1. **Access Control** - Use Cloudflare Access for authentication
2. **Tunnel Credentials** - Keep credentials file secure
3. **DNS Records** - Review DNS records regularly
4. **Logging** - Enable logging for audit trail
5. **Rotation** - Rotate tunnel credentials periodically

## Performance

- **Latency:** ~10-50ms overhead
- **Bandwidth:** No limits (Cloudflare plan dependent)
- **Concurrency:** Handles thousands of connections
- **Reliability:** Auto-reconnects on failure

## Related Documentation

- [Local Setup](../devops/local-setup.md)
- [Environment Variables](../devops/environment-variables.md)
- [MFA Integration](./mfa.md)
