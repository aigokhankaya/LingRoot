# Supabase Performance Security Lints Analizi

Tarih: 2026-06-16
Kaynak CSV: `uploads/Supabase Performance Security Lints (ffqfcmmbeeieouoghrac).csv`

## Özet

CSV içindeki 72 kaydın tamamı `ERROR` seviyesinde.

- 4 kayıt: `security_definer_view`
- 68 kayıt: `rls_disabled_in_public`

Bu bulguların ana problemi, `public` şemasındaki obje ve tabloların Supabase API üzerinden erişilebilir olması ama RLS/policy katmanının eksik kalmasıdır. Supabase dokümantasyonuna göre `public` gibi exposed schema'larda RLS açık olmalıdır. View'lar da varsayılan olarak yaratıcısının yetkileriyle çalıştığı için `security_invoker` moduna alınmadıklarında RLS'yi fiilen bypass edebilir.

Resmi referanslar:

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase view security: https://supabase.com/docs/guides/database/tables#view-security

## Önceliklendirme

### P0

- `security_definer_view` olan 4 view
- Kullanıcıya ait veri tutan ve `public` şemasında RLS kapalı olan tüm tablolar
- İç sistem tabloları olup istemciye açık olmaması gereken tablolar

### P1

- Public katalog/read-only olması gereken tablolar için açık SELECT, kapalı write politikaları
- Leaderboard ve aggregate kullanımında base table yerine kontrollü view kullanımı

### P2

- Yeni tablolar için otomatik RLS enable trigger
- Eski policy/grant setlerinin temizlenmesi

## Çözüm Kalıpları

### 1. Security definer view düzeltmesi

Her view için önce `security_invoker` kullanılmalı:

```sql
alter view public.some_view
set (security_invoker = true);
```

Gerekirse view yeniden oluşturulurken de açıkça tanımlanmalı:

```sql
create or replace view public.some_view
with (security_invoker = true) as
select ...
;
```

### 2. Kullanıcı sahipli tablo kalıbı

`user_id` bazlı sahiplik varsa:

```sql
alter table public.some_table enable row level security;

create policy some_table_select_own
on public.some_table
for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy some_table_insert_own
on public.some_table
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy some_table_update_own
on public.some_table
for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy some_table_delete_own
on public.some_table
for delete
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);
```

### 3. Child/join bazlı sahiplik kalıbı

Tabloda doğrudan `user_id` yoksa parent üzerinden bağlanmalı:

```sql
alter table public.child_table enable row level security;

create policy child_table_select_own
on public.child_table
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_table p
    where p.id = child_table.parent_id
      and p.user_id = auth.uid()
  )
);
```

### 4. Public read-only katalog kalıbı

Herkesin veya giriş yapmış tüm kullanıcıların okuyabileceği tablolar:

```sql
alter table public.catalog_table enable row level security;

create policy catalog_table_select_all
on public.catalog_table
for select
to anon, authenticated
using (true);
```

Write operasyonları için:

- ya hiç policy yazmayın ve API write kapalı kalsın
- ya da sadece `service_role` / backend RPC / admin rolü üzerinden yazın

### 5. İç sistem tablosu kalıbı

Doğrudan client erişimi gerekmeyen tablo:

```sql
alter table public.internal_table enable row level security;
revoke all on public.internal_table from anon, authenticated;
```

Gerekirse erişim sadece backend tarafında `service_role` ile yapılmalı.

## Her Bulgu İçin Yapılacaklar

Not: Bazı tablolarda isimden hareketle sahiplik modeli çıkarıldı. `content_folders`, `settings`, `generated_suggestions`, `topic_nodes`, `content_items`, `content_relations`, `quest_nodes` gibi tablolarda son policy kararı migration/schema kolonları kontrol edilerek netleştirilmeli.

