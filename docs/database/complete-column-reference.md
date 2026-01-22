# Complete Database Column Reference

> **Oluşturulma:** 2026-01-21 | **Güncelleme:** 2026-01-21 | **Versiyon:** 1.0

**Source:** Direct Supabase `information_schema` query  
**Total Tables:** 78+ (includes views)  
**Export Date:** 2026-01-21

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **PK** | Primary Key |
| **FK → table** | Foreign Key reference |
| ✓ | NOT NULL |
| ○ | NULLABLE |

---

## 1. Core User Tables

### users
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | uuid_generate_v4() | PK |
| firstname | varchar | ○ | - | |
| lastname | varchar | ○ | - | |
| email | varchar | ○ | - | |
| phonenumber | varchar | ○ | - | |
| password | varchar | ○ | - | |
| role | text | ○ | - | |
| isverified | boolean | ○ | - | |
| verificationmethod | text | ○ | - | |
| verificationtoken | varchar | ○ | - | |
| verificationexpires | timestamptz | ○ | - | |
| resetpasswordtoken | varchar | ○ | - | |
| resetpasswordexpires | timestamptz | ○ | - | |
| dailycontentused | integer | ○ | - | |
| lastcontentdate | date | ○ | - | |
| stripecustomerid | varchar | ○ | - | |
| created_at | timestamptz | ○ | - | |
| updated_at | timestamptz | ○ | - | |
| reminder_settings | jsonb | ○ | - | |
| reset_password_token | varchar | ○ | - | |
| reset_password_expires | timestamp | ○ | - | |
| verification_token | text | ○ | - | |
| verification_expires | timestamptz | ○ | - | |
| is_test_user | boolean | ○ | false | |
| locale | varchar | ○ | 'tr' | |
| default_level | varchar | ○ | 'B1' | |
| cefr_level | varchar | ○ | 'B1' | |
| vocabulary_size_estimate | integer | ○ | 2500 | |
| placement_test_at | timestamptz | ○ | - | |
| insight_embedding | USER-DEFINED | ○ | - | |
| embedding_updated_at | timestamp | ○ | - | |

### subscription_plans
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| name | text | ✓ | - | |
| description | text | ○ | - | |
| price | numeric | ✓ | - | |
| interval | text | ✓ | - | |
| features | jsonb | ○ | - | |
| is_active | boolean | ✓ | true | |
| stripe_price_id | text | ○ | - | |
| is_trial | boolean | ✓ | false | |
| trial_days | integer | ✓ | 7 | |
| created_at | timestamptz | ✓ | now() | |
| updated_at | timestamptz | ✓ | now() | |
| monthly_cost_limit_usd | numeric | ○ | - | |
| openai_token_limit | bigint | ○ | - | |
| tts_char_limit | bigint | ○ | - | |
| apple_product_id | text | ○ | - | |
| google_product_id | text | ○ | - | |
| plan_features | jsonb | ○ | *complex default* | |

### subscriptions
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | uuid_generate_v4() | PK |
| user_id | uuid | ○ | - | FK → users |
| plantype | text | ○ | - | |
| status | text | ○ | - | |
| startdate | timestamptz | ○ | - | |
| enddate | timestamptz | ○ | - | |
| stripesubscriptionid | varchar | ○ | - | |
| stripepriceid | varchar | ○ | - | |
| cancelatperiodend | boolean | ○ | - | |
| lastbillingdate | timestamptz | ○ | - | |
| nextbillingdate | timestamptz | ○ | - | |
| created_at | timestamptz | ○ | - | |
| updated_at | timestamptz | ○ | - | |
| provider | text | ○ | - | |
| product_id | text | ○ | - | |
| apple_original_transaction_id | text | ○ | - | |
| apple_latest_transaction_id | text | ○ | - | |
| expires_at | timestamptz | ○ | - | |
| environment | text | ○ | - | |
| audio_creation_count | integer | ○ | 0 | |
| apple_transaction_id | varchar | ○ | - | |
| apple_receipt_data | text | ○ | - | |
| current_period_start | timestamp | ○ | - | |
| google_purchase_token | text | ○ | - | |
| user_email | text | ○ | - | |
| google_subscription_status | varchar | ○ | - | |
| google_auto_renew_status | boolean | ○ | true | |

