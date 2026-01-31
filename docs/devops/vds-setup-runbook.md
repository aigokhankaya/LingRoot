# LingRoot VDS Kurulum Plani — Adim Adim Uygulama

> **Created:** 2026-01-31 | **Updated:** 2026-01-31 | **Version:** 3.1

**Durum:** VDS satin alindi (Vulut VDS10, Ubuntu 22.04). Kod altyapisi hazir (Faz 1-6 tamamlandi). Simdi VDS fiziksel kurulumu yapilacak.

**VDS Bilgileri:**
- **IP Adresi:** `45.43.154.97`
- **SSH Portu:** `25416`
- **SSH Baglanti:** `ssh root@45.43.154.97 -p 25416`

---

## On Kosullar

- [x] VDS satin alindi
- [x] SSH ile baglanabiliyor (`ssh root@45.43.154.97 -p 25416`)
- [x] Ubuntu 22.04 LTS
- [ ] DNS A kayitlari (signoz/otel/mfa.lingroot.com → 45.43.154.97)

## DNS Notu

Ana `lingroot.com` ve `www.lingroot.com` kayitlarina **dokunulmayacak**. Sadece 3 yeni subdomain A kaydi eklenecek:

```
signoz.lingroot.com  →  A  →  45.43.154.97
otel.lingroot.com    →  A  →  45.43.154.97
mfa.lingroot.com     →  A  →  45.43.154.97
```

Bu islem DNS saglayicinin (Cloudflare, Namecheap, vs.) panelinde yapilacak. Mevcut kayitlara dokunulmadigi icin web sitesi etkilenmez.

---

## Adim 0: VDS IP Adresi (TAMAMLANDI)

**VDS IP:** `45.43.154.97` | **SSH Portu:** `25416`

SSH baglantisi: `ssh root@45.43.154.97 -p 25416`

> **ONEMLI:** IP adresi `45.43.154.97`'dir. Port numarasi `25416` sadece SSH baglantisi icindir. DNS kayitlarina, scp komutlarina vs. **port yazilmaz**, sadece IP yazilir.

---

## Adim 1: DNS Kayitlarini Ekle

**Nerede:** Domain saglayicinin DNS paneli (Cloudflare, Namecheap, vs.)

3 adet A record ekle:

| Host | Type | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| `signoz` | A | `45.43.154.97` | DNS only (gri bulut) | Auto |
| `otel` | A | `45.43.154.97` | DNS only (gri bulut) | Auto |
| `mfa` | A | `45.43.154.97` | DNS only (gri bulut) | Auto |

> **DIKKAT:** Deger alanina **SADECE** `45.43.154.97` yazilacak. Port numarasi (`:25416`) **YAZILMAYACAK**. A kaydi sadece IP adresi kabul eder.

**Cloudflare ayarlari:**
- Proxy: **DNS only** (gri bulut), turuncu bulut DEGIL — cunku Nginx kendi SSL'ini yonetecek
- Cloudflare "Bu kayit signoz.lingroot.com uzerinde mi olmali?" diye sorarsa → **Evet** sec

**Dogrulama:**
```bash
# Lokal bilgisayardan
dig signoz.lingroot.com +short   # 45.43.154.97 donmeli
dig otel.lingroot.com +short     # 45.43.154.97 donmeli
dig mfa.lingroot.com +short      # 45.43.154.97 donmeli
```

---

## Adim 2: VDS Sistem Kurulumu

**Nerede:** VDS'e SSH ile baglan: `ssh root@45.43.154.97 -p 25416`