| Obje | Lint | Yapılacak İş | Not |
|---|---|---|---|
| `public.user_permissions_view` | `security_definer_view` | `security_invoker` yap; view yalnızca gerekli kolonları döndürsün | Yetki modeli gösterdiği için hassas |
| `public.topic_tree_view` | `security_definer_view` | `security_invoker` yap; altında `topics` RLS policy'leri çalışsın | `topics` zaten RLS kullanıyor görünüyor |
| `public.v_user_memory_palace` | `security_definer_view` | `security_invoker` yap; kullanıcı kendi satırını görsün | `user_id` aggregate view |
| `public.v_daily_listening_quality` | `security_definer_view` | `security_invoker` yap; kullanıcı kendi aggregate verisini görsün | `listening_sessions` RLS'ye bağlanmalı |
| `public.books` | `rls_disabled_in_public` | RLS aç; `SELECT` herkese veya authenticated role açık, write sadece admin/service | Public katalog |
| `public.weekly_scores` | `rls_disabled_in_public` | RLS aç; base table'ı doğrudan açma, leaderboard gerekiyorsa kontrollü view kullan | Kullanıcı performans verisi |
| `public.user_interests` | `rls_disabled_in_public` | RLS aç; CRUD sadece sahibine açık | `user_id` bazlı |
| `public.leagues` | `rls_disabled_in_public` | RLS aç; `SELECT` public/authenticated, write admin/service | Referans tablo |
| `public.counters` | `rls_disabled_in_public` | RLS aç; anon/authenticated erişimini kapat | İç sistem/teknik tablo |
| `public.book_chapters` | `rls_disabled_in_public` | RLS aç; `SELECT` public/authenticated, write admin/service | Public içerik |
| `public.user_settings` | `rls_disabled_in_public` | RLS aç; kullanıcı sadece kendi ayarlarını görsün/güncellesin | `user_id` bazlı |
| `public.chapter_audio` | `rls_disabled_in_public` | RLS aç; metadata public read olabilir, üretim/update service/admin | İçerik asset tablosu |
| `public.user_challenge_progress` | `rls_disabled_in_public` | RLS aç; CRUD sadece sahibi | `user_id` bazlı |
| `public.weekly_challenges` | `rls_disabled_in_public` | RLS aç; `SELECT` public/authenticated, write admin/service | Challenge tanımı |
| `public.settings` | `rls_disabled_in_public` | RLS aç; tabloyu ikiye ayırmayı değerlendir: public flags ve internal config | Belirsiz sahiplik |
| `public.generated_suggestions` | `rls_disabled_in_public` | RLS aç; kullanıcıya özel ise own-only, global ise read-only katalog | Önce kullanım modeli netleşsin |
| `public.document_sections` | `rls_disabled_in_public` | RLS aç; belge sahibine parent `documents` üzerinden join policy uygula | Child tablo |
| `public.suggestion_click_logs` | `rls_disabled_in_public` | RLS aç; own-only veya service-only | Event/log tablosu |
| `public.user_learning_sessions` | `rls_disabled_in_public` | RLS aç; own-only | Kullanıcı aktivite verisi |
| `public.user_daily_goals` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.user_learning_streaks` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.roles` | `rls_disabled_in_public` | RLS aç; tercihen admin/service only, gerekiyorsa read-only view | Yetki altyapısı |
| `public.role_permissions` | `rls_disabled_in_public` | RLS aç; admin/service only | Yetki altyapısı |
| `public.permissions` | `rls_disabled_in_public` | RLS aç; admin/service only | Yetki altyapısı |
| `public.user_roles` | `rls_disabled_in_public` | RLS aç; kullanıcı kendi rolünü görebilir ama update admin/service | Hassas ilişki tablosu |
| `public.user_course_progress` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.content_tags` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only | Taksonomi |
| `public.content_folders` | `rls_disabled_in_public` | RLS aç; global ise read-only, kullanıcı klasörü ise own-only | Sahiplik doğrulanmalı |
| `public.messages` | `rls_disabled_in_public` | RLS aç; sadece conversation katılımcıları erişsin | Salt `user_id` yetmeyebilir |
| `public.message_attachments` | `rls_disabled_in_public` | RLS aç; parent `messages`/`conversations` üzerinden erişim | Child tablo |
| `public.user_book_progress` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.conversations` | `rls_disabled_in_public` | RLS aç; sadece conversation sahibi/katılımcısı erişsin | Sohbet verisi |
| `public.support_conversations` | `rls_disabled_in_public` | RLS aç; kullanıcı kendi ticket'ını, support/admin tüm kayıtları görsün | İki taraflı policy gerekir |
| `public.hobby_suggestions` | `rls_disabled_in_public` | RLS aç; global katalog ise read-only | İçerik/ref tablo |
| `public.support_messages` | `rls_disabled_in_public` | RLS aç; ticket owner + support/admin erişimi | Support child tablo |
| `public.daily_usage_patterns` | `rls_disabled_in_public` | RLS aç; own-only veya service-only | Analitik veri |
| `public.support_message_attachments` | `rls_disabled_in_public` | RLS aç; support message parent policy'sine bağla | Child tablo |
| `public.user_daily_suggestions_shown` | `rls_disabled_in_public` | RLS aç; own-only | Kullanıcı gösterim logu |
| `public.topic_nodes` | `rls_disabled_in_public` | RLS aç; global topic ağacı ise read-only, kullanıcıya özel ise own-only | Sahiplik doğrulanmalı |
| `public.user_daily_suggestion_logs` | `rls_disabled_in_public` | RLS aç; own-only veya service-only | Log tablosu |
| `public.content_items` | `rls_disabled_in_public` | RLS aç; public katalog ise read-only, draft içerikler admin/service | İçerik durumu policy gerektirebilir |
| `public.user_asset_usage` | `rls_disabled_in_public` | RLS aç; own-only | Kullanıcı tüketim verisi |
| `public.content_relations` | `rls_disabled_in_public` | RLS aç; global içerik graph ise read-only | Referans ilişki tablosu |
| `public.user_content_progress` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.content_categories` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only | Taksonomi |
| `public.vocabulary` | `rls_disabled_in_public` | RLS aç; global sözlük ise read-only | Katalog veri |
| `public.user_favorites` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.content_ratings` | `rls_disabled_in_public` | RLS aç; kullanıcı kendi rating satırını yönetebilsin, aggregate ayrı view ile | Base table'ı açma |
| `public.content_feedback` | `rls_disabled_in_public` | RLS aç; own-only veya admin/service read | Geri bildirim verisi |
| `public.api_costs` | `rls_disabled_in_public` | RLS aç; anon/authenticated erişimini kapat, service/admin only | Finansal/operasyonel veri |
| `public.word_mastery` | `rls_disabled_in_public` | RLS aç; own-only | Öğrenme verisi |
| `public.quiz_attempts` | `rls_disabled_in_public` | RLS aç; own-only | Sınav geçmişi |
| `public.user_vocabulary` | `rls_disabled_in_public` | RLS aç; own-only | Kullanıcı kelime verisi |
| `public.pattern_library` | `rls_disabled_in_public` | RLS aç; global katalog ise read-only | İçerik/ref veri |
| `public.quest_nodes` | `rls_disabled_in_public` | RLS aç; global quest graph ise read-only | Referans yapı |
| `public.user_goals` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.user_achievements` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.achievements` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only | Referans tablo |
| `public.xp_transactions` | `rls_disabled_in_public` | RLS aç; own-only, insert/update service/backend | Finansal benzeri audit veri |
| `public.daily_quests` | `rls_disabled_in_public` | RLS aç; global tanım ise read-only, kullanıcıya özgüyse own-only | Model netleştirilmeli |
| `public.xp_reward_config` | `rls_disabled_in_public` | RLS aç; read-only, write admin/service | Sistem konfigürasyonu |
| `public.sector_quest_templates` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only | Şablon/ref veri |
| `public.user_gamification` | `rls_disabled_in_public` | RLS aç; own-only | Kullanıcı durum verisi |
| `public.user_quest_progress` | `rls_disabled_in_public` | RLS aç; own-only | `user_id` bazlı |
| `public.vocabulary_generation_jobs` | `rls_disabled_in_public` | RLS aç; kullanıcı kendi job'ını görsün, write service/backend | Job/queue verisi |
| `public.vocabulary_topics` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only | Taksonomi/ref veri |
| `public.topic_vocabulary` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only | Join/ref tablo |
| `public.documents` | `rls_disabled_in_public` | RLS aç; own-only | Belge içeriği hassas olabilir |
| `public.subscription_plans` | `rls_disabled_in_public` | RLS aç; public/authenticated read-only, write admin/service | Fiyat/plan kataloğu |
| `public.user_listening_stats` | `rls_disabled_in_public` | RLS aç; own-only | Kullanıcı istatistiği |
| `public.listening_sessions` | `rls_disabled_in_public` | RLS aç; own-only | Ham davranış verisi |
| `public.vocabulary_mastery_extended` | `rls_disabled_in_public` | RLS aç; own-only veya base tablo yerine internal/reporting amaçlı tut | View benzeri geniş veri |