---

## 2. Content Tables

### topics
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| parent_id | uuid | ○ | - | FK → topics |
| title | text | ✓ | - | |
| description | text | ○ | - | |
| level | text | ○ | 'A1' | |
| depth | integer | ○ | 0 | |
| order_index | integer | ○ | 0 | |
| is_manual | boolean | ○ | false | |
| keywords | ARRAY | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| source_type | varchar | ○ | 'chat' | |
| source_id | varchar | ○ | - | |
| mood_tag | varchar | ○ | - | |

### topic_contents
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| topic_id | uuid | ✓ | - | FK → topics |
| mp3_url | text | ○ | - | |
| vtt_url | text | ○ | - | |
| text_content | text | ○ | - | |
| translated_text | text | ○ | - | |
| adapted_text | text | ○ | - | |
| level | text | ○ | - | |
| voice_model | text | ○ | - | |
| speaking_rate | double precision | ○ | - | |
| duration_seconds | integer | ○ | - | |
| words | ARRAY | ○ | - | |
| timepoints | jsonb | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| listened_at | timestamptz | ○ | - | |
| target_duration_minutes | numeric | ○ | - | |
| last_position_seconds | double precision | ○ | 0 | |
| total_duration_seconds | double precision | ○ | 0 | |
| progress_percentage | double precision | ○ | 0 | |
| last_listened_at | timestamptz | ○ | - | |
| is_completed | boolean | ○ | false | |

### books
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | - | PK |
| gutendex_id | integer | ○ | - | |
| title | text | ○ | - | |
| authors | text | ○ | - | |
| cover_url | text | ○ | - | |
| download_count | integer | ○ | - | |
| language | text | ○ | - | |
| copyright | boolean | ○ | - | |
| subjects | text | ○ | - | |
| created_at | timestamp | ○ | - | |
| text_url | text | ○ | - | |
| voice_settings | jsonb | ○ | '{}' | |

### book_chapters
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| book_id | integer | ✓ | - | |
| chapter_index | integer | ✓ | - | |
| chapter_title | text | ○ | - | |
| chapter_text | text | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| director_analysis | jsonb | ○ | - | |

### chapter_audio
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| chapter_id | integer | ✓ | - | FK → book_chapters |
| voice_model | varchar | ✓ | - | |
| speaking_rate | numeric | ✓ | - | |
| level | varchar | ✓ | - | |
| mp3_url | varchar | ✓ | - | |
| vtt_url | varchar | ○ | - | |
| created_at | timestamp | ○ | CURRENT_TIMESTAMP | |

### contenthistory
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | uuid_generate_v4() | PK |
| user_id | uuid | ○ | - | FK → users |
| input_type | varchar | ○ | - | |
| level | varchar | ○ | - | |
| status | varchar | ○ | - | |
| mp3_url | text | ○ | - | |
| vtt_url | text | ○ | - | |
| error_message | text | ○ | - | |
| created_at | timestamptz | ○ | - | |
| updated_at | timestamptz | ○ | - | |
| input | text | ○ | - | |
| translated_text | text | ○ | - | |
| adapted_text | text | ○ | - | |
| words | text | ○ | - | |
| timepoints | text | ○ | - | |
| openai_prompt_tokens | integer | ○ | - | |
| openai_completion_tokens | integer | ○ | - | |
| openai_total_tokens | integer | ○ | - | |
| openai_cost_usd | numeric | ○ | - | |
| tts_characters | integer | ○ | - | |
| tts_category | varchar | ○ | - | |
| tts_cost_usd | numeric | ○ | - | |
| total_cost_usd | numeric | ○ | - | |
| chapter_id | integer | ○ | - | FK → book_chapters |
| tts_provider | varchar | ○ | - | |
| tts_voice_name | text | ○ | - | |
| audio_duration_seconds | integer | ○ | - | |
| entry_source | varchar | ○ | - | |
| llm_usage_details | jsonb | ○ | - | |
| target_duration_minutes | numeric | ○ | - | |
| detected_mood | varchar | ○ | - | |
| dialogue_segments | text | ○ | - | |
| processing_duration_ms | integer | ○ | - | |
| last_position | integer | ○ | 0 | |
| duration | integer | ○ | 0 | |
| is_completed | boolean | ○ | false | |
| completed_at | timestamptz | ○ | - | |

