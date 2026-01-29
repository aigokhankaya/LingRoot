# Valkey (Self-Hosted Redis) Setup Guide

> **Created:** 2026-01-29 | **Updated:** 2026-01-29 | **Version:** 1.1

## Neden Valkey?

Upstash Redis Free Tier 500K komut/ay limitine ulasti. Valkey (Redis fork, Linux Foundation destekli) sunucuya kurularak sinirsiz komut limiti ile BullMQ job queue calismaya devam eder.

**Valkey nedir?** Redis 7.2'nin BSD-3 lisansli forku. Redis Inc. lisans degisikligi sonrasi Linux Foundation altinda gelistiriliyor. BullMQ ile %100 uyumlu.

---

## Platform Secimi

| Platform | Yontem | Auto-Start | RAM Overhead | Onerilen |
|----------|--------|------------|--------------|----------|
| **Linux (Ubuntu/Debian)** | Native apt install | systemd | ~50-100MB | Evet |
| **Windows + Docker Desktop** | Docker container | Docker restart policy | ~2-3GB (Docker Desktop) | Evet |
| **Windows + WSL2** | WSL2 icinde apt install | Konfigurasyonlu | ~1-2GB (WSL2 VM) | Alternatif |

> **tporadowski/redis** (Windows port): Redis 5.0.14'te kaldi, 4+ yildir guncellenmemis — ONERILMEZ.
> **Memurai**: Free edition 10 gunluk uptime limiti var — production icin uygun degil.
> **Native Valkey**: Windows build'i mevcut degil.

---

## Ortak Gereksinimler

- ~50-100MB RAM (idle), ~200MB peak (Valkey kendisi)
- 6379 portu (sadece localhost, disariya acik degil)
- Backend'in ayni makinede calismasi (localhost baglanti)

---

## A) Windows Kurulumu (Docker Desktop + Valkey)

### Onkosul: Docker Desktop

Docker Desktop kurulu degilse:

1. https://www.docker.com/products/docker-desktop/ adresinden indir
2. Kurulum sirasinda **WSL2 backend** secenegini onayla
3. Kurulum tamamlaninca: Settings > General > **Start Docker Desktop when you sign in** → aktif et

### Adim 1: Valkey Container Baslat

PowerShell'de calistir:

```powershell
docker run -d --name valkey ^
  -p 6379:6379 ^
  -v C:\valkey-data:/data ^
  --restart unless-stopped ^
  valkey/valkey:8 ^
  valkey-server --save 60 1 --loglevel warning --maxmemory 256mb --maxmemory-policy noeviction --appendonly yes
```

**Parametre Aciklamalari:**