## Önerilen Uygulama Sırası

1. Dört view'ı `security_invoker` yap.
2. İç sistem ve hassas kullanıcı tablolarında RLS'yi hemen aç.
3. Önce `SELECT` policy'lerini ekle, sonra `INSERT/UPDATE/DELETE` policy'lerini aç.
4. Public katalog tablolarını ayrı migration ile read-only hale getir.
5. Leaderboard/aggregate gereksinimlerini base table yerine kontrollü view/RPC ile çöz.
6. Son aşamada `public` şemasında yeni tablo oluşturulunca otomatik RLS açan event trigger ekle.

## Ek Notlar

- RLS açıldıktan sonra policy yoksa publishable key ile API erişimi kapanır. Bu iyi bir güvenlik davranışıdır ama rollout sırasında frontend/backend sorgularını kırabilir; migration sırası dikkatli planlanmalı.
- `service_role` RLS'yi bypass ettiği için backend tarafında çalışan batch/job kodları bozulmayabilir. Buna güvenip client tarafını açık bırakmak ise doğru yaklaşım değildir.
- Sohbet, support ve attachment tablolarında `user_id` tek başına yeterli olmayabilir. Conversation membership modeline göre join-based policy yazılmalıdır.
- `weekly_scores`, `content_ratings`, `api_costs`, `xp_transactions` gibi tablolarda doğrudan base table açmak yerine daraltılmış raporlama view'ları daha güvenlidir.
- `roles`, `permissions`, `user_roles` seti yetkilendirme altyapısı ise bunları hiç client'a açmamak daha doğru olur.