### documents
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| user_id | uuid | ○ | - | FK → users |
| title | text | ✓ | - | |
| original_filename | text | ○ | - | |
| mime_type | text | ○ | - | |
| page_count | integer | ○ | - | |
| language | varchar | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| cover_image_url | text | ○ | - | |
| author | text | ○ | - | |

### document_sections
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| document_id | integer | ✓ | - | FK → documents |
| section_index | integer | ✓ | - | |
| section_title | text | ○ | - | |
| section_text | text | ✓ | - | |
| word_count | integer | ○ | - | |
| created_at | timestamptz | ○ | now() | |

---

## 3. Vocabulary & SRS Tables

### vocabulary
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| word | varchar | ✓ | - | |
| original_word | varchar | ○ | - | |
| definition | text | ○ | - | |
| example_sentence | text | ○ | - | |
| example_sentence_turkish | text | ○ | - | |
| level | varchar | ○ | - | |
| meanings | jsonb | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| min_level | varchar | ○ | - | |
| max_level | varchar | ○ | - | |
| frequency_rank | integer | ○ | - | |
| is_core | boolean | ○ | false | |

### user_vocabulary
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| user_id | uuid | ✓ | - | FK → users |
| is_learned | boolean | ○ | false | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| original_sentence | text | ○ | - | |
| word_id | integer | ✓ | - | FK → vocabulary |
| translated_sentence | text | ○ | - | |
| next_review_at | timestamptz | ○ | now() | |
| last_reviewed_at | timestamptz | ○ | - | |
| interval_days | real | ○ | 0 | |
| ease_factor | real | ○ | 2.5 | |
| streak | integer | ○ | 0 | |
| review_count | integer | ○ | 0 | |
| status | varchar | ○ | 'new' | |
| type | varchar | ○ | 'word' | |
| notes | jsonb | ○ | - | |
| sector_id | integer | ○ | - | FK → sectors |

### pattern_library
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| lang | text | ✓ | 'en' | |
| type | text | ✓ | - | |
| text | text | ✓ | - | |
| translation | text | ○ | - | |
| explanation | text | ○ | - | |
| level | text | ○ | - | |
| category | text | ○ | - | |
| example_text | text | ○ | - | |
| example_translation | text | ○ | - | |
| source | text | ○ | - | |
| created_at | timestamptz | ✓ | now() | |

---

## 4. Gamification Tables

### user_gamification
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK |
| current_level | integer | ○ | 1 | |
| current_xp | integer | ○ | 0 | |
| total_lifetime_xp | integer | ○ | 0 | |
| streak_count | integer | ○ | 0 | |
| longest_streak | integer | ○ | 0 | |
| last_activity_date | date | ○ | CURRENT_DATE | |
| freeze_balance | integer | ○ | 0 | |
| archetype | varchar | ○ | - | |
| onboarding_completed | boolean | ○ | false | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| streak_society | varchar | ○ | - | |
| streak_badge_url | text | ○ | - | |
| current_league | varchar | ○ | 'seed' | |

### achievements
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| code | varchar | ✓ | - | |
| category | varchar | ○ | - | |
| title_tr | varchar | ✓ | - | |
| title_en | varchar | ○ | - | |
| description_tr | text | ○ | - | |
| description_en | text | ○ | - | |
| icon_url | text | ○ | - | |
| icon_emoji | varchar | ○ | - | |
| xp_reward | integer | ○ | 50 | |
| rarity | varchar | ○ | 'common' | |
| condition_type | varchar | ○ | - | |
| condition_value | integer | ○ | - | |
| is_hidden | boolean | ○ | false | |
| sort_order | integer | ○ | 0 | |
| created_at | timestamp | ○ | now() | |

### user_achievements
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK |
| achievement_id | integer | ✓ | - | PK |
| earned_at | timestamptz | ○ | now() | |
| notified | boolean | ○ | false | |

