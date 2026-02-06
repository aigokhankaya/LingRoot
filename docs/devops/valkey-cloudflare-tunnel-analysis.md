# Valkey TCP Tunnel Analiz: Render Backend → winPC Valkey (Cloudflare Tunnel)

> **Created:** 2026-01-29 | **Updated:** 2026-01-29 | **Version:** 1.0

## Ozet

Bu dokuman, Render'da calisan production backend'in winPC'deki self-hosted Valkey instance'ina **Cloudflare Named Tunnel** uzerinden TCP baglantisi kurma senaryosunu analiz eder.

**Sonuc:** Teknik olarak **MUMKUN DEGIL**. Render managed platform oldugu icin gerekli `cloudflared` daemon'i client tarafinda calistirilamaz.

---

## 1. Mevcut Mimari

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│   macPC      │     │   Render (prod)  │     │   winPC                 │
│   (dev)      │     │   Backend API    │     │   MFA Worker            │
│              │     │   Express.js     │     │   Valkey (Docker)       │
│              │     │                  │     │   port 6379             │
└─────────────┘     └──────────────────┘     └─────────────────────────┘
```

| Makine | Rol | Network |
|--------|-----|---------|
| **macPC** | Gelistirme ortami | Ev/ofis LAN |
| **winPC** | MFA Worker + Valkey (Docker, port 6379) | Ev/ofis LAN, Cloudflare Tunnel ile disariya acik |
| **Render** | Production backend (Express.js) | Render managed network |

**Mevcut durum:** Backend Render'da, Valkey winPC'de. Ikisi farkli network'lerde. Backend'in Valkey'e erismesi icin bir tunnel gerekiyor.

---

## 2. Cloudflare TCP Tunnel Nasil Calisir

Cloudflare Tunnel (eski adi: Argo Tunnel) iki modda calisir:

### 2.1 HTTP Tunnel (Web Servisleri)

```
Client (browser) → Cloudflare Edge → cloudflared (server) → localhost:PORT
```

- Cloudflare Edge HTTP/HTTPS proxy olarak davranir
- Client tarafinda ozel bir sey gerekmez (normal browser/HTTP client yeterli)
- **LingRoot'un mevcut backend tunnel'i boyle calisir**

### 2.2 TCP Tunnel (Non-HTTP Protokoller — Redis, SSH, vb.)

```
Client → cloudflared access tcp (CLIENT daemon) → Cloudflare Edge → cloudflared (SERVER daemon) → localhost:6379
```

**Kritik fark:** TCP tunnel'da **HER IKI TARAFTA DA** `cloudflared` daemon'i calistirilmalidir:

| Taraf | Gereksinim | Aciklama |
|-------|-----------|----------|
| **Server** (winPC) | `cloudflared tunnel run` | Valkey'i Cloudflare'a expose eder |
| **Client** (Render) | `cloudflared access tcp` | Local port'u Cloudflare'a baglar, backend bu porta connect olur |

Client tarafindaki `cloudflared access tcp` komutu bir local proxy baslatir:

```bash
# Client tarafinda calistirilmasi gereken komut
cloudflared access tcp --hostname valkey.example.com --url localhost:6379
```

Bu komut `localhost:6379`'u dinler ve trafigi Cloudflare uzerinden server tarafindaki Valkey'e yonlendirir. Backend `redis://localhost:6379` ile baglanir.

---

## 3. RENDER BLOCKER: Neden Calismaz

### 3.1 Teknik Engel

Render **managed platform** (PaaS). Kullanicilar:

- Sistem seviyesinde binary (`cloudflared`) yukleyemez
- Background daemon calistiramazlar (sadece ana proses calisir)
- Root/sudo erisimi yoktur
- Filesystem read-only'dir (build artifact'lari haric)

TCP tunnel icin client tarafinda `cloudflared access tcp` daemon'inin **surekli calismasi** gerekir. Render buna izin vermez.

### 3.2 HTTP Tunnel Neden Farkli

HTTP tunnel'da client tarafinda `cloudflared` gerekmez — Cloudflare Edge HTTP proxy olarak davranir. Bu yuzden browser veya herhangi bir HTTP client dogrudan erisebilir. Ancak Redis/Valkey protokolu HTTP degil, raw TCP'dir.

### 3.3 Diger PaaS Platformlari

Bu engel Render'a ozgu degil. Ayni durum su platformlar icin de gecerli:

| Platform | `cloudflared` Yuklenebilir mi? | TCP Tunnel Mumkun mu? |
|----------|-------------------------------|----------------------|
| **Render** | Hayir | Hayir |
| **Heroku** | Hayir | Hayir |
| **Vercel** (Serverless) | Hayir | Hayir |
| **Railway** | Kisitli (Dockerfile ile) | Potansiyel (karmasik) |
| **Fly.io** | Evet (Docker + init) | Potansiyel |
| **VPS (Hetzner, DigitalOcean)** | Evet | Evet |

---

## 4. Alternatif Cozumler

### A) Upstash Redis — PAYG (Pay-As-You-Go)

