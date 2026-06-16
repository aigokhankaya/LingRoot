# Supabase Warning Analizi

Tarih: 2026-06-16
Kaynak CSV: `uploads/supabase_warning.csv`

## Özet

CSV içinde toplam 37 warning var:

- 20 kayıt: `function_search_path_mutable`
- 15 kayıt: `rls_policy_always_true`
- 1 kayıt: `extension_in_public`
- 1 kayıt: `vulnerable_postgres_version`

Bu warning’lerin hepsi aynı önemde değil. Bir kısmı doğrudan düzeltilmeli, bir kısmı ise servis rolü üzerinden çalışan bilinçli tasarım olabilir ama yine de daha sıkı hale getirilebilir.

Resmi referanslar:

- Supabase Extensions: https://supabase.com/docs/guides/database/extensions
- Supabase Upgrading: https://supabase.com/docs/guides/platform/upgrading
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security

## Önceliklendirme

### P0

- `vulnerable_postgres_version`
- `extension_in_public`

### P1

- `function_search_path_mutable`

### P2

- `rls_policy_always_true`

Not: `rls_policy_always_true` uyarılarının bazıları gerçek risk, bazıları ise backend `service_role` varsayımı ile yazılmış gevşek policy. Güvenlik açısından yine de daraltılmaları daha doğru.

## 1. Function Search Path Mutable

### Ne anlama geliyor

Fonksiyonlarda `search_path` açıkça set edilmemiş. Bu durumda çağıran rolün `search_path` değeri etkili olur. Güvenlik açısından bu istenmez.

### Ne yapılmalı

Her fonksiyon için açık `search_path` verin. Güvenli varsayılan:

```sql
alter function public.some_function(...)
set search_path = public, extensions;
```

Eğer fonksiyon sistem kataloglarıyla çalışıyorsa daha sıkı bir varyant kullanılabilir:

```sql
alter function public.some_function(...)
set search_path = pg_catalog, public, extensions;
```

### Etkilenen fonksiyonlar

- `public.set_updated_at`
- `public.calculate_level_from_xp(integer)`
- `public.xp_for_next_level(integer)`
- `public.update_gamification_timestamp()`
- `public.create_gamification_profile()`
- `public.get_user_permissions`
- `public.update_external_services_updated_at()`
- `public.update_support_conversation_timestamp()`
- `public.calculate_weekly_ranks()`
- `public.update_streak_society()`
- `public.check_quest_completion_from_daily()`
- `public.cleanup_expired_recommendations()`
- `public.update_listening_session_timestamp()`
- `public.update_user_listening_stats_timestamp()`
- `public.calculate_lqs(integer, integer, numeric)`
- `public.add_new_quests_to_progress()`
- `public.calculate_engagement_score(integer, integer, integer, integer, integer)`
- `public.update_conversation_timestamp()`
- `public.update_topics_updated_at()`
- `public.update_updated_at_column()`

### Karar

Bu grubun tamamı düzeltilmeli. Risk düşük görünse de temizlenmesi kolay ve doğrudan güvenlik hijyeni sağlar.

## 2. RLS Policy Always True

### Ne anlama geliyor

Policy içinde `USING (true)` veya `WITH CHECK (true)` kullanıldığı için RLS pratikte o işlem için filtre uygulamıyor.

Bu bazen bilinçli olabilir:

- sadece backend `service_role` kullanıyordur
- frontend zaten hiç o tabloya gitmiyordur

Ama yine de Supabase Security Advisor bunu gevşek policy olarak işaretler.

### Tek tek değerlendirme

#### Gerçekten sıkılaştırılması gerekenler

- `public.sectors`
  - `sectors_insert_policy`
  - `sectors_update_policy`
  - Şu an “admin backend'de kontrol ediliyor” varsayımıyla tamamen açık.
  - Daha doğru çözüm: bu policy’leri kaldırmak veya `auth.jwt() ->> 'role' = 'admin'` benzeri açık rol kontrolüne çevirmek.

- `public.sector_content`
  - `sector_content_insert_policy`
  - `sector_content_update_policy`
  - Şu an tüm insert/update açık.
  - Eğer sadece admin/editor yazacaksa daraltılmalı.

- `public.sector_vocabulary`
  - `sector_vocabulary_insert_policy`
  - `sector_vocabulary_update_policy`
  - `sector_vocabulary_delete_policy`
  - Şu an tüm write işlemleri açık.
  - Public read-only kalmalı, write tarafı admin/service only olmalı.

- `public.sector_quizzes`
  - `sector_quizzes_admin_all`
  - Tüm işlemler açık.
  - Admin/service only olmalı.

- `public.payment_providers`
  - `payment_providers_admin_policy`
  - Sağlayıcı konfigürasyonu çok hassas.
  - Tam açık bırakılmamalı.

- `public.card_transactions`
  - `card_transactions_admin_all`
  - Kullanıcı `SELECT own` policy var ama admin all policy tamamen açık.
  - Sadece admin/service role sınırı ile çalışmalı.