### quest_nodes
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| title | varchar | ✓ | - | |
| description | text | ○ | - | |
| step_order | integer | ✓ | - | |
| week_number | integer | ○ | - | |
| required_level | integer | ○ | 1 | |
| prerequisite_node_id | integer | ○ | - | FK → quest_nodes |
| reward_xp | integer | ○ | 100 | |
| task_type | varchar | ○ | - | |
| task_subtype | varchar | ○ | - | |
| content_reference_id | varchar | ○ | - | |
| content_config | jsonb | ○ | - | |
| estimated_minutes | integer | ○ | 10 | |
| is_major_milestone | boolean | ○ | false | |
| icon_emoji | varchar | ○ | '📜' | |
| created_at | timestamp | ○ | now() | |
| required_daily_completions | integer | ○ | 3 | |
| current_daily_completions | integer | ○ | 0 | |
| content_type | varchar | ○ | - | |
| content_filter | jsonb | ○ | '{}' | |
| sector_id | integer | ○ | - | FK → sectors |

### daily_quests
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ○ | - | FK → users |
| quest_date | date | ○ | CURRENT_DATE | |
| task_type | varchar | ✓ | - | |
| task_title | varchar | ○ | - | |
| target_amount | integer | ✓ | - | |
| current_amount | integer | ○ | 0 | |
| xp_reward | integer | ○ | 50 | |
| is_completed | boolean | ○ | false | |
| is_claimed | boolean | ○ | false | |
| expires_at | timestamptz | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| parent_quest_node_id | integer | ○ | - | FK → quest_nodes |
| contribution_weight | numeric | ○ | 0.20 | |

### leagues
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| code | varchar | ✓ | - | |
| name_tr | varchar | ✓ | - | |
| name_en | varchar | ✓ | - | |
| icon | varchar | ○ | - | |
| rank_order | integer | ○ | - | |
| min_xp_to_promote | integer | ○ | - | |
| demotion_zone | integer | ○ | 5 | |
| promotion_zone | integer | ○ | 10 | |

### weekly_scores
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ○ | - | FK → users |
| week_start | date | ✓ | - | |
| xp_earned | integer | ○ | 0 | |
| listening_minutes | integer | ○ | 0 | |
| content_completed | integer | ○ | 0 | |
| words_learned | integer | ○ | 0 | |
| rank | integer | ○ | - | |
| league | varchar | ○ | - | |

### weekly_challenges
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | integer | ✓ | nextval() | PK |
| title_tr | varchar | ✓ | - | |
| title_en | varchar | ○ | - | |
| description_tr | text | ○ | - | |
| description_en | text | ○ | - | |
| theme | varchar | ✓ | - | |
| theme_icon | varchar | ○ | - | |
| week_start | date | ✓ | - | |
| week_end | date | ✓ | - | |
| tasks | jsonb | ✓ | - | |
| badge_code | varchar | ○ | - | |
| total_xp_reward | integer | ○ | 0 | |
| is_active | boolean | ○ | true | |
| created_at | timestamp | ○ | now() | |

---

## 5. Chat & AI Tables

### conversations
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| subject | varchar | ✓ | - | |
| status | varchar | ○ | 'open' | |
| priority | varchar | ○ | 'medium' | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| last_message_at | timestamptz | ○ | now() | |
| admin_id | uuid | ○ | - | FK → users |
| suggested_topic | text | ○ | - | |
| current_mood | varchar | ○ | - | |
| conversation_summary | text | ○ | - | |
| summary_updated_at | timestamptz | ○ | - | |

### messages
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| conversation_id | uuid | ✓ | - | FK → conversations |
| sender_id | uuid | ✓ | - | FK → users |
| sender_type | varchar | ✓ | - | |
| content | text | ✓ | - | |
| is_read | boolean | ○ | false | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

### user_insights
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| insight_type | USER-DEFINED | ✓ | - | |
| insight_value | text | ✓ | - | |
| confidence | integer | ○ | 70 | |
| source_conversation_id | uuid | ○ | - | FK → conversations |
| is_active | boolean | ○ | true | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

---

## 6. Sector English Tables

