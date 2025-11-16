-- ============================================
-- KULLANICI VERİSİ SİLME SORGUSU
-- ============================================
-- Bu script bir kullanıcının tüm verilerini siler
-- Kullanım: user_id parametresini değiştirin ve çalıştırın

-- KULLANICI ID'SİNİ BURAYA GİRİN
-- Örnek: DO $$ DECLARE v_user_id UUID := 'kullanici-uuid-buraya'; BEGIN ... END $$;

DO $$
DECLARE
  v_user_id UUID := 'BURAYA_USER_ID_GIRIN'; -- Kullanıcı ID'sini buraya yazın
  v_deleted_count INTEGER;
BEGIN
  RAISE NOTICE '🗑️  Kullanıcı verisi silme işlemi başlatılıyor...';
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- 1. User Vocabulary (Kelime listesi)
  DELETE FROM user_vocabulary WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ user_vocabulary: % kayıt silindi', v_deleted_count;
  
  -- 2. User Settings (Kullanıcı ayarları)
  DELETE FROM user_settings WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ user_settings: % kayıt silindi', v_deleted_count;
  
  -- 3. Message Attachments (Mesaj ekleri - önce silinmeli)
  DELETE FROM message_attachments 
  WHERE message_id IN (
    SELECT m.id FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = v_user_id
  );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ message_attachments: % kayıt silindi', v_deleted_count;
  
  -- 4. Messages (Mesajlar - conversation'dan önce silinmeli)
  DELETE FROM messages 
  WHERE conversation_id IN (
    SELECT id FROM conversations WHERE user_id = v_user_id
  );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ messages: % kayıt silindi', v_deleted_count;
  
  -- 5. Conversations (Destek konuşmaları)
  DELETE FROM conversations WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ conversations: % kayıt silindi', v_deleted_count;
  
  -- 6. Subscriptions (Abonelikler)
  DELETE FROM subscriptions WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ subscriptions: % kayıt silindi', v_deleted_count;
  
  -- 7. Audio Files (Ses dosyaları - eğer user_id ile ilişkiliyse)
  -- Not: audio_files tablosunda user_id varsa ekleyin
  -- DELETE FROM audio_files WHERE user_id = v_user_id;
  
  -- 8. Generated Content (Oluşturulan içerikler - eğer user_id ile ilişkiliyse)
  -- Not: generated_content tablosunda user_id varsa ekleyin
  -- DELETE FROM generated_content WHERE user_id = v_user_id;
  
  -- 9. Users (Kullanıcı kaydı - EN SON SİLİNMELİ)
  DELETE FROM users WHERE id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ users: % kayıt silindi', v_deleted_count;
  
  RAISE NOTICE '🎉 Kullanıcı verisi başarıyla silindi!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ HATA: %', SQLERRM;
    RAISE;
END $$;