| Ozellik | Deger |
|---------|-------|
| **Maliyet** | $0.2/100K komut (ilk 10K/gun ucretsiz) |
| **Tahmini aylik** | ~$0-1/ay (mevcut trafik ile) |
| **Kurulum suresi** | Dakikalar |
| **Kod degisikligi** | Sifir — sadece `REDIS_URL` env var degisir |
| **Gecikme** | ~1-5ms (global regions) |

**Nasil calisir:**
1. Upstash dashboard'dan yeni PAYG database olustur
2. Render'da `REDIS_URL` env var'ini Upstash URL'ine guncelle
3. Backend restart

**Avantajlar:**
- En hizli cozum, sifir kod degisikligi
- Free tier (10K komut/gun) test icin yeterli
- PAYG ile 500K/ay sabit limit sorunu yok — kullandikca ode
- Global edge, dusuk latency

**Dezavantajlar:**
- Harici bagimliligi tekrar ekler
- Cok yuksek trafik'te maliyet artabilir (ama $0.2/100K komut oldukca ucuz)

---

### B) Backend'i winPC'ye Tasi

| Ozellik | Deger |
|---------|-------|
| **Maliyet** | $0 (mevcut donanim) |
| **Kurulum** | Backend + Valkey ayni makinede |
| **Kod degisikligi** | Sifir — `REDIS_URL=redis://localhost:6379` |
| **Gecikme** | ~0ms (localhost) |

**Nasil calisir:**
1. winPC'de backend'i calistir (PM2 veya systemd ile)
2. Cloudflare Tunnel ile backend'i HTTP olarak disariya ac (mevcut tunnel yapisinin aynisi)
3. Valkey zaten `localhost:6379`'da — sifir ek konfigurasyon

**Avantajlar:**
- Sifir maliyet, sifir harici bagimllik
- Localhost baglanti — en dusuk gecikme
- Tum worker'lar (MFA, BullMQ) ayni makinede

**Dezavantajlar:**
- winPC uptime'ina bagimlilik (elektrik kesintisi, Windows Update reboot)
- Render'in managed platform avantajlari kaybedilir (auto-deploy, logging, vb.)
- winPC'nin network/donanim kapasite siniri
- Production workload icin ev bilgisayari guvenilirlik riski

---

### C) Render Native Redis ($7/ay)

| Ozellik | Deger |
|---------|-------|
| **Maliyet** | $7/ay (Starter plan, 25MB) |
| **Kurulum** | Render dashboard'dan tek tik |
| **Kod degisikligi** | Sifir — Render internal URL otomatik inject edilir |
| **Gecikme** | ~0-1ms (ayni datacenter) |

**Nasil calisir:**
1. Render dashboard → New Redis → Starter ($7/ay)
2. Backend service'e internal connection string otomatik eklenir
3. Backend restart

**Avantajlar:**
- En basit kurulum (Render ekosisteminde native)
- Internal network — dusuk gecikme, guvenli baglanti
- Managed: yedekleme, monitoring, auto-restart
- 25MB BullMQ job queue icin fazlasiyla yeterli

**Dezavantajlar:**
- Aylik sabit maliyet ($7)
- Starter plan 25MB limit (yeterli ama buyume durumunda upgrade gerekir)

---

## 5. Karsilastirma Tablosu

| Kriter | A) Upstash PAYG | B) winPC Backend | C) Render Redis |
|--------|----------------|-----------------|----------------|
| **Maliyet** | ~$0-1/ay | $0 | $7/ay |
| **Kurulum zorlugu** | Cok kolay | Orta | Cok kolay |
| **Kod degisikligi** | Yok | Yok | Yok |
| **Gecikme** | ~1-5ms | ~0ms | ~0-1ms |
| **Guvenilirlik** | Yuksek (managed) | Dusuk (ev PC) | Yuksek (managed) |
| **Bagimsizlik** | Harici servis | Tam bagimiz | Render'a bagimli |
| **BullMQ uyumlulugu** | Evet | Evet | Evet |

---

## 6. Oneri

**Kisa vadede:** `A) Upstash PAYG` — En hizli, en ucuz, sifir risk. Mevcut 500K/ay sabit limit sorunu PAYG modelde yok. Maliyet trafige bagimli ama mevcut hacimde $0-1/ay.

**Uzun vadede (trafik artarsa):** `C) Render Redis ($7/ay)` — Ayni datacenter'da en dusuk gecikme, managed platform avantajlari. BullMQ workload arttikca Upstash maliyeti de artabilir; sabit $7/ay daha onceden tahmin edilebilir.

**B secenegi (winPC backend) onerilmez** — Production workload icin ev bilgisayari yeterli guvenilirlik saglamaz (elektrik kesintisi, Windows Update, donanim ariza riski).

---

## Ilgili Dokumanlar

- [Valkey Setup Guide](./valkey-setup-guide.md)
- [Redis 500K Limit Analysis](./redis-500k-limit-analysis.md)
- [Scaling Strategy](./scaling-strategy.md)
- [Environment Variables](./environment-variables.md)
