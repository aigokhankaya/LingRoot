# Database Schema Overview

> **Oluşturulma:** 2025-01-01 | **Güncelleme:** 2026-02-04 | **Versiyon:** 2.7

**Database:** PostgreSQL (Supabase)
**Total Tables:** 83+ (including views)
**Migrations:** `/backend/migrations/`

> 📘 **Detaylı Kolon Referansı:** Tüm tabloların tam kolon listesi için [complete-column-reference.md](./complete-column-reference.md) dosyasına bakın.

---

## Quick Reference - Table Categories

| Kategori | Tablolar |
|----------|----------|
| **Core User** | users, plans, subscriptions |
| **Authentication** | device_tokens, user_settings |
| **Content** | topics, topic_contents, content_history, books, book_chapters, chapter_audio, documents, document_sections |
| **Vocabulary** | user_vocabulary, word_reviews, word_mastery, pattern_library |
| **AI Chat** | conversations, messages, user_insights, user_preference_cache, user_memory |
| **Gamification** | user_gamification, user_goals, achievements, user_achievements, quest_nodes, user_quest_progress, daily_quests, xp_transactions, weekly_scores, leagues, weekly_challenges, user_challenge_progress, content_categories, user_topic_mastery, quiz_attempts |
| **Sector English** | sectors, user_sectors, sector_content, sector_vocabulary, user_sector_content_progress, user_sector_stats, sector_quizzes, user_quiz_results, sector_modules, module_items, user_module_progress, user_module_item_progress |
| **Payments** | payment_providers, card_transactions |
| **Support** | support_conversations, support_messages, support_message_attachments |
| **Analytics** | api_costs, daily_usage_patterns, content_ratings, content_feedback |
| **Audit** | admin_logs |
| **Recommendations** | user_content_recommendations, recommendation_interactions, recommendation_generation_status |
| **Other** | notifications, user_interests, user_favorites, user_book_progress, hobby_suggestions, parameters, external_services |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   CORE USER LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌───────────────┐         ┌───────────────┐         ┌───────────────────┐         │
│   │     users     │────────▶│     plans     │◀────────│   subscriptions   │         │
│   │  (39 rows)    │         │   (4 rows)    │         │    (86 rows)      │         │
│   │  31 columns   │         │               │         │   27 columns      │         │
│   └───────┬───────┘         └───────────────┘         └───────────────────┘         │
│           │                                                                          │
│           │ 1:N (user_id FK)                                                        │
│           ▼                                                                          │
│   ┌───────────────────────────────────────────────────────────────────────┐         │
│   │              USER CONTENT & LEARNING                                  │         │
│   ├───────────────────────────────────────────────────────────────────────┤         │
│   │  topics ────▶ topic_contents       books ────▶ book_chapters          │         │
│   │  (355)        (135)                (26)        (988)                  │         │
│   │                                                     │                 │         │
│   │  documents ──▶ document_sections                    ▼                 │         │
│   │  (5)           (528)                         chapter_audio (17)       │         │
│   └───────────────────────────────────────────────────────────────────────┘         │
│                                                                                      │
│   ┌───────────────────────────────────────────────────────────────────────┐         │
│   │                      VOCABULARY & SRS                                 │         │
│   ├───────────────────────────────────────────────────────────────────────┤         │
│   │  user_vocabulary (136) ◀──▶ word_reviews (28)                         │         │
│   │                                    │                                  │         │
│   │  pattern_library (9260)      word_mastery (0)                         │         │
│   └───────────────────────────────────────────────────────────────────────┘         │
│                                                                                      │
│   ┌───────────────────────────────────────────────────────────────────────┐         │
│   │                      GAMIFICATION SYSTEM                              │         │
│   ├───────────────────────────────────────────────────────────────────────┤         │
│   │  user_gamification (6) ◀────▶ user_goals (0)                          │         │
│   │        │                            │                                 │         │
│   │        ▼                            ▼                                 │         │
│   │  achievements (27) ◀───▶ user_achievements (2)                        │         │
│   │        │                                                              │         │
│   │        ▼                                                              │         │
│   │  quest_nodes (11) ◀───▶ user_quest_progress (3)                       │         │
│   │        │                           │                                  │         │
│   │        ▼                           ▼                                  │         │
│   │  daily_quests (136)         xp_transactions (33)                      │         │
│   │        │                                                              │         │
│   │        ▼                                                              │         │
│   │  weekly_scores (3) ◀───▶ leagues (5)                                  │         │
│   │  weekly_challenges (1) ◀──▶ user_challenge_progress (1)               │         │
│   └───────────────────────────────────────────────────────────────────────┘         │
│                                                                                      │
│   ┌───────────────────────────────────────────────────────────────────────┐         │
│   │                      SECTOR ENGLISH (NEW)                             │         │
│   ├───────────────────────────────────────────────────────────────────────┤         │
│   │  sectors (16 predefined) ◀──▶ user_sectors                            │         │
│   │     │                                                                 │         │
│   │     ├────▶ sector_content ◀──▶ user_sector_content_progress           │         │
│   │     ├────▶ sector_vocabulary                                          │         │
│   │     ├────▶ sector_quizzes ◀──▶ user_quiz_results                      │         │
│   │     └────▶ sector_modules ──▶ module_items                            │         │
│   │                  │               │                                    │         │
│   │                  ▼               ▼                                    │         │
│   │           user_module_progress   user_module_item_progress            │         │
│   └───────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Core User Tables