## Sonuç

Bu rapordaki 72 kaydın büyük kısmı tek tek “bug” değil, aynı güvenlik modelinin eksik uygulanmasının sonucu. En doğru yaklaşım:

- public katalog tablolarını açıkça read-only yapmak,
- kullanıcı verilerini kesin biçimde owner-scoped yapmak,
- iç sistem tablolarını client'tan tamamen kapatmak,
- view'ları `security_invoker` ile RLS'ye tabi hale getirmek.

Bu dört adım uygulandığında mevcut lint raporundaki `ERROR` kayıtlarının tamamı kapatılabilir.

## Sonraki Durum

Bu rapora göre hazırlanan migration seti sonrası kalan son 8 tablo için ek migration hazırlandı:

- `backend/migrations/20260616_04_enable_rls_phase2_remaining8.sql`

Bu dosya şu varsayımlarla çalışır:

- `content_tags`, `content_folders`, `topic_nodes`, `content_items`, `content_relations`, `content_categories` global/editorial içerik graph verisidir ve public read-only kalabilir.
- `generated_suggestions` hem public seed satırları hem de ileride kullanıcıya özel satırlar içerebilir. Bu yüzden policy public seed UUID + owner read modeliyle yazıldı.
- `suggestion_click_logs` şu an analytics/internal kabul edilip client erişimine kapatıldı.

## Manuel Yapılacaklar

- Supabase Dashboard > Security Advisor ekranını yenileyip `ERROR` sayısının gerçekten `0` olduğunu doğrula.
- Supabase SQL Editor veya Table Editor üzerinden şu tablolarda RLS'nin açık olduğunu tek tek kontrol et:
  `generated_suggestions`, `suggestion_click_logs`, `content_tags`, `content_folders`, `topic_nodes`, `content_items`, `content_relations`, `content_categories`.
- Anon client ile uygulamanın public içerik akışlarını test et:
  topic/detail önerileri, content graph okuma, kategori listeleri, içerik listeleme gibi endpoint'ler hata vermemeli.
- Authenticated user ile own-data akışlarını test et:
  user settings, favorites, documents, listening sessions, gamification, vocabulary, conversations, support chat.
- Admin veya backend job kullanan akışları test et:
  suggestion üretimi, vocabulary generation jobs, support/admin message akışları, analytics/log yazımları.
- `suggestion_click_logs` için karar ver:
  eğer bu tabloya doğrudan frontend yazıyorsa mevcut internal-only politika yeterli olmayabilir; bu durumda `INSERT` için kontrollü bir authenticated policy eklenmeli.
- `generated_suggestions` tablosunda public seed kayıtlarının gerçekten `user_id = '00000000-0000-0000-0000-000000000000'` ile tutulduğunu doğrula.
- Supabase API veya frontend tarafında 401/403 dönen sorguları loglardan kontrol et; yeni RLS politikaları yüzünden kırılan endpoint varsa ilgili tablo için policy daraltması/genişletmesi yap.
- Dashboard > API > Query / logs tarafında özellikle `permission denied`, `new row violates row-level security policy`, `row security policy` hatalarını birkaç gün izle.
- Yeni oluşturulacak `public` tablolar için ekip kuralı koy:
  migration yazılırken aynı PR içinde `ENABLE ROW LEVEL SECURITY` ve policy'ler de eklenmeli.
- İstersen ileride otomasyon için `public` şemasında yeni tablo oluşunca otomatik RLS açan event trigger migration'ını ayrıca ekle.
