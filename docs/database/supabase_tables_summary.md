# Supabase Veritabanı Tabloları

> **Oluşturulma:** 2026-01-21 | **Güncelleme:** 2026-01-21 | **Versiyon:** 1.0

Bu dosya `scripts/export_database_schema.js` tarafından otomatik oluşturulmuştur.

## Tablo Listesi

| Tablo Adı | Durum | Satır Sayısı | Kolon Sayısı |
|-----------|-------|--------------|--------------|
| users | ✅ | 39 | 31 |
| plans | ✅ | - | 0 |
| subscriptions | ✅ | 86 | 27 |
| conversations | ✅ | 70 | 13 |
| messages | ✅ | 299 | 8 |
| books | ✅ | 26 | 12 |
| book_chapters | ✅ | 988 | 8 |
| chapter_audio | ✅ | 17 | 8 |
| topics | ✅ | 355 | 15 |
| topic_contents | ✅ | 135 | 21 |
| content_history | ✅ | - | 0 |
| user_vocabulary | ✅ | 136 | 17 |
| user_interests | ✅ | 17 | 4 |
| user_favorites | ✅ | - | 0 |
| user_book_progress | ✅ | - | 0 |
| documents | ✅ | 5 | 10 |
| document_sections | ✅ | 528 | 7 |
| notifications | ✅ | 217 | 9 |
| device_tokens | ✅ | 69 | 9 |
| user_insights | ✅ | 22 | 9 |
| api_costs | ✅ | 377 | 10 |
| pattern_library | ✅ | 9260 | 12 |
| daily_usage_patterns | ✅ | 158 | 10 |
| content_ratings | ✅ | 2 | 7 |
| content_feedback | ✅ | - | 0 |
| payment_providers | ✅ | 2 | 16 |
| card_transactions | ✅ | - | 0 |
| support_conversations | ✅ | 12 | 9 |
| support_messages | ✅ | 55 | 8 |
| support_message_attachments | ✅ | 3 | 7 |
| user_gamification | ✅ | 6 | 15 |
| user_goals | ✅ | - | 0 |
| achievements | ✅ | 27 | 16 |
| user_achievements | ✅ | 2 | 4 |
| quest_nodes | ✅ | 11 | 20 |
| user_quest_progress | ✅ | 3 | 7 |
| daily_quests | ✅ | 136 | 14 |
| word_reviews | ✅ | 28 | 13 |
| word_mastery | ✅ | - | 0 |
| quiz_attempts | ✅ | - | 0 |
| xp_transactions | ✅ | 33 | 9 |
| weekly_scores | ✅ | 3 | 13 |
| leagues | ✅ | 5 | 9 |
| weekly_challenges | ✅ | 1 | 14 |
| user_challenge_progress | ✅ | 1 | 10 |
| user_topic_mastery | ✅ | - | 0 |
| user_preference_cache | ✅ | - | 0 |
| content_categories | ✅ | 10 | 9 |
| sectors | ✅ | - | 0 |
| user_sectors | ✅ | - | 0 |
| sector_content | ✅ | - | 0 |
| sector_vocabulary | ✅ | - | 0 |
| user_sector_content_progress | ✅ | - | 0 |
| user_sector_stats | ✅ | - | 0 |
| sector_quizzes | ✅ | - | 0 |
| user_quiz_results | ✅ | - | 0 |
| sector_modules | ✅ | - | 0 |
| module_items | ✅ | - | 0 |
| user_module_progress | ✅ | - | 0 |
| user_module_item_progress | ✅ | - | 0 |
| external_services | ✅ | 1 | 9 |
| user_settings | ✅ | 12 | 5 |
| hobby_suggestions | ✅ | 600 | 5 |
| parameters | ✅ | 3 | 6 |

## Toplam: 64 aktif tablo

---

## Tablo Detayları

### users

