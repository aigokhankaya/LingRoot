-- Insert initial topic suggestions into existing generated_suggestions table
-- Using random UUIDs for id and user_id (public suggestions)

INSERT INTO generated_suggestions (id, user_id, interest_keyword, title, summary, generated_at) VALUES 
  ('01234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'seyahat', 'Seyahat ve Turizm', 'Farklı ülkeler, kültürler ve seyahat deneyimleri hakkında konuşma', CURRENT_TIMESTAMP),
  ('11234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'teknoloji', 'Teknoloji ve İnovasyon', 'Güncel teknoloji trendleri, yapay zeka ve dijital dönüşüm', CURRENT_TIMESTAMP),
  ('21234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'sağlık', 'Sağlık ve Beslenme', 'Sağlıklı yaşam, beslenme alışkanlıkları ve spor', CURRENT_TIMESTAMP),
  ('31234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'çevre', 'Çevre ve Sürdürülebilirlik', 'İklim değişikliği, geri dönüşüm ve çevre koruma', CURRENT_TIMESTAMP),
  ('41234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'eğitim', 'Eğitim ve Öğrenme', 'Online eğitim, dil öğrenme teknikleri ve akademik gelişim', CURRENT_TIMESTAMP),
  ('51234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'iş', 'İş Dünyası ve Kariyer', 'İş hayatı, girişimcilik ve profesyonel gelişim', CURRENT_TIMESTAMP),
  ('61234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'sanat', 'Sanat ve Kültür', 'Müze ziyaretleri, sanat eserleri ve kültürel etkinlikler', CURRENT_TIMESTAMP),
  ('71234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'mutfak', 'Mutfak ve Yemek Kültürü', 'Dünya mutfakları, yemek tarifleri ve gastronomi', CURRENT_TIMESTAMP),
  ('81234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'spor', 'Spor ve Aktiviteler', 'Farklı spor dalları, olimpiyatlar ve fiziksel aktiviteler', CURRENT_TIMESTAMP),
  ('91234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'sosyal', 'Sosyal Medya ve İletişim', 'Dijital iletişim, sosyal ağlar ve online davranışlar', CURRENT_TIMESTAMP),
  ('a1234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'ekonomi', 'Ekonomi ve Finans', 'Ekonomik trendler, yatırım ve kişisel finans yönetimi', CURRENT_TIMESTAMP),
  ('b1234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'bilim', 'Bilim ve Araştırma', 'Bilimsel keşifler, araştırma yöntemleri ve yenilikler', CURRENT_TIMESTAMP),
  ('c1234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'aile', 'Aile ve İlişkiler', 'Aile dinamikleri, arkadaşlık ve sosyal ilişkiler', CURRENT_TIMESTAMP),
  ('d1234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'hobi', 'Hobiler ve İlgi Alanları', 'Kişisel hobiler, yaratıcı aktiviteler ve boş zaman değerlendirme', CURRENT_TIMESTAMP),
  ('e1234567-89ab-cdef-0123-456789abcdef', '00000000-0000-0000-0000-000000000000', 'tarih', 'Tarih ve Coğrafya', 'Dünya tarihi, farklı kültürler ve coğrafi keşifler', CURRENT_TIMESTAMP); 