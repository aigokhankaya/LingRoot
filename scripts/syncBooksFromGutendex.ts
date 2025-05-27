import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// 🧪 ENV dosyasını kök ya da backend klasöründen yükle
dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
}

// 🔐 Gerekli env değişkenleri var mı?
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Gerekli environment değişkenleri bulunamadı!');
  console.log('📋 Gereken değişkenler:');
  console.log('   - SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY\n');
  console.log('💡 .env dosyasını şu şekilde oluşturmalısınız:');
  console.log('SUPABASE_URL=https://your-project.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

// 🔗 Supabase bağlantısı
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 📘 API veri tipleri
interface GutendexBook {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  languages: string[];
  formats: { [key: string]: string };
  copyright?: boolean;
  download_count: number;
  subjects: string[];
}

interface GutendexResponse {
  results: GutendexBook[];
  next: string | null;
  count: number;
}

// 🚀 Ana fonksiyon
async function syncBooks() {
  let url: string | null = 'https://gutendex.com/books?page=1';
  let totalProcessed = 0;
  let totalInserted = 0;
  let currentPage = 1;

  console.log('🚀 Gutendex kitap senkronizasyonu başlatıldı.');
  console.log('📋 Filtre: İngilizce, telifsiz, text/plain formatlı kitaplar\n');

  while (url) {
    try {
      console.log(`📖 Sayfa ${currentPage}: ${url}`);
      const { data }: { data: GutendexResponse } = await axios.get(url);
      const books = data.results;

      let pageInserted = 0;

      for (const book of books) {
        if (
          !book.languages.includes('en') ||
          !book.formats['text/plain'] ||
          book.copyright
        ) continue;

        const gutendex_id = book.id;
        const title = book.title;
        const authors = book.authors.map(a => a.name).join(', ');
        const cover_url = book.formats['image/jpeg'] || null;
        const download_count = book.download_count;
        const language = book.languages[0] || 'en';
        const subjects = book.subjects.join(', ');

        const { error } = await supabase
          .from('books')
          .upsert(
            {
              gutendex_id,
              title,
              authors,
              cover_url,
              download_count,
              language,
              copyright: false,
              subjects,
            },
            { onConflict: 'gutendex_id' }
          );

        if (error) {
          console.error(`❌ Kitap ${gutendex_id} için hata:`, error.message);
        } else {
          totalInserted++;
          pageInserted++;
        }

        totalProcessed++;
      }

      console.log(`✅ Sayfa ${currentPage} — ${pageInserted} kitap eklendi/güncellendi`);
      console.log(`   🔢 Toplam işlenen: ${totalProcessed}, Toplam eklenen: ${totalInserted}\n`);

      url = data.next;
      currentPage++;

      await new Promise(r => setTimeout(r, 150)); // API'ye saygı için küçük bekleme
    } catch (error) {
      console.error(`❌ Sayfa ${currentPage} hatası:`, error);
      break;
    }
  }

  console.log('\n🎉 Tüm kitaplar senkronize edildi!');
  console.log(`📈 İstatistik: ${totalProcessed} işleme karşılık ${totalInserted} ekleme.`);
}

syncBooks().catch(console.error);