| Parametre | Aciklama |
|-----------|----------|
| `--name valkey` | Container adi |
| `-p 6379:6379` | Port mapping (host:container) |
| `-v C:\valkey-data:/data` | Persistence: data klasoru host'a mount edilir |
| `--restart unless-stopped` | Docker basladiginda container otomatik canlanir |
| `valkey/valkey:8` | Valkey 8.x image (Redis 7.2+ uyumlu) |
| `--save 60 1` | 60 saniyede 1+ degisiklik olursa RDB snapshot |
| `--maxmemory 256mb` | Maksimum RAM kullanimi |
| `--maxmemory-policy noeviction` | BullMQ icin **ZORUNLU** (eviction = job kaybi) |
| `--appendonly yes` | AOF persistence (crash'te veri kaybi minimize) |
| `--loglevel warning` | Sadece uyari ve hatalari logla |

### Adim 2: Baglanti Testi

```powershell
docker exec valkey valkey-cli ping
# Beklenen: PONG
```

Detayli bilgi icin:

```powershell
docker exec valkey valkey-cli info server
# Valkey versiyon bilgisi

docker exec valkey valkey-cli info memory
# Memory kullanimi
```

### Adim 3: Backend .env Guncelle

Sunucudaki `backend/.env` dosyasinda:

```diff
- REDIS_URL=rediss://default:xxxxx@current-grouper-20344.upstash.io:6379
+ REDIS_URL=redis://localhost:6379
```

> **Not:** `rediss://` (TLS) yerine `redis://` (plain) kullanilir cunku localhost baglantisi zaten guvenli.

### Adim 4: Backend Restart

Backend'i yeniden baslat. Logda su mesajlar gorunmeli:

```
[Redis] Connected successfully
[BullQueue] Queue 'tts-processing' initialized
[BullQueue] Queue 'podcast-processing' initialized
[BullQueue] Queue 'mfa-alignment' initialized
[BullBoard] Dashboard initialized with 3 queues
```

### Windows Container Yonetimi

```powershell
# Container durumu
docker ps -a --filter name=valkey

# Container loglarini gor
docker logs valkey --tail 50

# Container'i durdur
docker stop valkey

# Container'i baslat
docker start valkey

# Container'i sil ve yeniden olustur
docker rm -f valkey
# Ardindan Adim 1'deki docker run komutunu tekrar calistir

# Valkey CLI'a erisim (interaktif)
docker exec -it valkey valkey-cli
```

### Windows Otomatik Baslatma

Docker Desktop "Start Docker Desktop when you sign in" ayari aktifse ve container `--restart unless-stopped` ile olusturulduysa:

1. Windows acilisinda Docker Desktop otomatik baslar
2. Docker Desktop basladiginda Valkey container'i otomatik canlanir
3. Backend basladiginda `redis://localhost:6379` uzerinden baglanir

**Dogrulama:** Windows reboot sonrasi `docker exec valkey valkey-cli ping` → `PONG`

---

## B) Linux Kurulumu (Native)

### Gereksinimler

- Ubuntu 22.04+ veya Debian 12+
- Root/sudo erisimi
- 6379 portu (sadece localhost)

### Adim 1: Valkey Yukle

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y valkey-server valkey-tools
```

Eger `valkey-server` paketi repository'de yoksa (eski Ubuntu surumu):

```bash
# Valkey PPA ekle (Ubuntu)
sudo add-apt-repository ppa:valkey/valkey
sudo apt update
sudo apt install -y valkey-server valkey-tools
```

Alternatif: Snap ile kurulum:
```bash
sudo snap install valkey
```

### Adim 2: Valkey Konfigurasyonu

Konfigursyon dosyasini duzenle:

```bash
sudo nano /etc/valkey/valkey.conf
```

Asagidaki ayarlari uygula:

```conf
# Network - sadece localhost (guvenlik)
bind 127.0.0.1
port 6379
protected-mode yes

# Memory - sunucu RAM'ine gore ayarla
maxmemory 256mb
maxmemory-policy noeviction

# Persistence - RDB snapshot (job kaybi onleme)
save 900 1
save 300 10
save 60 10000
dbfilename valkey-dump.rdb
dir /var/lib/valkey

# AOF - daha guvenli persistence (opsiyonel ama onerilen)
appendonly yes
appendfilename "valkey-aof.aof"
appendfsync everysec

# Performance
tcp-keepalive 300
timeout 0
hz 10

# Logging
loglevel notice
logfile /var/log/valkey/valkey-server.log
```

**KRITIK AYARLAR:**
- `maxmemory-policy noeviction`: BullMQ icin ZORUNLU. `allkeys-lru` gibi eviction policy'leri job kaybina neden olur.
- `bind 127.0.0.1`: Disaridan erisilemez, sadece localhost.
- `appendonly yes`: Server crash durumunda job kaybi minimize edilir.

### Adim 3: Servisi Baslat

```bash
sudo systemctl enable valkey-server
sudo systemctl start valkey-server
sudo systemctl status valkey-server
```

### Adim 4: Baglanti Testi

```bash
valkey-cli ping
# Beklenen cikti: PONG

valkey-cli info server | head -5
# Valkey versiyon bilgisi
```

### Adim 5: Backend .env Guncelle

Sunucudaki `backend/.env` dosyasinda:

```diff
- REDIS_URL=rediss://default:xxxxx@current-grouper-20344.upstash.io:6379
+ REDIS_URL=redis://localhost:6379
```

> **Not:** `rediss://` (TLS) yerine `redis://` (plain) kullanilir cunku localhost baglantisi zaten guvenli.

### Adim 6: Backend Restart

```bash
# PM2 kullaniliyorsa:
pm2 restart backend

# Systemd kullaniliyorsa:
sudo systemctl restart lingroot-backend

# Manuel:
cd /path/to/backend && npm run dev
```

### Adim 7: Dogrulama

Backend loglarinda su mesaji gorunmeli:
```
[Redis] Connected successfully
[BullQueue] Queue 'tts-processing' initialized
[BullQueue] Queue 'podcast-processing' initialized
[BullQueue] Queue 'mfa-alignment' initialized
[BullBoard] Dashboard initialized with 3 queues
```

Valkey tarafinda baglanti kontrolu:
```bash
valkey-cli info clients
# connected_clients:1 (veya daha fazla)

valkey-cli info memory
# used_memory_human: ~5MB (bos durumda)
```

---

## Bakim ve Izleme

### Memory Kontrolu

```bash
# Linux
valkey-cli info memory | grep used_memory_human

# Windows (Docker)
docker exec valkey valkey-cli info memory
```

### Queue Durumu

```bash
# BullMQ queue key'lerini listele
# Linux:
valkey-cli keys "bull:*" | head -20

# Windows (Docker):
docker exec valkey valkey-cli keys "bull:*"
```

```bash
# Belirli queue'daki job sayisi
# Linux:
valkey-cli llen "bull:tts-processing:wait"
valkey-cli llen "bull:podcast-processing:wait"
valkey-cli llen "bull:mfa-alignment:wait"

# Windows (Docker):
docker exec valkey valkey-cli llen "bull:tts-processing:wait"
docker exec valkey valkey-cli llen "bull:podcast-processing:wait"
docker exec valkey valkey-cli llen "bull:mfa-alignment:wait"
```

### Log Kontrolu

```bash
# Linux
sudo tail -f /var/log/valkey/valkey-server.log

# Windows (Docker)
docker logs -f valkey --tail 50
```

### Otomatik Restart

**Linux:** Valkey systemd servisi `restart=always` ile calisiyor:
```bash
sudo systemctl status valkey-server
sudo systemctl show valkey-server --property=ActiveEnterTimestamp
```

**Windows:** Docker `--restart unless-stopped` policy ile container otomatik canlanir:
```powershell
docker inspect valkey --format "{{.HostConfig.RestartPolicy.Name}}"
# Beklenen: unless-stopped
```

---

## Dogrulama Kontrol Listesi

Kurulum tamamlandiginda asagidaki adimlarin hepsinin basarili olmasi gerekir:

| # | Kontrol | Komut | Beklenen |
|---|---------|-------|----------|
| 1 | Valkey calisiyior | `valkey-cli ping` (Linux) veya `docker exec valkey valkey-cli ping` (Windows) | `PONG` |
| 2 | Backend baglantisi | Backend loglarinda | `[Redis] Connected successfully` |
| 3 | Queue'lar hazirlandi | Backend loglarinda | `[BullQueue] Queue '...' initialized` |
| 4 | BullBoard erisimi | Tarayicida `/api/admin/queues` | Dashboard gorunur |
| 5 | Memory kontrolu | `valkey-cli info memory` | `used_memory_human` < 256MB |
| 6 | Test job | TTS veya podcast islemi baslat | Queue'da gorunmeli |

---

## Sorun Giderme

### "Connection refused" Hatasi

**Linux:**
```bash
sudo systemctl status valkey-server
ss -tlnp | grep 6379
valkey-cli config get bind
```

**Windows:**
```powershell
docker ps -a --filter name=valkey
# Container calisiyor mu?

docker logs valkey --tail 20
# Hata mesajlari?

netstat -ano | findstr 6379
# Port dinleniyor mu?
```

### "OOM (Out of Memory)" Hatasi

```bash
# Memory durumu
# Linux:
valkey-cli info memory

# Windows:
docker exec valkey valkey-cli info memory

# Completed/failed job temizligi (BullMQ otomatik yapar ama manuel)
# Linux:
valkey-cli keys "bull:*:completed" | xargs valkey-cli del

# Windows:
docker exec valkey valkey-cli keys "bull:*:completed"
# Her key icin: docker exec valkey valkey-cli del <key>
```

### Docker Container Baslamiyor (Windows)

```powershell
# Docker Desktop calisiyor mu?
docker info

# Container loglarini kontrol et
docker logs valkey

# Container'i sil ve yeniden olustur
docker rm -f valkey
# Adim 1'deki docker run komutunu tekrar calistir

# Volume'u kontrol et
dir C:\valkey-data
```

### Upstash'e Geri Donme (Rollback)

Valkey sorun cikarirsa, `.env`'de eski Upstash URL'ini geri yaz:
```bash
REDIS_URL=rediss://default:xxxxx@current-grouper-20344.upstash.io:6379
```
Backend restart et. Upstash limiti yenilenene kadar in-memory fallback devreye girer.

---

## Guvenlik Notlari

1. **Bind sadece localhost** — `bind 127.0.0.1` disinda ASLA disari acma (Docker: sadece `-p 6379:6379` localhost'a bind eder)
2. **Firewall** — Linux: `ufw deny 6379` ile portu disardan kapat (ekstra onlem). Windows: port zaten Docker icinde.
3. **Protected mode** — Linux: `protected-mode yes` aktif olmali. Docker: default olarak aktif.
4. **Password gereksiz** — Localhost baglanti oldugu icin sifre zorunlu degil, ama istenirse:
   ```conf
   requirepass your-secure-password
   ```
   Bu durumda `.env`:
   ```
   REDIS_URL=redis://:your-secure-password@localhost:6379
   ```

---

## Ilgili Dokumanlar

- [Redis 500K Limit Analizi](./redis-500k-limit-analysis.md)
- [Environment Variables](./environment-variables.md)
- [Scaling Strategy](./scaling-strategy.md)
- [Production Deploy](./production-deploy.md)