### sectors
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | serial | ✓ | nextval() | PK |
| code | varchar | ✓ | - | |
| name_tr | varchar | ✓ | - | |
| name_en | varchar | ✓ | - | |
| description_tr | text | ○ | - | |
| description_en | text | ○ | - | |
| icon | varchar | ○ | - | |
| color | varchar | ○ | - | |
| sub_categories | text[] | ○ | - | |
| is_active | boolean | ○ | true | |
| sort_order | integer | ○ | 0 | |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### user_sectors
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK, FK → users |
| sector_id | integer | ✓ | - | PK, FK → sectors |
| is_primary | boolean | ○ | false | |
| proficiency_level | varchar | ○ | 'beginner' | |
| progress_percentage | decimal | ○ | 0 | |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### sector_content
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| sector_id | integer | ○ | - | FK → sectors |
| content_type | varchar | ✓ | - | |
| cefr_level | varchar | ✓ | - | |
| title | varchar | ✓ | - | |
| title_tr | varchar | ○ | - | |
| description | text | ○ | - | |
| original_text | text | ✓ | - | |
| dialogue_data | jsonb | ○ | - | |
| key_vocabulary | text[] | ○ | - | |
| comprehension_questions | jsonb | ○ | - | |
| tags | text[] | ○ | - | |
| source_url | text | ○ | - | |
| source_author | varchar | ○ | - | |
| source_date | date | ○ | - | |
| audio_url | text | ○ | - | |
| vtt_url | text | ○ | - | |
| duration_seconds | integer | ○ | - | |
| read_count | integer | ○ | 0 | |
| listen_count | integer | ○ | 0 | |
| average_rating | decimal | ○ | - | |
| rating_count | integer | ○ | 0 | |
| status | varchar | ○ | 'draft' | |
| created_by | uuid | ○ | - | FK → users |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### user_sector_content_progress
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK, FK → users |
| content_id | uuid | ✓ | - | PK, FK → sector_content |
| status | varchar | ○ | 'not_started' | |
| progress_percentage | decimal | ○ | 0 | |
| last_position_seconds | integer | ○ | 0 | |
| completed_at | timestamp | ○ | - | |
| rating | integer | ○ | - | |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### sector_vocabulary
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | serial | ✓ | nextval() | PK |
| sector_id | integer | ○ | - | FK → sectors |
| word | varchar | ✓ | - | |
| pronunciation | varchar | ○ | - | |
| definition_en | text | ✓ | - | |
| definition_tr | text | ✓ | - | |
| example_sentence | text | ○ | - | |
| example_sentence_tr | text | ○ | - | |
| category | varchar | ○ | - | |
| cefr_level | varchar | ○ | - | |
| frequency_rank | integer | ○ | - | |
| audio_url | text | ○ | - | |
| collocations | text[] | ○ | - | |
| usage_notes | text | ○ | - | |
| related_words | text[] | ○ | - | |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### user_sector_stats
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK, FK → users |
| sector_id | integer | ✓ | - | PK, FK → sectors |
| content_completed | integer | ○ | 0 | |
| content_in_progress | integer | ○ | 0 | |
| vocabulary_learned | integer | ○ | 0 | |
| vocabulary_reviewing | integer | ○ | 0 | |
| total_time_seconds | integer | ○ | 0 | |
| total_xp_earned | integer | ○ | 0 | |
| last_activity_at | timestamp | ○ | - | |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### sector_quizzes
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| sector_id | integer | ○ | - | FK → sectors |
| title | varchar | ✓ | - | |
| title_tr | varchar | ○ | - | |
| description | text | ○ | - | |
| quiz_type | varchar | ✓ | - | |
| cefr_level | varchar | ○ | - | |
| difficulty | varchar | ○ | 'medium' | |
| time_limit_seconds | integer | ○ | - | |
| passing_score | integer | ○ | 70 | |
| questions | jsonb | ✓ | - | |
| total_questions | integer | ○ | *GENERATED* | |
| max_score | integer | ○ | - | |
| is_active | boolean | ○ | true | |
| related_content_id | uuid | ○ | - | FK → sector_content |
| created_by | uuid | ○ | - | FK → users |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### user_quiz_results
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ○ | - | FK → users |
| quiz_id | uuid | ○ | - | FK → sector_quizzes |
| score | integer | ✓ | - | |
| score_percentage | decimal | ○ | - | |
| correct_count | integer | ✓ | - | |
| wrong_count | integer | ✓ | - | |
| total_questions | integer | ✓ | - | |
| time_taken_seconds | integer | ○ | - | |
| answers | jsonb | ○ | - | |
| is_passed | boolean | ○ | - | |
| started_at | timestamp | ○ | - | |
| completed_at | timestamp | ○ | NOW() | |
| attempt_number | integer | ○ | 1 | |