```bash
# 2A. Sistem guncelle
apt update && apt upgrade -y

# 2B. Guvenlik: deploy kullanicisi olustur
adduser lingroot
usermod -aG sudo lingroot
# SSH key kopyala
mkdir -p /home/lingroot/.ssh
cp ~/.ssh/authorized_keys /home/lingroot/.ssh/
chown -R lingroot:lingroot /home/lingroot/.ssh

# 2C. Docker kur
curl -fsSL https://get.docker.com | sh
usermod -aG docker lingroot

# 2D. Node.js 20 LTS kur (MFA server icin)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2E. Nginx + Certbot kur
apt install -y nginx certbot python3-certbot-nginx

# 2F. Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 25416/tcp   # SSH (varsayilan 22 degil, Vulut 25416 kullaniyor)
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

**Dogrulama:**
```bash
docker --version       # Docker 27.x+
node --version         # v20.x
nginx -v               # nginx/1.x
ufw status             # 25416, 80, 443 acik
```

---

## Adim 3: SigNoz Kur

**Nerede:** VDS uzerinde (lingroot kullanicisiyla: `su - lingroot`)

```bash
# 3A. Dizin olustur
mkdir -p /opt/lingroot && cd /opt/lingroot

# 3B. SigNoz indir
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy/docker/clickhouse-setup/
```

**3C. Override dosyasini olustur** — kaynak limitleri icin:

`docker-compose.override.yml` dosyasini olustur (icerik: `deploy/vds/docker-compose.override.yml`)

```bash
# Lokal bilgisayardan VDS'e kopyala:
scp -P 25416 deploy/vds/docker-compose.override.yml lingroot@45.43.154.97:/opt/lingroot/signoz/deploy/docker/clickhouse-setup/
```

**3D. OTel Collector config** (bearer token auth icin):

```bash
# Lokal bilgisayardan:
scp -P 25416 deploy/vds/otel-collector-config.yaml lingroot@45.43.154.97:/opt/lingroot/signoz/
```

**3E. Auth token olustur ve ayarla:**

```bash
# VDS uzerinde — guclu random token olustur:
openssl rand -hex 32
# Cikan degeri not et — backend env'e de ayni deger girilecek

# Token'i otel collector icin ayarla:
export OTEL_AUTH_TOKEN="<olusturulan-token>"
```

**3F. SigNoz baslat:**

```bash
cd /opt/lingroot/signoz/deploy/docker/clickhouse-setup/
docker compose -f docker-compose.yaml -f docker-compose.override.yml up -d
```

**Dogrulama:**
```bash
docker ps                         # 6-7 container calismali
curl http://localhost:8080         # SigNoz UI donmeli (HTML)
curl http://localhost:4318/v1/traces  # OTel Collector yanit vermeli
```

---

## Adim 4: MFA Servisi Tasi

**Nerede:** Oncelikle lokal bilgisayardan kopyalama, sonra VDS uzerinde kurulum.

**4A. MFA dosyalarini VDS'e kopyala:**

```bash
# Lokal bilgisayardan (proje root dizininden):
scp -P 25416 -r mfa/ lingroot@45.43.154.97:/opt/lingroot/mfa/
```

**4B. VDS uzerinde MFA kur:**

```bash
# VDS'e baglan
ssh lingroot@45.43.154.97 -p 25416

# Bagimliliklari kur
cd /opt/lingroot/mfa
npm install --production

# MFA Docker image indir (~2-3 GB)
docker pull mmcauliffe/montreal-forced-aligner
```

**4C. MFA .env olustur:**

```bash
# /opt/lingroot/mfa/.env
cat > /opt/lingroot/mfa/.env << 'EOF'
PORT=5002
NODE_ENV=production
MFA_DICT_PATH=/opt/lingroot/mfa-models/dictionary/english_mfa.dict
MFA_ACOUSTIC_DIR=/opt/lingroot/mfa-models/acoustic/english_mfa
MFA_ASYNC_MAX_CONCURRENT=2
EOF
```

**4D. MFA modelleri indir:**

```bash
mkdir -p /opt/lingroot/mfa-models/{acoustic,dictionary}

# Modelleri MFA Docker container ile indir:
docker run --rm -v /opt/lingroot/mfa-models:/mfa-models \
  mmcauliffe/montreal-forced-aligner \
  mfa model download acoustic english_mfa

