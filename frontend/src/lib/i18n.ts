// Güncellenmiş çeviri sözlüğü
import { useCallback } from 'react';

// Dil seçenekleri
export type Locale = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'pt' | 'hi' | 'id';

// Çeviri sözlüğü tipi
export interface TranslationDictionary {
  [key: string]: string;
}

// Tüm çeviriler
export interface Translations {
  [locale: string]: TranslationDictionary;
}

// Güncellenmiş çeviriler - Hata mesajları eklendi
export const translations: Translations = {
  tr: {
    // Genel UI metinleri
    welcome: 'Hoş Geldiniz',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    logout: 'Çıkış Yap',
    profile: 'Profil',
    dashboard: 'Kontrol Paneli',
    settings: 'Ayarlar',
    language: 'Dil',
    email: 'E-posta',
    password: 'Şifre',
    firstName: 'Ad',
    lastName: 'Soyad',
    phoneNumber: 'Telefon Numarası',
    confirm_password: 'Şifreyi Onayla',
    loading: 'Yükleniyor...',
    login_description: 'Devam etmek için hesabınıza giriş yapın.',
    register_description: 'Başlamak için bir hesap oluşturun.',
    no_account_register: 'Hesabınız yok mu? Kayıt Olun',
    already_have_account_login: 'Zaten hesabınız var mı? Giriş Yapın',
    change_language: 'Dili Değiştir',
    firstName_placeholder: 'Adınız',
    lastName_placeholder: 'Soyadınız',
    phoneNumber_placeholder: 'Telefon Numaranız',
    
    // Dil seçenekleri
    language_tr: 'Türkçe',
    language_en: 'English',
    language_de: 'Deutsch',
    language_fr: 'Français',
    language_es: 'Español',
    language_pt: 'Português',
    language_hi: 'हिन्दी',
    language_id: 'Bahasa Indonesia',
    
    // Hata mesajları - Kayıt
    passwords_do_not_match: 'Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.',
    register_failed_generic: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.',
    register_failed_error: 'Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    email_already_exists: 'Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta adresi deneyin veya giriş yapın.',
    invalid_email_format: 'Geçersiz e-posta formatı. Lütfen geçerli bir e-posta adresi girin.',
    missing_required_fields: 'Lütfen tüm zorunlu alanları doldurun.',
    password_too_short: 'Şifre en az 6 karakter uzunluğunda olmalıdır.',
    server_error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
    
    // Hata mesajları - Giriş
    invalid_credentials: 'Geçersiz e-posta veya şifre. Lütfen bilgilerinizi kontrol edin.',
    login_failed_generic: 'Giriş başarısız oldu. Lütfen tekrar deneyin.',
    login_failed_error: 'Giriş sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    account_not_found: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.',
    
    // Hata mesajları - Token
    token_error: 'Oturum bilgileriniz geçersiz. Lütfen tekrar giriş yapın.',
    session_expired: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
    
    // Başarı mesajları
    register_success: 'Kayıt işlemi başarılı! Hoş geldiniz.',
    login_success: 'Giriş başarılı! Hoş geldiniz.',
    password_reset_sent: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
    password_changed: 'Şifreniz başarıyla değiştirildi.',
    profile_updated: 'Profil bilgileriniz güncellendi.',
    
    // Diğer hata mesajları
    cannot_read_token: 'Oturum bilgisi okunamadı. Lütfen tekrar giriş yapın.',
    network_error: 'Ağ hatası. İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
    unknown_error: 'Bilinmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    main_title: "AI Destekli İngilizce Öğrenme",
    main_description: "Her seviyeye uygun, kişiselleştirilmiş İngilizce içerik oluşturun.",
    register_now: "Hemen Kayıt Ol",
    how_it_works: "Nasıl Çalışır?",
    content_type_and_input: "İçerik Türü ve Giriş",
    content_type: "İçerik Türü",
    text: "Metin",
    topic: "Konu",
    youtube: "YouTube",
    web_link: "Web Linki",
    document: "Belge",
    book: "Kitap",
    spotify: "Spotify",
    enter_your_text: "Metninizi girin",
    enter_text_placeholder: "Buraya metin girin...",
    enter_topic: "Konu girin",
    enter_topic_placeholder: "Konu başlığı yazın...",
    topic_description: "Kısa bir konu başlığı girin, örn: 'Yapay Zeka', 'Seyahat'",
    youtube_link: "YouTube Linki",
    web_link_description: "Herhangi bir makale, blog veya haber linki ekleyin.",
    spotify_link: "Spotify Linki",
    select_document: "Belge Seçin",
    upload_file: "Dosya Yükle",
    or_drag_and_drop: "veya sürükleyip bırakın",
    supported_file_types: "Desteklenen dosya türleri: PDF, DOC, DOCX, TXT",
    selected_file: "Seçilen dosya",
    book_name: "Kitap Adı",
    enter_book_name: "Kitap adını girin",
    book_chapter: "Bölüm/Sayfa",
    enter_chapter_number: "Bölüm veya sayfa numarası girin",
    english_level: "İngilizce Seviyesi",
    voice_selection: "Ses Seçimi",
    speaking_rate: "Ses Hızı",
    default_voice: "Varsayılan Ses",
    male_voice: "Erkek Ses",
    female_voice: "Kadın Ses",
    loading_voices: "Sesler yükleniyor...",
    generate_audio: "Sesi Oluştur",
    processing: "İşleniyor...",
    footer_tagline: "Yapay zeka destekli İngilizce öğrenme platformu",
    quick_links: "Hızlı Linkler",
    features: "Özellikler",
    about: "Hakkında",
    contact: "İletişim",
    privacy_policy: "Gizlilik Politikası",
    
    // Privacy Policy Page
    privacy_policy_title: "Gizlilik Politikası",
    privacy_policy_subtitle: "Kişisel verilerinizin güvenliğini en üst seviyede tutuyoruz. Bu dokümanda verilerinizin nasıl korunduğunu açıklıyoruz.",
    privacy_last_updated: "Son Güncellenme",
    privacy_intro_title: "Kişisel Verilerinize Saygılıyız",
    privacy_intro_text1: "LingRoot olarak, kullanıcılarımızın gizliliğini ve veri güvenliğini en üst düzeyde korumayı taahhüt ederiz. Bu Gizlilik Politikası, kişisel verilerinizin nasıl toplandığını, kullanıldığını, saklandığını ve korunduğunu açıklar.",
    privacy_intro_text2: "Platformumuzu kullanırken bu politikayı kabul etmiş sayılırsınız. Herhangi bir değişiklik durumunda size bildirimde bulunacağız.",
    privacy_data_collected: "Topladığımız Veriler",
    privacy_account_info: "Hesap Bilgileri",
    privacy_usage_data: "Kullanım Verileri",
    privacy_technical_data: "Teknik Veriler",
    privacy_how_we_use: "Verileri Nasıl Kullanıyoruz",
    privacy_service_provision: "Hizmet Sağlama",
    privacy_communication: "İletişim",
    privacy_development: "Geliştirme",
    privacy_security: "Güvenlik",
    privacy_data_protection: "Veri Korunması",
    privacy_ssl_encryption: "SSL Şifreleme",
    privacy_ssl_desc: "Tüm veri transferleri 256-bit SSL ile şifrelenir",
    privacy_secure_storage: "Güvenli Saklama",
    privacy_secure_storage_desc: "Veriler güvenli sunucularda korunur",
    privacy_access_control: "Erişim Kontrolü",
    privacy_access_control_desc: "Sadece yetkili personel erişebilir",
    privacy_questions_title: "Sorularınız mı Var?",
    privacy_questions_desc: "Gizlilik politikamız hakkında herhangi bir sorunuz varsa, bizimle iletişime geçmekten çekinmeyin.",
    privacy_contact_us: "İletişime Geçin",
    legal_documents: "Yasal Belgeler",
    
    // Privacy Policy - Account Info Items
    privacy_account_item1: "Ad, soyad ve e-posta adresiniz",
    privacy_account_item2: "Telefon numaranız (isteğe bağlı)",
    privacy_account_item3: "Hesap oluşturma tarihi",
    privacy_account_item4: "Dil öğrenme seviyeniz ve tercihleri",
    
    // Privacy Policy - Usage Data Items
    privacy_usage_item1: "İşlediğiniz içerikler ve sıklığı",
    privacy_usage_item2: "Platformda geçirdiğiniz süre",
    privacy_usage_item3: "Öğrenme ilerlemeniz ve istatistikler",
    privacy_usage_item4: "Tercih ettiğiniz özellikler",
    
    // Privacy Policy - Technical Data Items
    privacy_technical_item1: "IP adresi ve konum bilgisi",
    privacy_technical_item2: "Tarayıcı türü ve versiyonu",
    privacy_technical_item3: "Cihaz bilgileri",
    privacy_technical_item4: "Çerezler ve oturum verileri",
    
    // Privacy Policy - Service Provision Items
    privacy_service_item1: "Kişiselleştirilmiş içerik oluşturma",
    privacy_service_item2: "Hesap yönetimi ve güvenlik",
    privacy_service_item3: "Öğrenme ilerlemesi takibi",
    
    // Privacy Policy - Communication Items
    privacy_comm_item1: "Müşteri destek hizmetleri",
    privacy_comm_item2: "Önemli güncellemeler",
    privacy_comm_item3: "Geri bildirim toplama",
    
    // Privacy Policy - Development Items
    privacy_dev_item1: "Platform performansı analizi",
    privacy_dev_item2: "Yeni özellik geliştirme",
    privacy_dev_item3: "Hata tespiti ve düzeltme",
    
    // Privacy Policy - Security Items
    privacy_sec_item1: "Dolandırıcılık önleme",
    privacy_sec_item2: "Hesap güvenliği",
    privacy_sec_item3: "Sistem koruması",
    text_to_speech: "Metinden Sese",
    pronunciation: "Telaffuz",
    vocabulary: "Kelime Hazinesi",
    all_rights_reserved: "Tüm hakları saklıdır.",
    terms_of_service: "Kullanım Şartları",
    cookie_policy: "Çerez Politikası",
    no_audio_yet: "Henüz ses oluşturulmadı",
    enter_text_to_generate_audio: "Ses oluşturmak için metin girin ve seviye seçin",
    
    // InputSection specific translations
    get_topic_suggestions: "Konu için öneri al",
    topic_suggestions_title: "Konu başlığına göre öneriler:",
    back_and_select_other_topic: "Geri dön ve başka konu seç",
    topic_suggestions_error: "Konu önerileri alınamadı.",
    voice_male_uk: "Erkek Ses (İngiltere)",
    voice_male_us: "Erkek Ses (ABD)",
    voice_female_us: "Kadın Ses (ABD)",
  },
  en: {
    // General UI texts
    welcome: 'Welcome',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    profile: 'Profile',
    dashboard: 'Dashboard',
    settings: 'Settings',
    language: 'Language',
    email: 'Email',
    password: 'Password',
    firstName: 'First Name',
    lastName: 'Last Name',
    phoneNumber: 'Phone Number',
    confirm_password: 'Confirm Password',
    loading: 'Loading...',
    login_description: 'Login to your account to continue.',
    register_description: 'Create an account to get started.',
    no_account_register: "Don't have an account? Register",
    already_have_account_login: 'Already have an account? Login',
    change_language: 'Change Language',
    firstName_placeholder: 'Your first name',
    lastName_placeholder: 'Your last name',
    phoneNumber_placeholder: 'Your phone number',
    
    // Language options
    language_tr: 'Türkçe',
    language_en: 'English',
    language_de: 'Deutsch',
    language_fr: 'Français',
    language_es: 'Español',
    language_pt: 'Português',
    language_hi: 'हिन्दी',
    language_id: 'Bahasa Indonesia',
    
    // Error messages - Registration
    passwords_do_not_match: 'Passwords do not match. Please check again.',
    register_failed_generic: 'Registration failed. Please try again.',
    register_failed_error: 'An error occurred during registration. Please try again later.',
    email_already_exists: 'This email is already in use. Please try a different email or login.',
    invalid_email_format: 'Invalid email format. Please enter a valid email address.',
    missing_required_fields: 'Please fill in all required fields.',
    password_too_short: 'Password must be at least 6 characters long.',
    server_error: 'Server error. Please try again later.',
    
    // Error messages - Login
    invalid_credentials: 'Invalid email or password. Please check your credentials.',
    login_failed_generic: 'Login failed. Please try again.',
    login_failed_error: 'An error occurred during login. Please try again later.',
    account_not_found: 'No account found with this email address.',
    
    // Error messages - Token
    token_error: 'Your session information is invalid. Please login again.',
    session_expired: 'Your session has expired. Please login again.',
    
    // Success messages
    register_success: 'Registration successful! Welcome.',
    login_success: 'Login successful! Welcome.',
    password_reset_sent: 'Password reset link has been sent to your email.',
    password_changed: 'Your password has been changed successfully.',
    profile_updated: 'Your profile has been updated.',
    
    // Other error messages
    cannot_read_token: 'Session information could not be read. Please login again.',
    network_error: 'Network error. Please check your internet connection and try again.',
    unknown_error: 'An unknown error occurred. Please try again later.',
    main_title: "AI-powered English Learning",
    main_description: "Create personalized English content for every level.",
    register_now: "Register Now",
    how_it_works: "How it Works?",
    content_type_and_input: "Content Type and Input",
    content_type: "Content Type",
    text: "Text",
    topic: "Topic",
    youtube: "YouTube",
    web_link: "Web Link",
    document: "Document",
    book: "Book",
    spotify: "Spotify",
    enter_your_text: "Enter your text",
    enter_text_placeholder: "Type your text here...",
    enter_topic: "Enter topic",
    enter_topic_placeholder: "Type a topic...",
    topic_description: "Enter a short topic, e.g. 'Artificial Intelligence', 'Travel'",
    youtube_link: "YouTube Link",
    web_link_description: "Add any article, blog or news link.",
    spotify_link: "Spotify Link",
    select_document: "Select Document",
    upload_file: "Upload File",
    or_drag_and_drop: "or drag and drop",
    supported_file_types: "Supported file types: PDF, DOC, DOCX, TXT",
    selected_file: "Selected file",
    book_name: "Book Name",
    enter_book_name: "Enter book name",
    book_chapter: "Chapter/Page",
    enter_chapter_number: "Enter chapter or page number",
    english_level: "English Level",
    voice_selection: "Voice Selection",
    speaking_rate: "Speaking Rate",
    default_voice: "Default Voice",
    male_voice: "Male Voice",
    female_voice: "Female Voice",
    loading_voices: "Loading voices...",
    generate_audio: "Generate Audio",
    processing: "Processing...",
    footer_tagline: "AI-powered English learning platform",
    quick_links: "Quick Links",
    features: "Features",
    about: "About",
    contact: "Contact",
    privacy_policy: "Privacy Policy",
    
    // Privacy Policy Page
    privacy_policy_title: "Privacy Policy",
    privacy_policy_subtitle: "We keep your personal data security at the highest level. This document explains how your data is protected.",
    privacy_last_updated: "Last Updated",
    privacy_intro_title: "We Respect Your Personal Data",
    privacy_intro_text1: "At LingRoot, we are committed to protecting our users' privacy and data security at the highest level. This Privacy Policy explains how your personal data is collected, used, stored, and protected.",
    privacy_intro_text2: "By using our platform, you agree to this policy. We will notify you of any changes.",
    privacy_data_collected: "Data We Collect",
    privacy_account_info: "Account Information",
    privacy_usage_data: "Usage Data",
    privacy_technical_data: "Technical Data",
    privacy_how_we_use: "How We Use Data",
    privacy_service_provision: "Service Provision",
    privacy_communication: "Communication",
    privacy_development: "Development",
    privacy_security: "Security",
    privacy_data_protection: "Data Protection",
    privacy_ssl_encryption: "SSL Encryption",
    privacy_ssl_desc: "All data transfers are encrypted with 256-bit SSL",
    privacy_secure_storage: "Secure Storage",
    privacy_secure_storage_desc: "Data is protected on secure servers",
    privacy_access_control: "Access Control",
    privacy_access_control_desc: "Only authorized personnel can access",
    privacy_questions_title: "Have Questions?",
    privacy_questions_desc: "If you have any questions about our privacy policy, please don't hesitate to contact us.",
    privacy_contact_us: "Contact Us",
    legal_documents: "Legal Documents",
    
    // Privacy Policy - Account Info Items
    privacy_account_item1: "Your name, surname and email address",
    privacy_account_item2: "Your phone number (optional)",
    privacy_account_item3: "Account creation date",
    privacy_account_item4: "Your language learning level and preferences",
    
    // Privacy Policy - Usage Data Items
    privacy_usage_item1: "Content you process and frequency",
    privacy_usage_item2: "Time spent on the platform",
    privacy_usage_item3: "Your learning progress and statistics",
    privacy_usage_item4: "Your preferred features",
    
    // Privacy Policy - Technical Data Items
    privacy_technical_item1: "IP address and location information",
    privacy_technical_item2: "Browser type and version",
    privacy_technical_item3: "Device information",
    privacy_technical_item4: "Cookies and session data",
    
    // Privacy Policy - Service Provision Items
    privacy_service_item1: "Creating personalized content",
    privacy_service_item2: "Account management and security",
    privacy_service_item3: "Learning progress tracking",
    
    // Privacy Policy - Communication Items
    privacy_comm_item1: "Customer support services",
    privacy_comm_item2: "Important updates",
    privacy_comm_item3: "Feedback collection",
    
    // Privacy Policy - Development Items
    privacy_dev_item1: "Platform performance analysis",
    privacy_dev_item2: "New feature development",
    privacy_dev_item3: "Bug detection and fixing",
    
    // Privacy Policy - Security Items
    privacy_sec_item1: "Fraud prevention",
    privacy_sec_item2: "Account security",
    privacy_sec_item3: "System protection",
    text_to_speech: "Text to Speech",
    pronunciation: "Pronunciation",
    vocabulary: "Vocabulary",
    all_rights_reserved: "All rights reserved.",
    terms_of_service: "Terms of Service",
    cookie_policy: "Cookie Policy",
    no_audio_yet: "No audio generated yet",
    enter_text_to_generate_audio: "Enter your text and select a level to generate audio",
    
    // InputSection specific translations
    get_topic_suggestions: "Get Topic Suggestions",
    topic_suggestions_title: "Suggestions based on topic:",
    back_and_select_other_topic: "Back and select another topic",
    topic_suggestions_error: "Could not get topic suggestions.",
    voice_male_uk: "Male Voice (UK)",
    voice_male_us: "Male Voice (US)",
    voice_female_us: "Female Voice (US)",
  },
  de: {
    main_title: "KI-gestütztes Englischlernen",
    main_description: "Erstellen Sie personalisierte englische Inhalte für jedes Niveau.",
    register_now: "Jetzt registrieren",
    how_it_works: "Wie funktioniert es?",
    content_type_and_input: "Inhaltstyp und Eingabe",
    content_type: "Inhaltstyp",
    text: "Text",
    topic: "Thema",
    youtube: "YouTube",
    web_link: "Weblink",
    document: "Dokument",
    book: "Buch",
    spotify: "Spotify",
    enter_your_text: "Geben Sie Ihren Text ein",
    enter_text_placeholder: "Geben Sie hier Ihren Text ein...",
    enter_topic: "Thema eingeben",
    enter_topic_placeholder: "Geben Sie ein Thema ein...",
    topic_description: "Geben Sie ein kurzes Thema ein, z.B. 'Künstliche Intelligenz', 'Reisen'",
    youtube_link: "YouTube-Link",
    web_link_description: "Fügen Sie einen Artikel-, Blog- oder Nachrichtenlink hinzu.",
    spotify_link: "Spotify-Link",
    select_document: "Dokument auswählen",
    upload_file: "Datei hochladen",
    or_drag_and_drop: "oder ziehen und ablegen",
    supported_file_types: "Unterstützte Dateitypen: PDF, DOC, DOCX, TXT",
    selected_file: "Ausgewählte Datei",
    book_name: "Buchtitel",
    enter_book_name: "Buchtitel eingeben",
    book_chapter: "Kapitel/Seite",
    enter_chapter_number: "Kapitel- oder Seitennummer eingeben",
    english_level: "Englischniveau",
    voice_selection: "Sprachauswahl",
    speaking_rate: "Sprechgeschwindigkeit",
    default_voice: "Standardstimme",
    male_voice: "Männliche Stimme",
    female_voice: "Weibliche Stimme",
    loading_voices: "Stimmen werden geladen...",
    generate_audio: "Audio generieren",
    processing: "Wird verarbeitet...",
    footer_tagline: "KI-gestützte Englischlernplattform",
    quick_links: "Schnellzugriffe",
    features: "Funktionen",
    about: "Über uns",
    contact: "Kontakt",
    privacy_policy: "Datenschutzrichtlinie",
    text_to_speech: "Text-zu-Sprache",
    pronunciation: "Aussprache",
    vocabulary: "Wortschatz",
    all_rights_reserved: "Alle Rechte vorbehalten.",
    terms_of_service: "Nutzungsbedingungen",
    cookie_policy: "Cookie-Richtlinie",
    no_audio_yet: "Noch kein Audio generiert",
    enter_text_to_generate_audio: "Geben Sie Ihren Text ein und wählen Sie ein Niveau, um Audio zu generieren",
    language_tr: "Türkisch",
    language_en: "Englisch",
    language_de: "Deutsch",
    language_fr: "Französisch",
    language_es: "Spanisch",
    language_pt: "Portugiesisch",
    language_hi: "Hindi",
    language_id: "Bahasa Indonesia"
  },
  fr: {
    main_title: "Apprentissage de l'anglais assisté par IA",
    main_description: "Créez du contenu anglais personnalisé pour chaque niveau.",
    register_now: "S'inscrire maintenant",
    how_it_works: "Comment ça marche ?",
    content_type_and_input: "Type de contenu et saisie",
    content_type: "Type de contenu",
    text: "Texte",
    topic: "Sujet",
    youtube: "YouTube",
    web_link: "Lien Web",
    document: "Document",
    book: "Livre",
    spotify: "Spotify",
    enter_your_text: "Entrez votre texte",
    enter_text_placeholder: "Tapez votre texte ici...",
    enter_topic: "Entrez le sujet",
    enter_topic_placeholder: "Tapez un sujet...",
    topic_description: "Entrez un sujet court, par ex. 'Intelligence Artificielle', 'Voyage'",
    youtube_link: "Lien YouTube",
    web_link_description: "Ajoutez un lien d'article, de blog ou de news.",
    spotify_link: "Lien Spotify",
    select_document: "Sélectionner un document",
    upload_file: "Télécharger le fichier",
    or_drag_and_drop: "ou glisser-déposer",
    supported_file_types: "Types de fichiers pris en charge : PDF, DOC, DOCX, TXT",
    selected_file: "Fichier sélectionné",
    book_name: "Nom du livre",
    enter_book_name: "Entrez le nom du livre",
    book_chapter: "Chapitre/Page",
    enter_chapter_number: "Entrez le numéro du chapitre ou de la page",
    english_level: "Niveau d'anglais",
    voice_selection: "Sélection de la voix",
    speaking_rate: "Vitesse de lecture",
    default_voice: "Voix par défaut",
    male_voice: "Voix masculine",
    female_voice: "Voix féminine",
    loading_voices: "Chargement des voix...",
    generate_audio: "Générer l'audio",
    processing: "Traitement...",
    footer_tagline: "Plateforme d'apprentissage de l'anglais assistée par IA",
    quick_links: "Liens rapides",
    features: "Fonctionnalités",
    about: "À propos",
    contact: "Contact",
    privacy_policy: "Politique de confidentialité",
    text_to_speech: "Texte en parole",
    pronunciation: "Prononciation",
    vocabulary: "Vocabulaire",
    all_rights_reserved: "Tous droits réservés.",
    terms_of_service: "Conditions d'utilisation",
    cookie_policy: "Politique de cookies",
    no_audio_yet: "Aucun audio généré pour le moment",
    enter_text_to_generate_audio: "Entrez votre texte et sélectionnez un niveau pour générer l'audio",
    language_tr: "Turc",
    language_en: "Anglais",
    language_de: "Allemand",
    language_fr: "Français",
    language_es: "Espagnol",
    language_pt: "Portugais",
    language_hi: "Hindi",
    language_id: "Bahasa Indonesia"
  },
  es: {
    main_title: "Aprendizaje de inglés impulsado por IA",
    main_description: "Cree contenido de inglés personalizado para cada nivel.",
    register_now: "Regístrate ahora",
    how_it_works: "¿Cómo funciona?",
    content_type_and_input: "Tipo de contenido y entrada",
    content_type: "Tipo de contenido",
    text: "Texto",
    topic: "Tema",
    youtube: "YouTube",
    web_link: "Enlace web",
    document: "Documento",
    book: "Libro",
    spotify: "Spotify",
    enter_your_text: "Ingrese su texto",
    enter_text_placeholder: "Escriba su texto aquí...",
    enter_topic: "Ingrese el tema",
    enter_topic_placeholder: "Escriba un tema...",
    topic_description: "Ingrese un tema corto, por ejemplo, 'Inteligencia Artificial', 'Viaje'",
    youtube_link: "Enlace de YouTube",
    web_link_description: "Agregue cualquier enlace de artículo, blog o noticia.",
    spotify_link: "Enlace de Spotify",
    select_document: "Seleccionar documento",
    upload_file: "Subir archivo",
    or_drag_and_drop: "o arrastrar y soltar",
    supported_file_types: "Tipos de archivos compatibles: PDF, DOC, DOCX, TXT",
    selected_file: "Archivo seleccionado",
    book_name: "Nombre del libro",
    enter_book_name: "Ingrese el nombre del libro",
    book_chapter: "Capítulo/Página",
    enter_chapter_number: "Ingrese el número de capítulo o página",
    english_level: "Nivel de inglés",
    voice_selection: "Selección de voz",
    speaking_rate: "Velocidad de habla",
    default_voice: "Voz predeterminada",
    male_voice: "Voz masculina",
    female_voice: "Voz femenina",
    loading_voices: "Cargando voces...",
    generate_audio: "Generar audio",
    processing: "Procesando...",
    footer_tagline: "Plataforma de aprendizaje de inglés impulsada por IA",
    quick_links: "Enlaces rápidos",
    features: "Características",
    about: "Acerca de",
    contact: "Contacto",
    privacy_policy: "Política de privacidad",
    text_to_speech: "Texto a voz",
    pronunciation: "Pronunciación",
    vocabulary: "Vocabulario",
    all_rights_reserved: "Todos los derechos reservados.",
    terms_of_service: "Términos de servicio",
    cookie_policy: "Política de cookies",
    no_audio_yet: "Aún no se ha generado audio",
    enter_text_to_generate_audio: "Ingrese su texto y seleccione un nivel para generar audio",
    language_tr: "Turco",
    language_en: "Inglés",
    language_de: "Alemán",
    language_fr: "Francés",
    language_es: "Español",
    language_pt: "Portugués",
    language_hi: "Hindi",
    language_id: "Bahasa Indonesia"
  },
  pt: {
    main_title: "Aprendizagem de inglês com IA",
    main_description: "Crie conteúdo personalizado de inglês para todos os níveis.",
    register_now: "Registrar agora",
    how_it_works: "Como funciona?",
    content_type_and_input: "Tipo de conteúdo e entrada",
    content_type: "Tipo de conteúdo",
    text: "Texto",
    topic: "Tópico",
    youtube: "YouTube",
    web_link: "Link da Web",
    document: "Documento",
    book: "Livro",
    spotify: "Spotify",
    enter_your_text: "Digite seu texto",
    enter_text_placeholder: "Digite seu texto aqui...",
    enter_topic: "Digite o tópico",
    enter_topic_placeholder: "Digite um tópico...",
    topic_description: "Digite um tópico curto, por exemplo, 'Inteligência Artificial', 'Viagem'",
    youtube_link: "Link do YouTube",
    web_link_description: "Adicione qualquer link de artigo, blog ou notícia.",
    spotify_link: "Link do Spotify",
    select_document: "Selecionar documento",
    upload_file: "Fazer upload de arquivo",
    or_drag_and_drop: "ou arraste e solte",
    supported_file_types: "Tipos de arquivos suportados: PDF, DOC, DOCX, TXT",
    selected_file: "Arquivo selecionado",
    book_name: "Nome do livro",
    enter_book_name: "Digite o nome do livro",
    book_chapter: "Capítulo/Página",
    enter_chapter_number: "Digite o número do capítulo ou página",
    english_level: "Nível de inglês",
    voice_selection: "Seleção de voz",
    speaking_rate: "Velocidade da fala",
    default_voice: "Voz padrão",
    male_voice: "Voz masculina",
    female_voice: "Voz feminina",
    loading_voices: "Carregando vozes...",
    generate_audio: "Gerar áudio",
    processing: "Processando...",
    footer_tagline: "Plataforma de aprendizagem de inglês com IA",
    quick_links: "Links rápidos",
    features: "Recursos",
    about: "Sobre",
    contact: "Contato",
    privacy_policy: "Política de privacidade",
    text_to_speech: "Texto para fala",
    pronunciation: "Pronúncia",
    vocabulary: "Vocabulário",
    all_rights_reserved: "Todos os direitos reservados.",
    terms_of_service: "Termos de serviço",
    cookie_policy: "Política de cookies",
    no_audio_yet: "Nenhum áudio gerado ainda",
    enter_text_to_generate_audio: "Digite seu texto e selecione um nível para gerar áudio",
    language_tr: "Turco",
    language_en: "Inglês",
    language_de: "Alemão",
    language_fr: "Francês",
    language_es: "Espanhol",
    language_pt: "Português",
    language_hi: "Hindi",
    language_id: "Bahasa Indonesia"
  },
  hi: {
    main_title: "एआई-संचालित अंग्रेजी सीखना",
    main_description: "हर स्तर के लिए व्यक्तिगत अंग्रेजी सामग्री बनाएं।",
    register_now: "अभी पंजीकरण करें",
    how_it_works: "यह कैसे काम करता है?",
    content_type_and_input: "सामग्री प्रकार और इनपुट",
    content_type: "सामग्री प्रकार",
    text: "पाठ",
    topic: "विषय",
    youtube: "YouTube",
    web_link: "वेब लिंक",
    document: "दस्तावेज़",
    book: "पुस्तक",
    spotify: "Spotify",
    enter_your_text: "अपना पाठ दर्ज करें",
    enter_text_placeholder: "यहां अपना पाठ लिखें...",
    enter_topic: "विषय दर्ज करें",
    enter_topic_placeholder: "एक विषय लिखें...",
    topic_description: "एक छोटा विषय दर्ज करें, जैसे 'कृत्रिम बुद्धिमत्ता', 'यात्रा'",
    youtube_link: "YouTube लिंक",
    web_link_description: "कोई भी लेख, ब्लॉग या समाचार लिंक जोड़ें।",
    spotify_link: "Spotify लिंक",
    select_document: "दस्तावेज़ चुनें",
    upload_file: "फ़ाइल अपलोड करें",
    or_drag_and_drop: "या खींचें और छोड़ें",
    supported_file_types: "समर्थित फ़ाइल प्रकार: PDF, DOC, DOCX, TXT",
    selected_file: "चयनित फ़ाइल",
    book_name: "पुस्तक का नाम",
    enter_book_name: "पुस्तक का नाम दर्ज करें",
    book_chapter: "अध्याय/पृष्ठ",
    enter_chapter_number: "अध्याय या पृष्ठ संख्या दर्ज करें",
    english_level: "अंग्रेजी स्तर",
    voice_selection: "आवाज़ चयन",
    speaking_rate: "बोलने की गति",
    default_voice: "डिफ़ॉल्ट आवाज़",
    male_voice: "पुरुष आवाज़",
    female_voice: "महिला आवाज़",
    loading_voices: "आवाज़ें लोड हो रही हैं...",
    generate_audio: "ऑडियो जनरेट करें",
    processing: "प्रसंस्करण...",
    footer_tagline: "एआई-संचालित अंग्रेजी सीखने का प्लेटफ़ॉर्म",
    quick_links: "त्वरित लिंक",
    features: "विशेषताएँ",
    about: "के बारे में",
    contact: "संपर्क करें",
    privacy_policy: "गोपनीयता नीति",
    text_to_speech: "पाठ से वाणी",
    pronunciation: "उच्चारण",
    vocabulary: "शब्दावली",
    all_rights_reserved: "सर्वाधिकार सुरक्षित।",
    terms_of_service: "सेवा की शर्तें",
    cookie_policy: "कुकी नीति",
    no_audio_yet: "अभी तक कोई ऑडियो जनरेट नहीं हुआ है",
    enter_text_to_generate_audio: "ऑडियो जनरेट करने के लिए अपना पाठ दर्ज करें और एक स्तर चुनें",
    language_tr: "तुर्की",
    language_en: "अंग्रे़ी",
    language_de: "जर्मन",
    language_fr: "फ़्रेंच",
    language_es: "स्पेनिश",
    language_pt: "पुर्तगाली",
    language_hi: "हिन्दी",
    language_id: "Bahasa Indonesia"
  },
  id: {
    main_title: "Pembelajaran Bahasa Inggris Berbasis AI",
    main_description: "Buat konten bahasa Inggris yang dipersonalisasi untuk setiap tingkat.",
    register_now: "Daftar Sekarang",
    how_it_works: "Bagaimana Cara Kerjanya?",
    content_type_and_input: "Jenis Konten dan Input",
    content_type: "Jenis Konten",
    text: "Teks",
    topic: "Topik",
    youtube: "YouTube",
    web_link: "Tautan Web",
    document: "Dokumen",
    book: "Buku",
    spotify: "Spotify",
    enter_your_text: "Masukkan teks Anda",
    enter_text_placeholder: "Ketik teks Anda di sini...",
    enter_topic: "Masukkan topik",
    enter_topic_placeholder: "Ketik topik...",
    topic_description: "Masukkan topik singkat, mis. 'Kecerdasan Buatan', 'Perjalanan'",
    youtube_link: "Tautan YouTube",
    web_link_description: "Tambahkan tautan artikel, blog, atau berita apa pun.",
    spotify_link: "Tautan Spotify",
    select_document: "Pilih Dokumen",
    upload_file: "Unggah File",
    or_drag_and_drop: "atau seret dan lepas",
    supported_file_types: "Jenis file yang didukung: PDF, DOC, DOCX, TXT",
    selected_file: "File yang dipilih",
    book_name: "Nama Buku",
    enter_book_name: "Masukkan nama buku",
    book_chapter: "Bab/Halaman",
    enter_chapter_number: "Masukkan nomor bab atau halaman",
    english_level: "Tingkat Bahasa Inggris",
    voice_selection: "Pilihan Suara",
    speaking_rate: "Kecepatan Bicara",
    default_voice: "Suara Default",
    male_voice: "Suara Pria",
    female_voice: "Suara Wanita",
    loading_voices: "Memuat suara...",
    generate_audio: "Hasilkan Audio",
    processing: "Memproses...",
    footer_tagline: "Platform pembelajaran bahasa Inggris berbasis AI",
    quick_links: "Tautan Cepat",
    features: "Fitur",
    about: "Tentang",
    contact: "Kontak",
    privacy_policy: "Kebijakan Privasi",
    text_to_speech: "Teks ke Ucapan",
    pronunciation: "Pengucapan",
    vocabulary: "Kosakata",
    all_rights_reserved: "Seluruh hak cipta.",
    terms_of_service: "Syarat Layanan",
    cookie_policy: "Kebijakan Cookie",
    no_audio_yet: "Belum ada audio yang dihasilkan",
    enter_text_to_generate_audio: "Masukkan teks Anda dan pilih tingkat untuk menghasilkan audio",
    language_tr: "Turki",
    language_en: "Inggris",
    language_de: "Jerman",
    language_fr: "Perancis",
    language_es: "Spanyol",
    language_pt: "Portugis",
    language_hi: "Hindi",
    language_id: "Bahasa Indonesia"
  },
};