#### Muhtemelen bilinçli ama iyileştirilmesi önerilenler

- `public.notifications`
  - `System can insert notifications`
  - Büyük olasılıkla yalnızca backend insert ediyor.
  - Warning kabul edilebilir, ama daha temiz çözüm bu policy’yi tamamen kaldırıp sadece service role kullanımına güvenmek.

- `public.admin_logs`
  - `admin_logs_insert_policy`
  - Yine büyük olasılıkla yalnızca backend insert ediyor.
  - Güvenlik açısından service-only model daha net olur.

- `public.user_content_recommendations`
  - `Service can manage all recommendations`
  - Cron/job mantığıyla yazılmış görünüyor.
  - Kullanıcıya özel `SELECT/UPDATE` policy zaten var.
  - `ALL true` yerine sadece gerekli işlemler için daha dar servis politikası tercih edilmeli.

- `public.recommendation_generation_status`
  - `Service can manage generation status`
  - Muhtemelen sadece job tablosu.
  - Internal/service only hale getirilebilir.

#### Repo dışında veya ayrıca doğrulanması gereken

- `public.login_history`
  - `insert_login_history_for_authenticated`
  - Repo migration’larında tanımını göremedim.
  - Bu tablo için doğrudan Supabase üzerindeki mevcut policy okunup karar verilmeli.
  - Eğer kullanıcıların kendi login event’lerini client’tan insert etmesi istenmiyorsa policy daraltılmalı veya kaldırılmalı.

### Karar

Bu grubun hepsi “hemen production risk” değildir, ama en azından write tarafında `true` policy bırakmak uzun vadede doğru değil. Özellikle `sectors`, `sector_content`, `sector_vocabulary`, `sector_quizzes`, `payment_providers`, `card_transactions` için yeni migration yazılmalı.

## 3. Extension In Public

### Warning

- `public.vector`

### Ne anlama geliyor

`vector` extension `public` şemasında kurulu. Supabase dokümantasyonu extension’ların genelde `extensions` şemasında olmasını öneriyor.

### Ne yapılmalı

Önce mevcut bağımlılıkları kontrol edin. Sonra uygunsa extension’ı `extensions` şemasına taşıyın:

```sql
create schema if not exists extensions;
alter extension vector set schema extensions;
```

### Dikkat

- `vector` tipini kullanan kolonlar, index’ler ve fonksiyonlar upgrade sonrası test edilmeli.
- Özellikle `users.insight_embedding` ve `topics.embedding_vector` gibi alanlar varsa migration sonrası similarity sorgularını test edin.

### Karar

Düzeltilmesi önerilir. Bu warning gereksiz namespace kirliliğini ve bazı erişim risklerini azaltır.

## 4. Vulnerable Postgres Version

### Warning

- Mevcut sürüm: `supabase-postgres-15.8.1.070`

### Ne anlama geliyor

Proje sürümünüz için güvenlik patch’i olan daha yeni bir Supabase/Postgres build’i mevcut.

### Ne yapılmalı

Bu SQL ile çözülmez. Supabase Dashboard üzerinden upgrade gerekir.

Önerilen yol:

1. Backup doğrulaması yap.
2. Uygun bakım penceresi belirle.
3. Dashboard > Infrastructure bölümünden upgrade başlat.
4. Upgrade sonrası extension, cron, vector index ve kritik sorguları test et.

### Dikkat

- Supabase dokümantasyonuna göre upgrade sırasında downtime planlanmalı.
- Major/minor farkına göre release notes kontrol edilmeli.

### Karar

Bu warning manuel olarak çözülmeli. En kritik warning budur.

## Önerilen Sıra

1. Önce `vulnerable_postgres_version` için upgrade planı çıkar.
2. `vector` extension’ını `extensions` şemasına taşı.
3. `function_search_path_mutable` grubunu tek migration ile temizle.
4. `rls_policy_always_true` write policy’lerini ikinci migration ile daralt.
5. En sonda Security Advisor’ı yeniden çalıştır.

## Manuel Yapılacaklar

- Supabase Dashboard > Security Advisor ekranında warning listesini migration sonrası tekrar export et.
- `login_history` tablosunun mevcut policy SQL’ini doğrudan Supabase’den çıkar; repo içinde tanımı görünmüyor.
- `vector` extension taşınmadan önce embedding sorgularının ve vector index’lerin kullanıldığı akışları listele.
- Postgres upgrade öncesi backup, restore ve rollback planını netleştir.
- Upgrade sonrası şu akışları test et:
  - auth
  - topic/content önerileri
  - sector content
  - notifications
  - payments
  - vector similarity / embedding akışları

## Sonuç

37 warning’in tamamı aynı ağırlıkta değil.

- En kritik olanlar: `vulnerable_postgres_version`, `extension_in_public`
- En kolay toplu düzeltme: `function_search_path_mutable`
- En fazla dikkat gerektirenler: `rls_policy_always_true` grubundaki write policy’leri

İstersen bir sonraki adımda bu warning’ler için de doğrudan uygulanabilir migration dosyalarını hazırlayayım.