- **Satır Sayısı:** 39
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| firstname | Enes |
| lastname | Apple |
| email | fr2dvrt5gr@privaterelay.appleid.com |
| phonenumber | +901112223333 |
| password | apple-oauth |
| role | premium |
| isverified | true |
| verificationmethod | null... |
| verificationtoken | null... |
| verificationexpires | null... |
| resetpasswordtoken | null... |
| resetpasswordexpires | null... |
| dailycontentused | 0 |
| lastcontentdate | null... |
| stripecustomerid | null... |
| created_at | 2025-10-23T21:10:35.886+00:00 |
| updated_at | 2025-10-23T21:10:35.886+00:00 |
| reminder_settings | {"endTime":"18:00","isEnabled":false,"startTime":"... |
| reset_password_token | null... |
| reset_password_expires | null... |
| verification_token | null... |
| verification_expires | null... |
| is_test_user | false |
| locale | tr |
| default_level | B1 |
| cefr_level | B1 |
| vocabulary_size_estimate | 2500 |
| placement_test_at | null... |
| insight_embedding | null... |
| embedding_updated_at | null... |

### plans

- **Satır Sayısı:** N/A

### subscriptions

- **Satır Sayısı:** 86
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 8fe41143-6cbd-49d3-9daa-c7c1012a5353 |
| user_id | a514fce0-aede-4263-9c81-9dde2e481b60 |
| plantype | Free Trial |
| status | active |
| startdate | 2025-12-25T08:12:27.249+00:00 |
| enddate | 2026-12-25T08:12:27.249+00:00 |
| stripesubscriptionid | null... |
| stripepriceid | 88b38204-e22b-45b8-8043-4b8013462186 |
| cancelatperiodend | null... |
| lastbillingdate | null... |
| nextbillingdate | null... |
| created_at | 2025-12-25T08:12:27.249+00:00 |
| updated_at | 2025-12-25T08:12:27.249+00:00 |
| provider | null... |
| product_id | null... |
| apple_original_transaction_id | null... |
| apple_latest_transaction_id | null... |
| expires_at | null... |
| environment | null... |
| audio_creation_count | 0 |
| apple_transaction_id | null... |
| apple_receipt_data | null... |
| current_period_start | null... |
| google_purchase_token | null... |
| user_email | null... |
| google_subscription_status | null... |
| google_auto_renew_status | true |

### conversations

- **Satır Sayısı:** 70
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 188bf77b-ae57-4a61-8f90-ca11318a0331 |
| user_id | c9b7c807-44c9-4fce-8473-fc227fb9ba5c |
| subject | ilk mesaj |
| status | open |
| priority | medium |
| created_at | 2025-08-29T20:43:09.935834+00:00 |
| updated_at | 2025-08-29T20:43:09.935834+00:00 |
| last_message_at | 2025-08-29T20:43:09.935834+00:00 |
| admin_id | null... |
| suggested_topic | null... |
| current_mood | null... |
| conversation_summary | null... |
| summary_updated_at | null... |

### messages

- **Satır Sayısı:** 299
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 0f41e9cc-7a87-4990-a99e-95566f9f82f7 |
| conversation_id | 6fb52a19-017b-481e-ab35-8f942f8b64f1 |
| sender_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| sender_type | user |
| content | bu gün ne önerirsin bana |
| is_read | false |
| created_at | 2025-11-29T18:29:21.674964+00:00 |
| updated_at | 2025-11-29T18:29:21.674964+00:00 |

### books

- **Satır Sayısı:** 26
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| gutendex_id | 2701 |
| title | Moby Dick; Or, The Whale |
| authors | Herman Melville |
| cover_url | null... |
| download_count | null... |
| language | English |
| copyright | null... |
| subjects | null... |
| created_at | null... |
| text_url | https://www.gutenberg.org/cache/epub/2701/pg2701.t |
| voice_settings | {}... |

### book_chapters

- **Satır Sayısı:** 988
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| book_id | 1 |
| chapter_index | 1 |
| chapter_title | Epilogue |
| chapter_text | Original Transcriber’s Notes:





This text is a  |
| created_at | 2025-08-14T20:04:41.516841+00:00 |
| updated_at | 2025-08-14T20:04:41.516841+00:00 |
| director_analysis | null... |

### chapter_audio

- **Satır Sayısı:** 17
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 24 |
| chapter_id | 2 |
| voice_model | en-GB-Chirp3-HD-Kore |
| speaking_rate | 1 |
| level | b1 |
| mp3_url | https://ffqfcmmbeeieouoghrac.supabase.co/storage/v |
| vtt_url | /api/tts/vtt/vtt_1755202540544_8buukjfed |
| created_at | 2025-08-14T20:15:43.96 |

### topics

- **Satır Sayısı:** 355
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | d577b712-a990-4e44-9f06-6417490699a2 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| parent_id | null... |
| title | Elazığ |
| description | null... |
| level | A1 |
| depth | 0 |
| order_index | 0 |
| is_manual | true |
| keywords | null... |
| created_at | 2025-11-21T18:39:38.63529+00:00 |
| updated_at | 2025-11-21T18:39:38.63529+00:00 |
| source_type | chat |
| source_id | null... |
| mood_tag | null... |

### topic_contents

- **Satır Sayısı:** 135
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 917e2d24-fdcd-4967-93d0-0f4ef9c31b93 |
| topic_id | 2b6c112c-c7f1-408a-82d4-fbf2c97d8ca7 |
| mp3_url | https://ffqfcmmbeeieouoghrac.supabase.co/storage/v |
| vtt_url | /api/tts/vtt/vtt_1763824578938_7v4tkjpit |
| text_content | Elaz is a city in Turkey Elaz has a special climat |
| translated_text | Elazığ, Türkiye'de bir şehirdir. Elazığ'ın özel bi |
| adapted_text | Elazığ is a city in Turkey. Elazığ has a special c |
| level | A1 |
| voice_model | Danielle |
| speaking_rate | 0.8 |
| duration_seconds | 85 |
| words | ["Elazığ","is","a","city","in","Turkey.","Elazığ",... |
| timepoints | [{"word":"Elazığ","index":0,"timeSeconds":0.025,"h... |
| created_at | 2025-11-22T15:16:21.06288+00:00 |
| listened_at | 2025-12-08T16:50:54.353+00:00 |
| target_duration_minutes | null... |
| last_position_seconds | 0 |
| total_duration_seconds | 0 |
| progress_percentage | 0 |
| last_listened_at | null... |
| is_completed | false |

### content_history

- **Satır Sayısı:** N/A

### user_vocabulary

- **Satır Sayısı:** 136
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 105 |
| user_id | f7afb7e5-adc1-47b5-808b-3c6060e956cd |
| is_learned | false |
| created_at | 2025-12-02T18:01:06.556+00:00 |
| updated_at | 2025-12-02T18:01:06.682155+00:00 |
| original_sentence | it embraces a plethora of elements ranging from th |
| word_id | 84 |
| translated_sentence | - |
| next_review_at | 2025-12-26T20:31:21.827761+00:00 |
| last_reviewed_at | null... |
| interval_days | 0 |
| ease_factor | 2.5 |
| streak | 0 |
| review_count | 0 |
| status | new |
| type | word |
| notes | null... |

### user_interests

- **Satır Sayısı:** 17
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | debd3998-2d9f-462f-bf95-ca67a195c52f |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| interest_keyword | Kıbrıs |
| created_at | 2025-05-18T12:26:20.609598 |

### user_favorites

- **Satır Sayısı:** N/A

### user_book_progress

- **Satır Sayısı:** N/A

### documents

- **Satır Sayısı:** 5
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| title | ElifSafak_ASK_pdf2 |
| original_filename | null... |
| mime_type | text/plain |
| page_count | null... |
| language | null... |
| created_at | 2025-11-22T20:51:52.685+00:00 |
| cover_image_url | null... |
| author | null... |

### document_sections

- **Satır Sayısı:** 528
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 10 |
| document_id | 2 |
| section_index | 1 |
| section_title | 13 |
| section_text | 13 
  
 
  
günlerin akışı; öylesine yeknesak, düz |
| word_count | 522 |
| created_at | 2025-11-22T20:56:58.142+00:00 |

### notifications

- **Satır Sayısı:** 217
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 9faf759e-4047-4980-851b-390ea1e1b497 |
| user_id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| title | ❌ Podcast Oluşturulamadı |
| body | Bir hata oluştu. Lütfen tekrar deneyin. |
| type | podcast_failed |
| data | {"error":"createGoogleTTSPodcast failed to save to... |
| is_read | false |
| created_at | 2025-12-26T07:07:59.615+00:00 |
| read_at | null... |

### device_tokens

- **Satır Sayısı:** 69
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | f5393143-5b44-45b6-aef9-4d1e4cf5f79e |
| user_id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| platform | ios |
| token | d8yREw0Y-UZyo8-XGAzgeX:APA91bFizh06pPb0f1wQq0jA9b7 |
| device_id | null... |
| app_version | null... |
| is_active | false |
| created_at | 2025-11-28T09:00:44.164735+00:00 |
| updated_at | 2025-11-28T11:00:23.868+00:00 |

### user_insights

- **Satır Sayısı:** 22
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 12fc7da2-af3d-45e1-b351-79e69fd928e6 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| insight_type | preference |
| insight_value | Sesli içerik oluşturmayı tercih ediyor |
| confidence | 85 |
| source_conversation_id | null... |
| is_active | true |
| created_at | 2025-12-21T18:39:19.431358+00:00 |
| updated_at | 2025-12-21T18:39:19.431358+00:00 |

### api_costs

- **Satır Sayısı:** 377
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 3334703b-ffe0-4202-bf4c-705da9455267 |
| user_id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| feature | topic_subtopics |
| provider | openai |
| model | gpt-4o-mini |
| input_quantity | 777 |
| output_quantity | 366 |
| cost_usd | 0.000336 |
| metadata | {"topic_id":"a5385eef-32e2-47ad-a0a1-a7f1137823a0"... |
| created_at | 2025-12-24T08:10:11.180231+00:00 |

### pattern_library

- **Satır Sayısı:** 9260
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 0245a226-9e9a-4fc7-9ee1-a98421e25f40 |
| lang | en |
| type | idiom |
| text | Burning the midnight oil |
| translation | Gece yarısı yağ yakmak |
| explanation | To stay up late working or studying. |
| level | B2 |
| category | null... |
| example_text | I had to burn the midnight oil to finish my projec |
| example_translation | Projemi zamanında bitirmek için gece yarısı yağ ya |
| source | llm_generated |
| created_at | 2025-12-28T15:15:27.809307+00:00 |

### daily_usage_patterns

- **Satır Sayısı:** 158
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | b0a60b91-500b-4339-b411-0349ff4bd609 |
| user_id | f7afb7e5-adc1-47b5-808b-3c6060e956cd |
| topic | Sivil havacılık, 20. yüzyılın başlarından itibaren |
| level | B1 |
| request_id | 29c8f87d-45c0-4f38-b8fc-bef85f8055ad |
| pattern_count | 8 |
| patterns | [{"pattern":"make it a global village","category":... |
| raw_response | {"level":"B1","daily_patterns":[{"pattern":"make i |
| adapted_text_length | 5036 |
| created_at | 2025-11-17T12:14:29.074572+00:00 |

### content_ratings

- **Satır Sayısı:** 2
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | dcffeee8-cd47-46d8-a898-c5348ffe1df8 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| content_id | 1fee7830-0ed3-4fc5-b847-8f515629f239 |
| content_type | topic |
| rating | 1 |
| created_at | 2026-01-04T16:55:12.44655+00:00 |
| updated_at | 2026-01-04T16:55:12.44655+00:00 |

### content_feedback

- **Satır Sayısı:** N/A

### payment_providers

- **Satır Sayısı:** 2
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 8ae40792-27de-4e17-b9db-b29377bfd749 |
| name | iyzico |
| display_name | iyzico |
| is_active | false |
| is_default | false |
| environment | sandbox |
| api_key | null... |
| secret_key | null... |
| base_url | null... |
| settings | {}... |
| supported_features | {"refund":true,"recurring":false,"creditCard":true... |
| commission_rates | {"debitCard":1.79,"creditCard":2.49,"installment":... |
| last_tested_at | null... |
| test_result | null... |
| created_at | 2025-12-07T11:06:21.478632+00:00 |
| updated_at | 2025-12-07T11:06:21.478632+00:00 |

### card_transactions

- **Satır Sayısı:** N/A

### support_conversations

- **Satır Sayısı:** 12
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 22803c08-a388-4299-92c3-b67631cadb6c |
| user_id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| subject | Prod testi |
| status | in_progress |
| priority | medium |
| created_at | 2025-11-28T13:36:53.528032+00:00 |
| updated_at | 2025-11-28T13:37:36.276727+00:00 |
| last_message_at | 2025-11-28T13:37:36.276727+00:00 |
| admin_id | f7afb7e5-adc1-47b5-808b-3c6060e956cd |

### support_messages

- **Satır Sayısı:** 55
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | ddc26389-7493-47ec-bfd0-02297c20f0d8 |
| conversation_id | 4458a107-07ed-471b-b30a-614fa5b2fe21 |
| sender_id | 33cd6d00-76d0-475d-b56f-85632d881cbd |
| sender_type | user |
| content | İlk mesaj |
| is_read | true |
| created_at | 2025-11-22T13:02:23.542636+00:00 |
| updated_at | 2025-11-22T13:02:23.542636+00:00 |

### support_message_attachments

- **Satır Sayısı:** 3
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 9791d619-d883-45f9-95ef-66b883c10b73 |
| message_id | 2992c79a-b763-401c-99fe-26c5c6f130fb |
| filename | 312.jpg |
| file_path | https://ffqfcmmbeeieouoghrac.supabase.co/storage/v |
| file_size | 44223 |
| mime_type | image/jpeg |
| created_at | 2025-11-22T14:37:51.482234+00:00 |

### user_gamification

- **Satır Sayısı:** 6
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| user_id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| current_level | 1 |
| current_xp | 0 |
| total_lifetime_xp | 0 |
| streak_count | 0 |
| longest_streak | 0 |
| last_activity_date | 2025-12-27 |
| freeze_balance | 0 |
| archetype | null... |
| onboarding_completed | false |
| created_at | 2025-12-27T19:21:18.230846+00:00 |
| updated_at | 2025-12-27T19:21:18.230846+00:00 |
| streak_society | null... |
| streak_badge_url | null... |
| current_league | seed |

### user_goals

- **Satır Sayısı:** N/A

### achievements

- **Satır Sayısı:** 27
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| code | STREAK_3 |
| category | streak |
| title_tr | Ateş Başladı |
| title_en | Fire Started |
| description_tr | 3 gün üst üste giriş yaptın! |
| description_en | null... |
| icon_url | null... |
| icon_emoji | 🔥 |
| xp_reward | 50 |
| rarity | common |
| condition_type | streak_days |
| condition_value | 3 |
| is_hidden | false |
| sort_order | 1 |
| created_at | 2025-12-27T19:21:09.709236 |

### user_achievements

- **Satır Sayısı:** 2
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| user_id | f7afb7e5-adc1-47b5-808b-3c6060e956cd |
| achievement_id | 1 |
| earned_at | 2026-01-07T14:46:31.37849+00:00 |
| notified | false |

### quest_nodes

- **Satır Sayısı:** 11
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| title | Kelime Kartları ile Başla |
| description | Günlük 10 kelime tekrarı yaparak hafızanı güçlendi |
| step_order | 1 |
| week_number | 1 |
| required_level | 1 |
| prerequisite_node_id | null... |
| reward_xp | 100 |
| task_type | vocabulary |
| task_subtype | null... |
| content_reference_id | null... |
| content_config | null... |
| estimated_minutes | 10 |
| is_major_milestone | false |
| icon_emoji | 📚 |
| created_at | 2026-01-18T07:23:14.288856 |
| required_daily_completions | 3 |
| current_daily_completions | 0 |
| content_type | null... |
| content_filter | {}... |

### user_quest_progress

- **Satır Sayısı:** 3
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| node_id | 1 |
| status | completed |
| started_at | null... |
| completed_at | 2026-01-18T16:36:01.983083 |
| score | 100 |
| attempts | 0 |

### daily_quests

- **Satır Sayısı:** 136
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 75115693-de78-4a3e-baea-07826d876b8d |
| user_id | f6e9f0df-1296-4eae-84ce-e7c5adaf0d7f |
| quest_date | 2025-12-27 |
| task_type | listen_content |
| task_title | İçerik dinle |
| target_amount | 1 |
| current_amount | 0 |
| xp_reward | 50 |
| is_completed | false |
| is_claimed | false |
| expires_at | null... |
| created_at | 2025-12-27T19:21:18.426111+00:00 |
| parent_quest_node_id | null... |
| contribution_weight | 0.2 |

### word_reviews

- **Satır Sayısı:** 28
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 4 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| word | questions |
| definition | [{"level": "A2", "definition": "sorular", "example |
| example_sentence | You can ask questions |
| next_review_date | 2026-01-19 |
| interval_days | 1 |
| ease_factor | 2.5 |
| repetition_count | 1 |
| streak_correct | 1 |
| last_reviewed_at | 2026-01-18T12:47:10.761056 |
| source_content_id | null... |
| created_at | 2026-01-18T08:37:31.99741+00:00 |

### word_mastery

- **Satır Sayısı:** N/A

### quiz_attempts

- **Satır Sayısı:** N/A

### xp_transactions

- **Satır Sayısı:** 33
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | e90510d3-fa7a-4393-82dd-86dda7dd1bba |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| amount | 25 |
| source | streak |
| source_id | null... |
| description | 1 günlük seri bonusu |
| level_before | 1 |
| level_after | 1 |
| created_at | 2025-12-28T07:07:41.220043+00:00 |

### weekly_scores

- **Satır Sayısı:** 3
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 205e1fac-6b8e-4937-b668-6948326e8a03 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| week_start | 2026-01-11 |
| xp_earned | 75 |
| listening_minutes | 0 |
| content_completed | 0 |
| words_learned | 0 |
| rank | null... |
| league | seed |
| promoted | false |
| demoted | false |
| created_at | 2026-01-17T21:15:20.500312+00:00 |
| updated_at | 2026-01-17T21:15:20.500312+00:00 |

### leagues

- **Satır Sayısı:** 5
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| code | seed |
| name_tr | Tohum |
| name_en | Seed |
| icon | 🌱 |
| rank_order | 1 |
| min_xp_to_promote | 0 |
| demotion_zone | 5 |
| promotion_zone | 10 |

### weekly_challenges

- **Satır Sayısı:** 1
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| title_tr | Bilim ve Teknoloji Maratonu |
| title_en | Science & Technology Marathon |
| description_tr | Bu hafta bilim ve teknoloji konularında kendini ge |
| description_en | null... |
| theme | science |
| theme_icon | 🔬 |
| week_start | 2026-01-12 |
| week_end | 2026-01-18 |
| tasks | [{"type":"listen_content","target":3,"title_en":"L... |
| badge_code | CHALLENGE_FIRST |
| total_xp_reward | 500 |
| is_active | true |
| created_at | 2026-01-17T19:48:49.637537 |

### user_challenge_progress

- **Satır Sayısı:** 1
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | c4b8751f-7ee9-4975-93de-cb9a8bda8dc8 |
| user_id | 153fe018-0124-43e4-b2e8-dca91f1eb9d4 |
| challenge_id | 1 |
| joined_at | 2026-01-18T18:44:46.587089+00:00 |
| tasks_progress | {"0":3}... |
| completed_tasks | 1 |
| total_xp_earned | 150 |
| is_completed | false |
| completed_at | null... |
| badge_claimed | false |

### user_topic_mastery

- **Satır Sayısı:** N/A

### user_preference_cache

- **Satır Sayısı:** N/A

### content_categories

- **Satır Sayısı:** 10
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1 |
| code | business |
| name_tr | İş İngilizcesi |
| name_en | Business English |
| parent_code | null... |
| icon_emoji | 💼 |
| suggested_cefr | B1 |
| word_count | 0 |
| created_at | 2026-01-18T18:37:47.855799 |

### sectors

- **Satır Sayısı:** N/A

### user_sectors

- **Satır Sayısı:** N/A

### sector_content

- **Satır Sayısı:** N/A

### sector_vocabulary

- **Satır Sayısı:** N/A

### user_sector_content_progress

- **Satır Sayısı:** N/A

### user_sector_stats

- **Satır Sayısı:** N/A

### sector_quizzes

- **Satır Sayısı:** N/A

### user_quiz_results

- **Satır Sayısı:** N/A

### sector_modules

- **Satır Sayısı:** N/A

### module_items

- **Satır Sayısı:** N/A

### user_module_progress

- **Satır Sayısı:** N/A

### user_module_item_progress

- **Satır Sayısı:** N/A

### external_services

- **Satır Sayısı:** 1
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 9f3e79ef-70a5-4c62-afc4-88c613492f37 |
| service_name | podcast_generator |
| display_name | Podcast Generator (n8n) |
| description | n8n workflow for AI-powered podcast generation wit |
| api_url | https://n8n.booklevel.store/webhook/create-podcast |
| api_token | mK8vXp2Rq9Yw3Tz5Hn7Js4 |
| is_active | true |
| created_at | 2025-10-29T19:59:16.957144+00:00 |
| updated_at | 2025-10-29T19:59:16.957144+00:00 |

### user_settings

- **Satır Sayısı:** 12
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| user_id | 33cd6d00-76d0-475d-b56f-85632d881cbd |
| default_voice | null... |
| settings | {"favorites":["9d055d77-1704-42a2-abf6-aee24e97405... |
| created_at | 2025-11-11T15:02:51.592643+00:00 |
| updated_at | 2025-11-24T20:16:38.03167+00:00 |

### hobby_suggestions

- **Satır Sayısı:** 600
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | eae9aeee-d1d6-4db4-af44-74ceec6c60e6 |
| hobby | Girişimcilik |
| suggestion | Girişimcilik Temelleri, iş dünyasına adım atarken  |
| created_at | 2025-11-09T13:36:55.686659+00:00 |
| updated_at | 2025-11-09T13:36:55.686659+00:00 |

### parameters

- **Satır Sayısı:** 3
- **Kolonlar:**

| Kolon | Örnek Değer |
|-------|-------------|
| id | 1f03be88-ebaf-428c-afc5-6cb9eec339b4 |
| key | mock_content_save_enabled |
| value | false |
| description | Enable mock content saving instead of real databas |
| created_at | 2025-06-13T10:30:12.663062+00:00 |
| updated_at | 2025-06-13T10:30:12.663062+00:00 |