### users (39 rows, 31 columns)
Primary user table with authentication and profile data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password | VARCHAR(255) | Hashed password |
| firstname | VARCHAR(100) | First name |
| lastname | VARCHAR(100) | Last name |
| phonenumber | VARCHAR(20) | Phone number |
| role | VARCHAR(20) | user, admin, premium |
| isverified | BOOLEAN | Email verification status |
| cefr_level | VARCHAR(10) | Current CEFR level (A1-C2) |
| default_level | VARCHAR(10) | Default content level |
| vocabulary_size_estimate | INTEGER | Estimated vocabulary size |
| placement_test_at | TIMESTAMP | Last placement test date |
| reminder_settings | JSONB | Notification preferences |
| is_test_user | BOOLEAN | Test user flag |
| locale | VARCHAR(10) | User locale (tr, en) |
| insight_embedding | VECTOR(1536) | AI preference embedding |
| embedding_updated_at | TIMESTAMP | Embedding update timestamp |
| created_at | TIMESTAMPTZ | Account creation date |
| updated_at | TIMESTAMPTZ | Last update date |

### plans (4 rows)
Subscription plan definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(50) | Plan name (Free, Basic, Pro, Enterprise) |
| price | DECIMAL(10,2) | Monthly price |
| currency | VARCHAR(3) | Currency code (TRY) |
| daily_limit | INTEGER | Daily content limit |
| monthly_limit | INTEGER | Monthly content limit |
| features | JSONB | Feature flags |
| google_product_id | VARCHAR(100) | Google Play product ID |
| apple_product_id | VARCHAR(100) | App Store product ID |
| is_active | BOOLEAN | Active status |
| promotion_active | BOOLEAN | Promotion display enabled (default false) |
| promotion_discount_percentage | INTEGER | Discount percentage for display (e.g. 50) |
| promotion_original_price | NUMERIC | Original price in TRY for display |
| promotion_price | NUMERIC | Promotional price in TRY for display |
| promotion_start_date | TIMESTAMPTZ | Campaign start date |
| promotion_end_date | TIMESTAMPTZ | Campaign end date |
| promotion_badge_text | TEXT | Badge text shown on mobile |
| promotion_description | TEXT | Optional promotional description |

### subscriptions (86 rows, 27 columns)
User subscription records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| plantype | VARCHAR(50) | Plan name |
| status | VARCHAR(20) | active, cancelled, expired |
| startdate | TIMESTAMPTZ | Subscription start |
| enddate | TIMESTAMPTZ | Subscription end |
| provider | VARCHAR(50) | stripe, apple, google |
| audio_creation_count | INTEGER | Usage counter |
| apple_transaction_id | TEXT | Apple IAP transaction |
| apple_receipt_data | TEXT | Apple receipt |
| google_purchase_token | TEXT | Google Play token |
| google_subscription_status | VARCHAR(50) | Google sub status |
| google_auto_renew_status | BOOLEAN | Auto-renew flag |

---

## 2. Content Tables

### topics (355 rows, 15 columns)
User-created topic hierarchy for content generation.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| parent_id | UUID | FK → topics (for subtopics) |
| title | TEXT | Topic title |
| description | TEXT | Topic description |
| level | VARCHAR(10) | CEFR level (A1-C2) |
| depth | INTEGER | Hierarchy depth (0=root) |
| order_index | INTEGER | Sort order |
| is_manual | BOOLEAN | Manual vs AI-generated |
| keywords | TEXT[] | Suggestion keywords |
| source_type | VARCHAR(50) | chat, web, book, etc. |
| mood_tag | VARCHAR(50) | Content mood |

