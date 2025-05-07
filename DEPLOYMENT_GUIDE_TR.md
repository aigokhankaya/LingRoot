# LingRoot GitHub Dağıtım Kılavuzu (Vercel & Render)

Bu kılavuz, LingRoot projesini GitHub üzerinden Vercel (frontend) ve Render (backend) platformlarına nasıl dağıtacağınızı açıklar.

## Proje Yapısı

Proje, GitHub deposunun ana dizininde aşağıdaki gibi yapılandırılmıştır:

```
lingroot/
├── frontend/      # Vercel'e dağıtılacak Next.js frontend kodları
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   └── ...
├── backend/       # Render'a dağıtılacak Node.js backend kodları
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   ├── render.yaml
│   └── ...
└── README.md      # Ana proje README dosyası (opsiyonel)
```

## Vercel Dağıtımı (Frontend)

1.  **GitHub Deponuzu Bağlayın:** Vercel hesabınıza giriş yapın ve yeni bir proje oluşturun. GitHub deponuzu Vercel'e bağlayın.
2.  **Proje Ayarları:** Vercel, projeyi otomatik olarak Next.js olarak algılayacaktır.
    *   **Framework Preset:** Next.js seçili olmalıdır.
    *   **Root Directory:** Bu ayarı `frontend` olarak değiştirin. Bu, Vercel'e frontend kodlarının bu alt klasörde olduğunu bildirir.
    *   **Build and Output Settings:** Genellikle Vercel varsayılan Next.js ayarlarını doğru şekilde algılar (`npm run build`, output `.next`). Bu ayarları kontrol edin ve gerekirse düzenleyin.
3.  **Ortam Değişkenleri:** Vercel proje ayarlarında aşağıdaki ortam değişkenlerini tanımlayın:
    *   `NEXT_PUBLIC_API_URL`: Render'da çalışan backend API'nizin URL'si (örn: `https://lingroot-backend.onrender.com/api`).
    *   `NEXT_PUBLIC_SUPABASE_URL`: Supabase projenizin URL'si.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase projenizin anonim (public) anahtarı.
4.  **Dağıtın:** Ayarları kaydedin ve Vercel'in projeyi build edip dağıtmasını bekleyin.

## Render Dağıtımı (Backend)

1.  **GitHub Deponuzu Bağlayın:** Render hesabınıza giriş yapın ve yeni bir "Web Service" oluşturun. GitHub deponuzu Render'a bağlayın.
2.  **Proje Ayarları:**
    *   **Root Directory:** Bu ayarı `backend` olarak ayarlayın. Bu, Render'a backend kodlarının bu alt klasörde olduğunu bildirir.
    *   **Environment:** `Node` seçin.
    *   **Region:** Size uygun bir bölge seçin.
    *   **Branch:** Dağıtım yapmak istediğiniz GitHub branch'ini seçin (örn: `main`).
    *   **Build Command:** `npm install` olarak ayarlanmalıdır (`render.yaml` dosyasında zaten tanımlı).
    *   **Start Command:** `node server.js` olarak ayarlanmalıdır (`render.yaml` dosyasında zaten tanımlı).
3.  **Ortam Değişkenleri:** Render servis ayarlarında "Environment" bölümüne gidin. `.env.example` dosyasında listelenen tüm gerekli ortam değişkenlerini (Supabase URL/Key, DB bilgileri, JWT sırları, `FRONTEND_URL` vb.) buraya ekleyin. Özellikle `DB_PASS`, `JWT_SECRET`, `SUPABASE_SERVICE_KEY` gibi hassas bilgileri güvenli bir şekilde eklediğinizden emin olun.
4.  **Dağıtın:** Ayarları kaydedin ve Render'ın servisi build edip başlatmasını bekleyin.

## Önemli Notlar

*   **CORS:** Backend (`server.js` veya ilgili middleware) yapılandırmasında, Vercel'de çalışan frontend URL'nizin (`FRONTEND_URL` ortam değişkeni ile ayarlanır) CORS politikasına izin verildiğinden emin olun.
*   **API URL:** Frontend'in backend'e doğru istek yapabilmesi için `NEXT_PUBLIC_API_URL` ortam değişkeninin Render servisinizin URL'sini doğru şekilde içerdiğinden emin olun.
*   **Veritabanı:** Supabase veritabanınızın ve tablolarınızın backend tarafından kullanılmaya hazır olduğundan emin olun. Gerekirse `backend/migrations` klasöründeki migration'ları çalıştırın.

Bu adımları takip ederek projenizi başarıyla GitHub üzerinden Vercel ve Render'a dağıtabilirsiniz.