// Varsayılan dil
const defaultLocale: Locale = 'tr';

// Desteklenen diller
export const supportedLocales: Locale[] = ['tr', 'en', 'de', 'fr', 'es', 'pt', 'hi', 'id'];

// Tarayıcı dilini al (Sadece istemci tarafında çalışır)
export const getBrowserLanguage = (): Locale => {
  if (typeof window === 'undefined') {
    return defaultLocale; // Sunucu tarafında varsayılanı döndür
  }
  
  const browserLang = window.navigator.language.split('-')[0] as Locale;
  return supportedLocales.includes(browserLang) ? browserLang : defaultLocale;
};

// localStorage'dan dil tercihini al (Sadece istemci tarafında çalışır)
export const getStoredLanguage = (): Locale | null => {
  if (typeof window === 'undefined') {
    return null; // Sunucu tarafında null döndür
  }
  
  const storedLang = localStorage.getItem('lingroot_language') as Locale;
  return supportedLocales.includes(storedLang) ? storedLang : null;
};

// localStorage'a dil tercihini kaydet (Sadece istemci tarafında çalışır)
export const setStoredLanguage = (locale: Locale): void => {
  if (typeof window === 'undefined') {
    return; // Sunucu tarafında işlem yapma
  }
  
  localStorage.setItem('lingroot_language', locale);
};