### topic_contents (135 rows, 21 columns)
Generated audio content for topics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| topic_id | UUID | FK → topics |
| mp3_url | TEXT | Audio file URL |
| vtt_url | TEXT | VTT subtitle URL |
| text_content | TEXT | Original text |
| translated_text | TEXT | Turkish translation |
| adapted_text | TEXT | CEFR-adapted English |
| level | VARCHAR(10) | CEFR level |
| voice_model | TEXT | TTS voice model |
| speaking_rate | FLOAT | Speech speed |
| duration_seconds | INTEGER | Audio duration |
| words | TEXT[] | Word array |
| timepoints | JSONB | Word timestamps |
| last_position_seconds | INTEGER | Playback position |
| progress_percentage | DECIMAL | Completion % |
| is_completed | BOOLEAN | Completion status |

### books (26 rows)
Gutenberg book catalog.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| gutendex_id | INTEGER | Gutenberg ID |
| title | TEXT | Book title |
| authors | TEXT | Author(s) |
| cover_url | TEXT | Cover image |
| language | VARCHAR(10) | Book language |
| text_url | TEXT | Full text URL |
| voice_settings | JSONB | TTS preferences |

### book_chapters (988 rows)
Book chapter content.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| book_id | INTEGER | FK → books |
| chapter_index | INTEGER | Chapter number |
| chapter_title | TEXT | Chapter title |
| chapter_text | TEXT | Full chapter text |
| director_analysis | JSONB | AI analysis |

### chapter_audio (17 rows)
Cached audio for book chapters.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| chapter_id | INTEGER | FK → book_chapters |
| voice_model | VARCHAR(100) | TTS voice |
| speaking_rate | DECIMAL(3,2) | Speed |
| level | VARCHAR(10) | CEFR level |
| mp3_url | VARCHAR(1000) | Audio URL |
| vtt_url | VARCHAR(1000) | Subtitle URL |