### sector_modules
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | serial | ✓ | nextval() | PK |
| sector_id | integer | ○ | - | FK → sectors |
| title | varchar | ✓ | - | |
| title_tr | varchar | ○ | - | |
| description | text | ○ | - | |
| description_tr | text | ○ | - | |
| cefr_level | varchar | ○ | - | |
| module_order | integer | ✓ | - | |
| estimated_minutes | integer | ○ | - | |
| prerequisite_module_id | integer | ○ | - | FK → sector_modules |
| is_active | boolean | ○ | true | |
| created_at | timestamp | ○ | NOW() | |
| updated_at | timestamp | ○ | NOW() | |

### module_items
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | serial | ✓ | nextval() | PK |
| module_id | integer | ○ | - | FK → sector_modules |
| item_type | varchar | ✓ | - | |
| content_id | uuid | ○ | - | FK → sector_content |
| quiz_id | uuid | ○ | - | FK → sector_quizzes |
| vocabulary_ids | integer[] | ○ | - | |
| item_order | integer | ✓ | - | |
| is_required | boolean | ○ | true | |
| estimated_minutes | integer | ○ | - | |

### user_module_progress
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK, FK → users |
| module_id | integer | ✓ | - | PK, FK → sector_modules |
| status | varchar | ○ | 'locked' | |
| progress_percentage | decimal | ○ | 0 | |
| completed_items | integer | ○ | 0 | |
| total_items | integer | ○ | - | |
| started_at | timestamp | ○ | - | |
| completed_at | timestamp | ○ | - | |
| last_activity_at | timestamp | ○ | - | |

### user_module_item_progress
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| user_id | uuid | ✓ | - | PK, FK → users |
| item_id | integer | ✓ | - | PK, FK → module_items |
| status | varchar | ○ | 'not_started' | |
| score | integer | ○ | - | |
| completed_at | timestamp | ○ | - | |

---

## 7. Payment Tables

### payment_providers
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| name | varchar | ✓ | - | |
| display_name | varchar | ✓ | - | |
| is_active | boolean | ○ | false | |
| is_default | boolean | ○ | false | |
| environment | varchar | ○ | 'sandbox' | |
| api_key | text | ○ | - | |
| secret_key | text | ○ | - | |
| base_url | varchar | ○ | - | |
| settings | jsonb | ○ | '{}' | |
| supported_features | jsonb | ○ | *complex* | |
| commission_rates | jsonb | ○ | *complex* | |
| last_tested_at | timestamptz | ○ | - | |
| test_result | boolean | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