// Mevcut dili al (SSR/SSG uyumlu)
export const getCurrentLanguage = (): Locale => {
  // İstemci tarafındaysa depolanan veya tarayıcı dilini kullan
  if (typeof window !== 'undefined') {
    return getStoredLanguage() || getBrowserLanguage() || defaultLocale;
  }
  // Sunucu tarafındaysa varsayılan dili kullan
  return defaultLocale;
};

// Server-safe function to get translation function and locale
export const getTranslation = (localeOverride?: Locale) => {
  // getCurrentLanguage is designed to be server-safe
  const currentLocale = localeOverride || getCurrentLanguage();

  const t = (key: string): string => {
    const value = translations[currentLocale]?.[key] || key;
    // Ensure we always return a string, not an array or object
    return typeof value === 'string' ? value : String(value);
  };

  return { t, currentLocale };
};

// Dil yönetimi için özel hook (Sadece istemci tarafında kullanılmalı)
export const useLanguage = () => {
  // Mevcut dil (Bu hook istemci tarafında çalıştığı için window objesi mevcut olacaktır)
  const currentLocale = getCurrentLanguage();
  
  // Dil değiştirme fonksiyonu
  const changeLanguage = useCallback((locale: Locale) => {
    if (!supportedLocales.includes(locale)) {
      console.error(`Language ${locale} is not supported`);
      return;
    }
    
    setStoredLanguage(locale);
    
    // Dil değişikliğini uygulamak için sayfayı yenile
    // Bu genellikle önerilmez, state yönetimi ile yapılmalı ama mevcut yapıya uyum sağlıyor
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);
  
  return {
    currentLocale,
    changeLanguage,
    supportedLocales
  };
};

// useTranslation hook'u (SSR/SSG uyumlu - wraps server-safe logic)
export const useTranslation = (localeOverride?: Locale) => {
  // Get the server-safe translation function and locale
  const { t, currentLocale } = getTranslation(localeOverride);

  // Use useCallback for performance optimization within the hook context
  const memoizedT = useCallback(t, [currentLocale]);

  return { t: memoizedT, currentLocale };
};