### documents (5 rows)
User-uploaded documents (PDF, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | FK → users |
| title | TEXT | Document title |
| original_filename | TEXT | Original file name |
| mime_type | TEXT | File type |
| page_count | INTEGER | Number of pages |
| cover_image_url | TEXT | Cover image |
| original_text | TEXT | Full original extracted text |
| author | TEXT | Document author |

### document_sections (528 rows)
Parsed document sections.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| document_id | INTEGER | FK → documents |
| section_index | INTEGER | Section number |
| section_title | TEXT | Section title |
| section_text | TEXT | Section content |
| word_count | INTEGER | Word count |

### contenthistory
User content creation and listening history.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| input | TEXT | Original input text/topic |
| input_type | VARCHAR(50) | topic, text, youtube, book, podcast, etc. |
| level | VARCHAR(10) | CEFR level (A1-C2) |
| mp3_url | TEXT | Generated audio URL |
| translated_text | TEXT | Turkish translation |
| adapted_text | TEXT | CEFR-adapted English text |
| words | TEXT | JSON string of word array |
| timepoints | TEXT | JSON string of word timestamps |
| duration_seconds | INTEGER | Pre-computed audio duration in seconds (DEFAULT 0) |
| dialogue_segments | TEXT | JSON string of podcast dialogue segments |
| chapter_id | INTEGER | FK → book_chapters (optional) |
| status | VARCHAR(20) | completed, in_progress |
| detected_mood | VARCHAR(50) | AI-detected content mood |
| processing_duration_ms | INTEGER | Processing time tracking |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last update date |

---

## 3. Vocabulary & SRS Tables

### user_vocabulary (136 rows, 17 columns)
User's saved vocabulary with SRS data.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | FK → users |
| word_id | INTEGER | FK → vocabulary |
| original_sentence | TEXT | Context sentence |
| translated_sentence | TEXT | Translation |
| is_learned | BOOLEAN | Mastery status |
| type | VARCHAR(20) | word, phrase, idiom |
| notes | TEXT | User notes |
| next_review_at | TIMESTAMPTZ | Next SRS review |
| interval_days | INTEGER | Current interval |
| ease_factor | DECIMAL(5,2) | SM-2 ease factor |
| streak | INTEGER | Correct streak |
| review_count | INTEGER | Total reviews |
| status | VARCHAR(20) | new, learning, review |
| sector_id | INTEGER | FK → sectors (optional) |

### word_reviews (28 rows, 13 columns)
SM-2 Spaced Repetition tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | FK → users |
| word | VARCHAR(100) | Word text |
| definition | JSONB | Multi-level definitions |
| example_sentence | TEXT | Example usage |
| next_review_date | DATE | Next review date |
| interval_days | INTEGER | SM-2 interval |
| ease_factor | DECIMAL(5,2) | SM-2 ease (default 2.5) |
| repetition_count | INTEGER | Review count |
| streak_correct | INTEGER | Consecutive correct |
| last_reviewed_at | TIMESTAMP | Last review time |
| source_content_id | UUID | Source content |

### pattern_library (9,260 rows, 12 columns)
Multilingual idiom/proverb/pattern library.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| lang | TEXT | Language (en, tr) |
| type | TEXT | idiom, proverb, pattern |
| text | TEXT | Pattern text |
| translation | TEXT | Translation |
| explanation | TEXT | Explanation |
| level | TEXT | CEFR level |
| category | TEXT | Category |
| example_text | TEXT | Usage example |
| example_translation | TEXT | Example translation |
| source | TEXT | Data source |

---

## 4. AI Chat Tables

### conversations (70 rows, 13 columns)
AI chat conversations with Liro.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| subject | TEXT | Conversation subject |
| status | VARCHAR(50) | open, closed |
| priority | VARCHAR(20) | Conversation priority |
| suggested_topic | TEXT | Extracted topic |
| current_mood | TEXT | User mood |
| conversation_summary | TEXT | AI summary |
| last_message_at | TIMESTAMPTZ | Last message time |

### messages (299 rows)
Chat messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK → conversations |
| sender_id | UUID | FK → users |
| sender_type | VARCHAR(20) | user, assistant |
| content | TEXT | Message content |
| is_read | BOOLEAN | Read status |

### user_insights (22 rows)
User preferences extracted from conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| insight_type | ENUM | like, dislike, habit, goal, trait, preference |
| insight_value | TEXT | Insight description |
| confidence | INTEGER | 0-100 confidence score |
| source_conversation_id | UUID | Source conversation |
| is_active | BOOLEAN | Active status |

### user_preference_cache (0 rows)
Aggregated user preferences for embedding.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, FK → users |
| aggregated_insights | JSONB | Combined insights |
| preference_summary | TEXT | Text summary for embedding |
| insight_count | INTEGER | Number of insights |

### user_memory (NEW - Migration 0079)
Long-term user memory for cross-session personalization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| memory_type | VARCHAR(50) | fact, event, preference, relationship, milestone |
| category | VARCHAR(50) | personal, learning, content, interaction |
| content | TEXT | Memory content |
| importance | INTEGER | 0-100 importance score |
| first_mentioned_at | TIMESTAMPTZ | First mention timestamp |
| last_referenced_at | TIMESTAMPTZ | Last reference timestamp |
| mention_count | INTEGER | Times mentioned |
| source_conversation_id | UUID | FK → conversations |
| is_active | BOOLEAN | Active status |
| expires_at | TIMESTAMPTZ | Expiry timestamp (nullable) |
| metadata | JSONB | Additional metadata |

### recommendation_interactions (NEW - Migration 0080)
Tracks proactive content recommendations shown to users during chat.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| conversation_id | UUID | FK → conversations |
| trigger_type | VARCHAR(50) | topic_detected, idle_conversation, vocabulary_opportunity, session_end |
| recommendation_data | JSONB | Recommendation details |
| accepted | BOOLEAN | User accepted? |
| selected_format | VARCHAR(50) | podcast, metin, diyalog |
| shown_at | TIMESTAMPTZ | When shown |
| responded_at | TIMESTAMPTZ | When user responded |

---

## 5. Gamification Tables

### user_gamification (6 rows, 15 columns)
User gamification profile.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, FK → users |
| current_level | INTEGER | 1-100 level |
| current_xp | INTEGER | XP in current level |
| total_lifetime_xp | INTEGER | Total XP earned |
| streak_count | INTEGER | Current streak |
| longest_streak | INTEGER | Best streak |
| last_activity_date | DATE | Last activity |
| freeze_balance | INTEGER | Streak freezes |
| archetype | VARCHAR(50) | career, travel, intellectual |
| onboarding_completed | BOOLEAN | Onboarding status |
| streak_society | VARCHAR(20) | Streak tier |
| current_league | VARCHAR(20) | Current league |

### achievements (27 rows, 16 columns)
Achievement/badge definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| code | VARCHAR(50) | Unique code (STREAK_3, etc.) |
| category | VARCHAR(50) | streak, listening, vocabulary, etc. |
| title_tr | VARCHAR(100) | Turkish title |
| title_en | VARCHAR(100) | English title |
| description_tr | TEXT | Turkish description |
| icon_emoji | VARCHAR(10) | Emoji icon |
| xp_reward | INTEGER | XP reward |
| rarity | VARCHAR(20) | common, rare, epic, legendary |
| condition_type | VARCHAR(50) | Unlock condition type |
| condition_value | INTEGER | Condition threshold |
| is_hidden | BOOLEAN | Surprise achievement |

### quest_nodes (11 rows, 20 columns)
Learning roadmap quest definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| title | VARCHAR(100) | Quest title |
| description | TEXT | Quest description |
| step_order | INTEGER | Order in roadmap |
| week_number | INTEGER | Week assignment |
| required_level | INTEGER | Minimum level |
| prerequisite_node_id | INTEGER | FK → quest_nodes |
| reward_xp | INTEGER | XP reward |
| task_type | VARCHAR(50) | content, quiz, milestone |
| task_subtype | VARCHAR(50) | Specific type |
| content_type | VARCHAR(50) | topic, word_set, quiz |
| content_filter | JSONB | Content filtering rules |
| estimated_minutes | INTEGER | Time estimate |
| is_major_milestone | BOOLEAN | Major milestone flag |
| icon_emoji | VARCHAR(10) | Display icon |
| required_daily_completions | INTEGER | Daily quest count |
| sector_id | INTEGER | FK → sectors (optional) |

### daily_quests (136 rows, 15 columns)
Daily quest assignments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| quest_date | DATE | Quest date |
| task_type | VARCHAR(50) | listen_10min, learn_5words, etc. |
| task_title | VARCHAR(100) | Display title |
| description | TEXT | Görevin nasıl tamamlanacağını açıklayan metin |
| target_amount | INTEGER | Target value |
| current_amount | INTEGER | Current progress |
| xp_reward | INTEGER | XP reward |
| is_completed | BOOLEAN | Completion status |
| is_claimed | BOOLEAN | Reward claimed |
| parent_quest_node_id | INTEGER | FK → quest_nodes |
| contribution_weight | DECIMAL(3,2) | Parent contribution (0-1) |

### leagues (5 rows)
League tier definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| code | VARCHAR(20) | seed, sprout, sapling, flourish, rooted |
| name_tr | VARCHAR(50) | Turkish name |
| name_en | VARCHAR(50) | English name |
| icon | VARCHAR(10) | League icon |
| rank_order | INTEGER | Tier order |
| min_xp_to_promote | INTEGER | Promotion XP |
| demotion_zone | INTEGER | Bottom N demoted |
| promotion_zone | INTEGER | Top N promoted |

### weekly_scores (3 rows, 13 columns)
Weekly leaderboard scores.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| week_start | DATE | Week start date |
| xp_earned | INTEGER | Week XP |
| listening_minutes | INTEGER | Listening time |
| content_completed | INTEGER | Content count |
| words_learned | INTEGER | New words |
| rank | INTEGER | Weekly rank |
| league | VARCHAR(20) | Current league |
| promoted | BOOLEAN | Promoted this week |
| demoted | BOOLEAN | Demoted this week |

---

## 6. Sector English Tables

### sectors (16 predefined rows)
Industry sector definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| code | VARCHAR(50) | Unique code (it_software, finance, etc.) |
| name_tr | VARCHAR(100) | Turkish name |
| name_en | VARCHAR(100) | English name |
| description_tr | TEXT | Turkish description |
| description_en | TEXT | English description |
| icon | VARCHAR(50) | Icon name |
| color | VARCHAR(20) | Brand color |
| sub_categories | TEXT[] | Subcategories |
| is_active | BOOLEAN | Active status |
| sort_order | INTEGER | Display order |

**Predefined Sectors:**
- it_software, finance, tourism, logistics, healthcare
- medical_tourism, legal, automotive, marketing, engineering
- retail, education, hr, real_estate, aviation, manufacturing

### sector_content (0 rows)
Sector-specific content pool.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sector_id | INTEGER | FK → sectors |
| content_type | VARCHAR(50) | article, dialogue, scenario |
| cefr_level | VARCHAR(10) | CEFR level |
| title | VARCHAR(255) | Content title |
| original_text | TEXT | Content text |
| dialogue_data | JSONB | Dialogue structure |
| key_vocabulary | TEXT[] | Key terms |
| comprehension_questions | JSONB | Quiz questions |
| audio_url | TEXT | Audio file |
| status | VARCHAR(20) | draft, published, archived |

### sector_vocabulary (0 rows)
Sector-specific terminology.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| sector_id | INTEGER | FK → sectors |
| word | VARCHAR(100) | Term |
| pronunciation | VARCHAR(100) | IPA pronunciation |
| definition_en | TEXT | English definition |
| definition_tr | TEXT | Turkish definition |
| example_sentence | TEXT | Usage example |
| example_sentence_tr | TEXT | Turkish example translation |
| category | VARCHAR(50) | Term category |
| cefr_level | VARCHAR(10) | Difficulty level |
| frequency_rank | INTEGER | Usage frequency |
| collocations | TEXT[] | Common word pairs |
| usage_notes | TEXT | Usage context/tips |
| related_words | TEXT[] | Synonyms/Related |

### sector_quizzes (0 rows)
Sector quiz definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sector_id | INTEGER | FK → sectors |
| title | VARCHAR(255) | Quiz title |
| quiz_type | VARCHAR(50) | vocabulary, comprehension, mixed |
| cefr_level | VARCHAR(10) | Difficulty |
| difficulty | VARCHAR(20) | easy, medium, hard |
| time_limit_seconds | INTEGER | Time limit |
| passing_score | INTEGER | Pass threshold % |
| questions | JSONB | Quiz questions array |
| total_questions | INTEGER | Generated column |
| max_score | INTEGER | Maximum score |

### sector_modules (0 rows)
Modular learning paths per sector.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| sector_id | INTEGER | FK → sectors |
| title | VARCHAR(255) | Module title |
| cefr_level | VARCHAR(10) | Level |
| module_order | INTEGER | Order in sector |
| estimated_minutes | INTEGER | Time estimate |
| prerequisite_module_id | INTEGER | FK → sector_modules |
| is_active | BOOLEAN | Active status |

### module_items (0 rows)
Items within a module.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| module_id | INTEGER | FK → sector_modules |
| item_type | VARCHAR(50) | vocabulary_set, content, quiz |
| content_id | UUID | FK → sector_content |
| quiz_id | UUID | FK → sector_quizzes |
| vocabulary_ids | INTEGER[] | Vocabulary IDs |
| item_order | INTEGER | Order in module |
| is_required | BOOLEAN | Required item |

---

## 7. Payment Tables

### payment_providers (2 rows)
Payment gateway configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(50) | iyzico, stripe |
| display_name | VARCHAR(100) | Display name |
| is_active | BOOLEAN | Active status |
| is_default | BOOLEAN | Default provider |
| environment | VARCHAR(20) | sandbox, production |
| api_key | TEXT | API key (encrypted) |
| secret_key | TEXT | Secret key (encrypted) |
| supported_features | JSONB | Feature flags |
| commission_rates | JSONB | Commission rates |

### card_transactions (0 rows)
Credit card transaction records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| payment_provider_id | UUID | FK → payment_providers |
| transaction_type | VARCHAR(20) | payment, refund |
| status | VARCHAR(20) | pending, completed, failed |
| amount | DECIMAL(10,2) | Transaction amount |
| currency | VARCHAR(3) | Currency code |
| card_last_four_digits | VARCHAR(4) | Card last 4 |
| installment_count | INTEGER | Installments |
| iyzico_payment_id | VARCHAR(100) | iyzico ID |
| stripe_payment_intent_id | VARCHAR(100) | Stripe ID |
| three_d_secure | BOOLEAN | 3DS used |

---

## 8. Support Tables

### support_conversations (12 rows)
User-admin support chats.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| subject | VARCHAR(255) | Ticket subject |
| status | VARCHAR(50) | open, in_progress, resolved, closed |
| priority | VARCHAR(20) | low, medium, high, urgent |
| admin_id | UUID | Assigned admin |
| last_message_at | TIMESTAMPTZ | Last activity |

### support_messages (55 rows)
Support conversation messages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK → support_conversations |
| sender_id | UUID | FK → users |
| sender_type | VARCHAR(20) | user, admin |
| content | TEXT | Message content |
| is_read | BOOLEAN | Read status |

### support_message_attachments (3 rows)
File attachments for support messages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| message_id | UUID | FK → support_messages |
| filename | VARCHAR(255) | File name |
| file_path | VARCHAR(500) | Storage URL |
| file_size | INTEGER | Size in bytes |
| mime_type | VARCHAR(100) | MIME type |

---

## 9. Analytics Tables

### api_costs (377 rows)
External API cost tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| feature | TEXT | Feature name |
| provider | TEXT | openai, google_tts, aws_polly |
| model | TEXT | Model name |
| input_quantity | INTEGER | Input tokens/chars |
| output_quantity | INTEGER | Output tokens |
| cost_usd | NUMERIC(12,6) | Cost in USD |
| metadata | JSONB | Additional context |

### content_ratings (2 rows)
User content ratings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| content_id | UUID | Content ID |
| content_type | VARCHAR(50) | Content type |
| rating | INTEGER | 1 (like) or -1 (dislike) |

### content_feedback (0 rows)
Detailed content feedback.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| content_id | UUID | Content ID |
| feedback_type | VARCHAR(50) | too_easy, too_hard, boring, etc. |
| feedback_text | TEXT | Written feedback |

### daily_usage_patterns (158 rows)
Extracted phrase patterns from content.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| topic | TEXT | Content topic |
| level | TEXT | CEFR level |
| pattern_count | INTEGER | Patterns found |
| patterns | JSONB | Pattern array |

### admin_logs (NEW - Migration 0080)
Admin action audit trail for compliance and traceability.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| admin_user_id | UUID | FK → users (ON DELETE SET NULL) |
| admin_email | TEXT | Admin email (denormalized) |
| action | TEXT | Action identifier (e.g. 'user.delete', 'plan.update') |
| target_type | TEXT | Resource type: user, subscription, plan, content, setting |
| target_id | TEXT | ID of the affected resource |
| details | JSONB | Additional context (old/new values, reason) |
| ip_address | TEXT | Client IP address |
| user_agent | TEXT | Client User-Agent header |
| created_at | TIMESTAMPTZ | Record creation time |

**Indexes:** `created_at DESC`, `admin_user_id`, `action`
**RLS:** Enabled — select/insert policies for backend service role.
**Retention:** Unlimited (compliance-grade, never deleted).

---

## 10. Other Tables

### notifications (217 rows)
Push notification records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| title | TEXT | Notification title |
| body | TEXT | Notification body |
| type | TEXT | general, audio_created, audio_failed |
| data | JSONB | Additional data |
| is_read | BOOLEAN | Read status |
| read_at | TIMESTAMPTZ | Read timestamp |

### device_tokens (69 rows)
FCM/APNs device tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| platform | TEXT | android, ios |
| token | TEXT | Push token |
| device_id | TEXT | Device identifier |
| is_active | BOOLEAN | Active status |

### user_settings (12 rows)
User preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| settings | JSONB | Settings object |

### hobby_suggestions (600 rows)
Content suggestions by hobby.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| hobby | TEXT | Hobby name |
| suggestions | JSONB | Topic suggestions |
| level | TEXT | CEFR level |

### parameters (3 rows)
System configuration parameters.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| key | TEXT | Parameter key |
| value | TEXT | Parameter value |
| description | TEXT | Description |

### external_services (1 row)
External service configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Service name |
| is_active | BOOLEAN | Active status |
| config | JSONB | Configuration |

---

## 11. Quiz Engine Tables (New - 2026-01-23)

### quiz_word_attempts (0 rows)
Kelime bazlı quiz denemeleri. SRS entegrasyonu için kritik.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| word | VARCHAR(100) | Tested word |
| quiz_result_id | UUID | FK → user_quiz_results |
| question_id | INTEGER | Question ID in quiz |
| question_type | VARCHAR(50) | multiple_choice, cloze, matching, ordering |
| difficulty | INTEGER | 1-5 difficulty |
| was_correct | BOOLEAN | Correct answer |
| user_answer | TEXT | User's answer (JSON) |
| correct_answer | TEXT | Correct answer (JSON) |
| response_time_ms | INTEGER | Response time in ms |
| hints_used | INTEGER | Hints used count |
| source_content_id | UUID | Source content |
| sector_id | INTEGER | FK → sectors |
| cefr_level | VARCHAR(10) | Question CEFR level |
| synced_to_srs | BOOLEAN | Synced to word_reviews |
| synced_at | TIMESTAMP | SRS sync time |
| created_at | TIMESTAMP | Record creation time |

### user_quiz_difficulty_profile (0 rows)
Kullanıcı quiz zorluk profili. Adaptif zorluk sistemi için.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, FK → users |
| vocabulary_accuracy | DECIMAL(4,3) | Vocabulary accuracy (0-1) |
| grammar_accuracy | DECIMAL(4,3) | Grammar accuracy |
| listening_accuracy | DECIMAL(4,3) | Listening accuracy |
| reading_accuracy | DECIMAL(4,3) | Reading accuracy |
| mc_accuracy | DECIMAL(4,3) | Multiple choice accuracy |
| cloze_accuracy | DECIMAL(4,3) | Cloze test accuracy |
| matching_accuracy | DECIMAL(4,3) | Matching accuracy |
| ordering_accuracy | DECIMAL(4,3) | Ordering accuracy |
| avg_response_time_ms | INTEGER | Average response time |
| fastest_response_ms | INTEGER | Fastest response |
| slowest_response_ms | INTEGER | Slowest response |
| total_questions_answered | INTEGER | Total questions answered |
| total_correct | INTEGER | Total correct answers |
| current_streak | INTEGER | Current correct streak |
| best_streak | INTEGER | Best correct streak |
| preferred_question_types | JSONB | AI-learned preferences |
| struggling_topics | JSONB | Struggling topics |
| mastered_topics | JSONB | Mastered topics |
| recommended_difficulty | INTEGER | AI-recommended difficulty (1-5) |
| created_at | TIMESTAMP | Profile creation |
| updated_at | TIMESTAMP | Last update |

### quiz_question_templates (0 rows)
Dinamik soru üretimi için şablonlar.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| question_type | VARCHAR(50) | cloze, matching, ordering, etc. |
| category | VARCHAR(50) | vocabulary, grammar, phrase |
| subcategory | VARCHAR(50) | More specific category |
| cefr_level | VARCHAR(10) | CEFR level |
| difficulty | INTEGER | 1-5 difficulty |
| template | JSONB | Template definition |
| sector_id | INTEGER | FK → sectors (optional) |
| usage_count | INTEGER | Times used |
| success_rate | DECIMAL(4,3) | Average success rate |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |

### quiz_sessions (0 rows)
Quiz oturum takibi. Uzun/kesintiye uğrayan quizler için.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| quiz_id | UUID | FK → sector_quizzes |
| quiz_type | VARCHAR(50) | sector, vocabulary, content, adaptive |
| content_id | UUID | Related content |
| sector_id | INTEGER | FK → sectors |
| status | VARCHAR(20) | in_progress, completed, abandoned, paused |
| current_question_index | INTEGER | Current position |
| total_questions | INTEGER | Total questions |
| answers | JSONB | Saved answers |
| started_at | TIMESTAMP | Session start |
| last_activity_at | TIMESTAMP | Last activity |
| completed_at | TIMESTAMP | Completion time |
| time_limit_seconds | INTEGER | Time limit |
| time_spent_seconds | INTEGER | Time spent |
| score | INTEGER | Final score |
| score_percentage | DECIMAL(5,2) | Score percentage |
| correct_count | INTEGER | Correct answers |
| wrong_count | INTEGER | Wrong answers |

---

## Database Functions

### XP & Level Calculations
```sql
-- Calculate level from total XP
calculate_level_from_xp(total_xp INTEGER) → INTEGER

-- XP required for next level
xp_for_next_level(current_level INTEGER) → INTEGER
```

### Quiz Engine Functions
```sql
-- Get word quiz statistics for a user
get_word_quiz_stats(p_user_id UUID, p_word VARCHAR) → TABLE

-- Get struggling words for SRS
get_struggling_words(p_user_id UUID, p_limit INTEGER) → TABLE
```

### Triggers
- `trigger_gamification_updated` - Updates `updated_at` on user_gamification
- `trigger_create_gamification_profile` - Auto-creates gamification profile for new users
- `trigger_daily_quest_completion` - Updates parent quest progress when daily quest completes
- `trigger_update_streak_society` - Updates streak tier when streak changes
- `trigger_add_new_quests` - Adds new quests to user progress
- `trigger_update_quiz_difficulty` - **[NEW]** Updates user quiz difficulty profile on answer

---

## Row Level Security (RLS)

All tables have RLS enabled. Common policies:

| Table | Policy | Rule |
|-------|--------|------|
| users | Users can view/edit own data | `auth.uid() = id` |
| *_progress | Users see own progress | `auth.uid() = user_id` |
| content tables | Published content visible to all | `status = 'published'` |
| admin tables | Admin-only access | Role check in backend |
| admin_logs | Service role insert/select | Backend service role bypasses RLS |

---

## Related Documentation

- [API Services](../codebase/api-services.md)
- [System Overview](../architecture/system-overview.md)
- [Gamification Strategy](../architecture/gamification-strategy.md)
- [Local Setup](../devops/local-setup.md)