### card_transactions
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| payment_provider_id | uuid | ✓ | - | FK → payment_providers |
| subscription_id | uuid | ○ | - | FK → subscriptions |
| plan_id | uuid | ○ | - | |
| transaction_type | varchar | ○ | 'payment' | |
| status | varchar | ○ | 'pending' | |
| amount | numeric | ✓ | - | |
| currency | varchar | ○ | 'TRY' | |
| card_last_four_digits | varchar | ○ | - | |
| card_type | varchar | ○ | - | |
| card_association | varchar | ○ | - | |
| card_family | varchar | ○ | - | |
| bin_number | varchar | ○ | - | |
| installment_count | integer | ○ | 1 | |
| installment_amount | numeric | ○ | - | |
| iyzico_conversation_id | varchar | ○ | - | |
| iyzico_payment_id | varchar | ○ | - | |
| iyzico_payment_transaction_id | varchar | ○ | - | |
| iyzico_fraud_status | integer | ○ | - | |
| stripe_payment_intent_id | varchar | ○ | - | |
| stripe_payment_id | varchar | ○ | - | |
| stripe_session_id | varchar | ○ | - | |
| stripe_subscription_id | varchar | ○ | - | |
| stripe_customer_id | varchar | ○ | - | |
| three_d_secure | boolean | ○ | false | |
| three_d_secure_id | varchar | ○ | - | |
| commission_rate | numeric | ○ | - | |
| commission_amount | numeric | ○ | - | |
| net_amount | numeric | ○ | - | |
| error_code | varchar | ○ | - | |
| error_message | text | ○ | - | |
| refunded_amount | numeric | ○ | 0 | |
| refunded_at | timestamptz | ○ | - | |
| refund_reason | text | ○ | - | |
| customer_email | varchar | ○ | - | |
| customer_ip | varchar | ○ | - | |
| metadata | jsonb | ○ | '{}' | |
| raw_response | jsonb | ○ | - | |
| processed_at | timestamptz | ○ | - | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

---

## 7. Notifications & Device Tables

### notifications
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| title | text | ✓ | - | |
| body | text | ✓ | - | |
| type | text | ✓ | 'general' | |
| data | jsonb | ○ | '{}' | |
| is_read | boolean | ○ | false | |
| created_at | timestamptz | ○ | now() | |
| read_at | timestamptz | ○ | - | |

### device_tokens
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| platform | text | ✓ | - | |
| token | text | ✓ | - | |
| device_id | text | ○ | - | |
| app_version | text | ○ | - | |
| is_active | boolean | ○ | true | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

---

## 8. Support Tables

### support_conversations
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| subject | varchar | ✓ | - | |
| status | varchar | ○ | 'open' | |
| priority | varchar | ○ | 'medium' | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |
| last_message_at | timestamptz | ○ | now() | |
| admin_id | uuid | ○ | - | FK → users |

### support_messages
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| conversation_id | uuid | ✓ | - | FK → support_conversations |
| sender_id | uuid | ✓ | - | FK → users |
| sender_type | varchar | ✓ | - | |
| content | text | ✓ | - | |
| is_read | boolean | ○ | false | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

---

## 9. Analytics Tables

### api_costs
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| feature | text | ✓ | - | |
| provider | text | ✓ | - | |
| model | text | ○ | - | |
| input_quantity | integer | ○ | 0 | |
| output_quantity | integer | ○ | 0 | |
| cost_usd | numeric | ✓ | 0 | |
| metadata | jsonb | ○ | - | |
| created_at | timestamptz | ✓ | now() | |

### content_ratings
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | FK → users |
| content_id | uuid | ✓ | - | |
| content_type | varchar | ✓ | - | |
| rating | integer | ✓ | - | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

---

## 10. RBAC Tables

### roles
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| name | varchar | ✓ | - | |
| description | text | ○ | - | |
| is_active | boolean | ○ | true | |
| created_at | timestamptz | ○ | now() | |
| updated_at | timestamptz | ○ | now() | |

### permissions
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| name | varchar | ✓ | - | |
| description | text | ○ | - | |
| category | varchar | ✓ | - | |
| resource | varchar | ○ | - | |
| action | varchar | ○ | - | |
| created_at | timestamptz | ○ | now() | |

### role_permissions
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| role_id | uuid | ✓ | - | FK → roles |
| permission_id | uuid | ✓ | - | FK → permissions |
| is_granted | boolean | ○ | true | |
| created_at | timestamptz | ○ | now() | |

### user_roles
| Column | Type | Null | Default | Key |
|--------|------|------|---------|-----|
| id | uuid | ✓ | gen_random_uuid() | PK |
| user_id | uuid | ✓ | - | |
| role_id | uuid | ✓ | - | FK → roles |
| assigned_by | uuid | ○ | - | |
| assigned_at | timestamptz | ○ | now() | |
| expires_at | timestamptz | ○ | - | |
| is_active | boolean | ○ | true | |

---

## Related Documentation

- [Schema Overview](./schema-overview.md) - High-level schema summary
- [API Services](../codebase/api-services.md)
- [System Overview](../architecture/system-overview.md)