docker run --rm -v /opt/lingroot/mfa-models:/mfa-models \
  mmcauliffe/montreal-forced-aligner \
  mfa model download dictionary english_mfa
```

**Not:** MFA model download yollari farkli olabilir — modeller Docker icinde `/root/Documents/MFA/` altina inebilir. Bu durumda modelleri VDS'e elle kopyalamak gerekebilir. Lokal makinendeki mevcut model dosyalarini da kullanabilirsin.

**4E. Systemd service kur:**

```bash
# Lokal bilgisayardan service dosyasini kopyala:
scp -P 25416 deploy/vds/mfa.service lingroot@45.43.154.97:/tmp/

# VDS uzerinde:
sudo cp /tmp/mfa.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mfa
sudo systemctl start mfa
```

**Dogrulama:**
```bash
sudo systemctl status mfa         # active (running)
curl http://localhost:5002/health  # {"status":"ok","service":"LingRoot MFA Service",...}
```

---

## Adim 5: Nginx Reverse Proxy + SSL

**5A. Nginx config kopyala:**

```bash
# Lokal bilgisayardan:
scp -P 25416 deploy/vds/nginx/lingroot-vds.conf lingroot@45.43.154.97:/tmp/

# VDS uzerinde:
sudo cp /tmp/lingroot-vds.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lingroot-vds.conf /etc/nginx/sites-enabled/

# Default site'i kaldir (cakisma olmamasi icin):
sudo rm -f /etc/nginx/sites-enabled/default

# Config test:
sudo nginx -t
sudo systemctl reload nginx
```

**5B. SSL sertifikalari al (Let's Encrypt):**

```bash
sudo certbot --nginx \
  -d signoz.lingroot.com \
  -d otel.lingroot.com \
  -d mfa.lingroot.com
```

Certbot, email adresi soracak ve Nginx config'i otomatik guncelleyecek.

**Dogrulama:**
```bash
curl https://signoz.lingroot.com           # SigNoz login sayfasi
curl https://mfa.lingroot.com/health       # {"status":"ok"}
curl -X POST https://otel.lingroot.com/v1/traces  # 400 veya 200 (beklenen)
```

---

## Adim 6: Backend Env Guncelle (Render)

**Nerede:** Render Dashboard → Backend service → Environment

Eklenecek/guncellenecek env degiskenleri:

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.lingroot.com
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <adim-3E-deki-token>
OTEL_SERVICE_NAME=lingroot-backend
MFA_SERVICE_URL=https://mfa.lingroot.com
```

`MFA_SERVICE_URL` eski deger: `https://api.booklevel.store` → yeni: `https://mfa.lingroot.com`

Deploy sonrasi Render otomatik restart edecek.

**Dogrulama:**
1. Render loglarinda `[OTel] Instrumentation active → https://otel.lingroot.com` mesaji gorunmeli
2. SigNoz UI'da Services → `lingroot-backend` servisi gorunmeli
3. Bir API istegi yap → SigNoz Traces'da trace gorunmeli

---

## Adim 7: SigNoz Dashboard ve Alert Kurulumu

**Nerede:** SigNoz UI (`signoz.lingroot.com`)

**7A. SigNoz'a ilk giris:**
- Acilista admin kullanici olusturma ekrani gelecek
- Email/password belirle

**7B. Dashboard'lari import et:**

SigNoz UI'da: Dashboards → New Dashboard → JSON ile olustur

4 dashboard JSON'u hazir:
- `deploy/vds/signoz/dashboards/api-overview.json` → API Overview (6 panel)
- `deploy/vds/signoz/dashboards/llm-costs.json` → LLM Costs (6 panel)
- `deploy/vds/signoz/dashboards/client-errors.json` → Client Errors (6 panel)
- `deploy/vds/signoz/dashboards/tts-pipeline.json` → TTS Pipeline (4 panel)

**Not:** SigNoz dashboard import formati farklilik gosterebilir. JSON'lardaki query'leri referans alarak elle panel olusturman gerekebilir.

**7C. Slack webhook olustur (alert'ler icin):**
1. Slack → Apps → Incoming Webhooks → New Webhook
2. Channel sec: `#lingroot-alerts` (veya mevcut bir kanal)
3. Webhook URL'yi kopyala

**7D. Alert'leri olustur:**

SigNoz UI'da: Alerts → New Alert

| Alert | Kosul | Severity |
|-------|-------|----------|
| High Error Rate | 5xx > %5 (5 dk) | Critical |
| High P95 Latency | P95 > 5s (5 dk) | Warning |
| Daily LLM Cost | > $2/gun | Warning |
| Client Error Spike | > 10 hata/5dk | Critical |
| TTS Failure Rate | > %10 (10 dk) | Critical |
| MFA Unhealthy | > 3 hata/5dk | Critical |

Alert query detaylari: `deploy/vds/signoz/alerts/alert-rules.json`

---

## Adim 8: Cloudflare Tunnel'i Kapat

MFA artik VDS uzerinden calisiyor. Lokal makinendeki Cloudflare Tunnel'i durdur:

```bash
# Lokal makinede (Windows):
# cloudflared tunnel service uninstall
# veya Cloudflare Dashboard'dan tunnel'i sil
```

Bundan sonra bilgisayarin acik olmasina gerek yok — MFA 7/24 VDS'te calisiyor.

---

## Adim 9: Son Dogrulama Checklist

```
[ ] DNS: dig signoz.lingroot.com → 45.43.154.97
[ ] DNS: dig otel.lingroot.com → 45.43.154.97
[ ] DNS: dig mfa.lingroot.com → 45.43.154.97
[ ] SigNoz UI: https://signoz.lingroot.com erisilebilir
[ ] MFA Health: https://mfa.lingroot.com/health → {"status":"ok"}
[ ] OTel: https://otel.lingroot.com/v1/traces yanit veriyor
[ ] Backend traces: SigNoz'da lingroot-backend servisi gorunuyor
[ ] Winston logs: SigNoz Logs tab'inda backend loglari gorunuyor
[ ] Exceptions: SigNoz Exceptions tab'inda hatalar gorunuyor
[ ] Metrics: SigNoz'da llm_cost_usd metric'i gorunuyor
[ ] MFA Alignment: Backend'den alignment istegi basarili
[ ] Cloudflare Tunnel: Kapatildi
[ ] UFW: Sadece 25416 (SSH), 80, 443 portlari acik
[ ] Dashboard'lar: 4 dashboard import edildi
[ ] Alert'ler: 6 alert kuruldu ve Slack bildirimi test edildi
```

---

## Dosya Referanslari

Tum konfigurasyonlar hazir:

| Dosya | Aciklama |
|-------|----------|
| `deploy/vds/docker-compose.override.yml` | SigNoz kaynak limitleri |
| `deploy/vds/otel-collector-config.yaml` | OTel Collector: auth, CORS, filter |
| `deploy/vds/nginx/lingroot-vds.conf` | 3 domain reverse proxy + rate limit |
| `deploy/vds/mfa.service` | Systemd auto-restart service |
| `deploy/vds/.env.vds.example` | Env degiskenleri template |
| `deploy/vds/signoz/dashboards/*.json` | 4 dashboard tanimi |
| `deploy/vds/signoz/alerts/alert-rules.json` | 6 alert kurali |

## Sorun Giderme

| Sorun | Cozum |
|-------|-------|
| SigNoz acilmiyor | `docker compose logs` ile container loglarini kontrol et |
| Certbot basarisiz | DNS propagation bekle (`dig` ile kontrol et), 80 portu acik mi? |
| MFA health fail | `journalctl -u mfa -f` ile loglari kontrol et, .env yollarini dogrula |
| Backend trace gelmiyor | Render loglarinda `[OTel] Instrumentation active` var mi? Token dogru mu? |
| ClickHouse OOM | `docker-compose.override.yml`'de memory limitini 2.5G'ye dusur |
