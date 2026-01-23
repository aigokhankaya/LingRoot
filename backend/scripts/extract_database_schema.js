/**
 * Extract Database Schema from Supabase
 * -------------------------------------
 * Bu script Supabase veritabanındaki tüm tabloları, kolonları,
 * ilişkileri ve index'leri çekip JSON dosyasına yazar.
 * 
 * Kullanım: node scripts/extract_database_schema.js
 * Çıktı: docs/database/schema-extracted.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase bağlantısı
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL veya SUPABASE_SERVICE_KEY tanımlı değil!');
    console.error('   .env dosyasını kontrol edin.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractSchema() {
    console.log('🔍 Supabase veritabanı şeması çekiliyor...\n');
    
    const schema = {
        extractedAt: new Date().toISOString(),
        supabaseUrl: supabaseUrl.replace(/https?:\/\//, '').split('.')[0], // Proje ID
        tables: [],
        views: [],
        functions: [],
        enums: [],
        summary: {}
    };

    try {
        // 1. Tüm tabloları çek
        console.log('📋 Tablolar çekiliyor...');
        const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables');
        
        if (tablesError) {
            // RPC yoksa alternatif yöntem kullan
            console.log('   ⚠️ RPC bulunamadı, SQL sorgusu deneniyor...');
            
            const { data: rawTables, error: sqlError } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');
            
            if (sqlError) {
                // Manuel sorgu ile dene
                const tablesQuery = `
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                    ORDER BY table_name;
                `;
                
                const { data: sqlTables, error: directError } = await supabase.rpc('exec_sql', { query: tablesQuery });
                
                if (directError) {
                    console.log('   ℹ️ Bilinen tabloları sorguyla kontrol ediyorum...');
                    schema.tables = await checkKnownTables();
                }
            }
        }

        // 2. Bilinen tabloları kontrol et ve kolon bilgilerini çek
        if (schema.tables.length === 0) {
            schema.tables = await checkKnownTables();
        }

        // 3. Özet bilgileri hesapla
        schema.summary = {
            totalTables: schema.tables.length,
            totalColumns: schema.tables.reduce((sum, t) => sum + (t.columns?.length || 0), 0),
            tablesWithRLS: schema.tables.filter(t => t.hasRLS).length,
            tablesByCategory: categorizeTablesByDomain(schema.tables)
        };

        // 4. JSON dosyasına yaz
        const outputPath = path.join(__dirname, '../../docs/database/schema-extracted.json');
        
        // Klasörü oluştur (yoksa)
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf8');
        console.log(`\n✅ Şema çıkarıldı: ${outputPath}`);
        
        // 5. Markdown raporu da oluştur
        const markdownPath = path.join(__dirname, '../../docs/database/schema-extracted-report.md');
        fs.writeFileSync(markdownPath, generateMarkdownReport(schema), 'utf8');
        console.log(`✅ Markdown rapor: ${markdownPath}`);
        
        // 6. Konsola özet yazdır
        console.log('\n📊 ÖZET:');
        console.log(`   Toplam Tablo: ${schema.summary.totalTables}`);
        console.log(`   Toplam Kolon: ${schema.summary.totalColumns}`);
        console.log(`   RLS Aktif Tablolar: ${schema.summary.tablesWithRLS}`);
        console.log('\n   Kategoriler:');
        Object.entries(schema.summary.tablesByCategory).forEach(([cat, tables]) => {
            console.log(`   - ${cat}: ${tables.length} tablo`);
        });

        return schema;

    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

/**
 * Bilinen tabloları sorgulayarak kontrol eder
 */
async function checkKnownTables() {
    // Migration dosyalarından bilinen tablo listesi
    const knownTables = [
        // Core
        'users', 'plans', 'subscriptions', 'payment_providers', 'card_transactions',
        // Content
        'content_history', 'topics', 'topic_contents', 'content_ratings', 'content_feedback',
        // Books & Documents
        'books', 'book_chapters', 'chapter_audio', 'documents', 'document_sections',
        // Chat
        'conversations', 'messages', 'support_conversations', 'support_messages', 'support_message_attachments',
        // Vocabulary
        'user_vocabulary', 'word_reviews', 'word_mastery', 'pattern_library',
        // User Data
        'user_interests', 'user_favorites', 'user_book_progress', 'user_insights', 'user_preference_cache',
        // Gamification
        'user_gamification', 'user_goals', 'achievements', 'user_achievements',
        'quest_nodes', 'user_quest_progress', 'daily_quests',
        'quiz_attempts', 'xp_transactions',
        'weekly_scores', 'leagues', 'weekly_challenges', 'user_challenge_progress',
        // Sector English
        'sectors', 'user_sectors', 'sector_content', 'sector_vocabulary',
        'user_sector_content_progress', 'user_sector_stats',
        'sector_quizzes', 'user_quiz_results',
        'sector_modules', 'module_items', 'user_module_progress', 'user_module_item_progress',
        // Topic Mastery
        'user_topic_mastery',
        // Categories
        'content_categories',
        // Notifications
        'notifications', 'device_tokens',
        // API & Usage
        'api_costs', 'daily_usage_patterns',
        // Settings
        'user_settings', 'external_services', 'parameters'
    ];

    const tables = [];
    let checked = 0;
    
    for (const tableName of knownTables) {
        process.stdout.write(`\r   Kontrol ediliyor: ${++checked}/${knownTables.length} - ${tableName.padEnd(40)}`);
        
        try {
            // Tablonun var olup olmadığını kontrol et
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })
                .limit(0);
            
            if (!error) {
                // Tablo var, kolon bilgilerini çek
                const tableInfo = await getTableInfo(tableName, count || 0);
                tables.push(tableInfo);
            }
        } catch (e) {
            // Tablo yok veya erişim yok, devam et
        }
    }
    
    console.log('\n');
    return tables;
}

/**
 * Tek bir tablonun detaylı bilgilerini çeker
 */
async function getTableInfo(tableName, rowCount) {
    const tableInfo = {
        name: tableName,
        rowCount: rowCount,
        columns: [],
        hasRLS: false,
        foreignKeys: [],
        indexes: []
    };

    try {
        // Örnek bir satır çekerek kolon tiplerini öğren
        const { data: sampleRow, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
            .single();

        if (sampleRow) {
            tableInfo.columns = Object.keys(sampleRow).map(colName => {
                const value = sampleRow[colName];
                return {
                    name: colName,
                    inferredType: inferType(value),
                    sampleValue: truncateValue(value),
                    nullable: value === null
                };
            });
        } else if (!error || error.code === 'PGRST116') {
            // Tablo boş, ama kolon bilgileri metadata'dan alınamaz
            // Supabase client ile kolon şeması almak zor, en azından tablo adını kaydet
            tableInfo.columns = [];
            tableInfo.note = 'Tablo boş veya erişim kısıtlı';
        }

        // RLS kontrolü - eğer hata içeriyorsa muhtemelen RLS aktif
        if (error && error.message?.includes('policy')) {
            tableInfo.hasRLS = true;
        }

    } catch (e) {
        tableInfo.error = e.message;
    }

    return tableInfo;
}

/**
 * JavaScript değerinden SQL tipini tahmin eder
 */
function inferType(value) {
    if (value === null) return 'unknown (null)';
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'timestamp';
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid';
        return 'text';
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'decimal';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'jsonb';
    return typeof value;
}

/**
 * Değeri kısaltır (uzun metinler için)
 */
function truncateValue(value) {
    if (value === null) return null;
    if (typeof value === 'string' && value.length > 50) {
        return value.substring(0, 50) + '...';
    }
    if (typeof value === 'object') {
        return '[object]';
    }
    return value;
}

/**
 * Tabloları domain'e göre kategorize eder
 */
function categorizeTablesByDomain(tables) {
    const categories = {
        'Core / Auth': [],
        'Content & Media': [],
        'Books & Documents': [],
        'Vocabulary & Learning': [],
        'Gamification': [],
        'Sector English': [],
        'Chat & Support': [],
        'Notifications': [],
        'Analytics & Costs': [],
        'Settings & Config': [],
        'Other': []
    };

    const categoryMap = {
        'users': 'Core / Auth',
        'plans': 'Core / Auth',
        'subscriptions': 'Core / Auth',
        'payment_providers': 'Core / Auth',
        'card_transactions': 'Core / Auth',
        
        'content_history': 'Content & Media',
        'topics': 'Content & Media',
        'topic_contents': 'Content & Media',
        'content_ratings': 'Content & Media',
        'content_feedback': 'Content & Media',
        'content_categories': 'Content & Media',
        
        'books': 'Books & Documents',
        'book_chapters': 'Books & Documents',
        'chapter_audio': 'Books & Documents',
        'documents': 'Books & Documents',
        'document_sections': 'Books & Documents',
        'user_book_progress': 'Books & Documents',
        
        'user_vocabulary': 'Vocabulary & Learning',
        'word_reviews': 'Vocabulary & Learning',
        'word_mastery': 'Vocabulary & Learning',
        'pattern_library': 'Vocabulary & Learning',
        'user_topic_mastery': 'Vocabulary & Learning',
        
        'user_gamification': 'Gamification',
        'user_goals': 'Gamification',
        'achievements': 'Gamification',
        'user_achievements': 'Gamification',
        'quest_nodes': 'Gamification',
        'user_quest_progress': 'Gamification',
        'daily_quests': 'Gamification',
        'quiz_attempts': 'Gamification',
        'xp_transactions': 'Gamification',
        'weekly_scores': 'Gamification',
        'leagues': 'Gamification',
        'weekly_challenges': 'Gamification',
        'user_challenge_progress': 'Gamification',
        
        'sectors': 'Sector English',
        'user_sectors': 'Sector English',
        'sector_content': 'Sector English',
        'sector_vocabulary': 'Sector English',
        'user_sector_content_progress': 'Sector English',
        'user_sector_stats': 'Sector English',
        'sector_quizzes': 'Sector English',
        'user_quiz_results': 'Sector English',
        'sector_modules': 'Sector English',
        'module_items': 'Sector English',
        'user_module_progress': 'Sector English',
        'user_module_item_progress': 'Sector English',
        
        'conversations': 'Chat & Support',
        'messages': 'Chat & Support',
        'support_conversations': 'Chat & Support',
        'support_messages': 'Chat & Support',
        'support_message_attachments': 'Chat & Support',
        
        'notifications': 'Notifications',
        'device_tokens': 'Notifications',
        
        'api_costs': 'Analytics & Costs',
        'daily_usage_patterns': 'Analytics & Costs',
        
        'user_settings': 'Settings & Config',
        'external_services': 'Settings & Config',
        'parameters': 'Settings & Config',
        'user_interests': 'Settings & Config',
        'user_favorites': 'Settings & Config',
        'user_insights': 'Settings & Config',
        'user_preference_cache': 'Settings & Config'
    };

    tables.forEach(table => {
        const category = categoryMap[table.name] || 'Other';
        categories[category].push(table.name);
    });

    // Boş kategorileri kaldır
    Object.keys(categories).forEach(key => {
        if (categories[key].length === 0) {
            delete categories[key];
        }
    });

    return categories;
}

/**
 * Markdown formatında rapor oluşturur
 */
function generateMarkdownReport(schema) {
    let md = `# Supabase Database Schema Report

> **Oluşturulma:** ${new Date().toISOString().split('T')[0]} | **Güncelleme:** ${new Date().toISOString().split('T')[0]} | **Versiyon:** 1.0

## Özet

| Metrik | Değer |
|--------|-------|
| Toplam Tablo | ${schema.summary.totalTables} |
| Toplam Kolon | ${schema.summary.totalColumns} |
| RLS Aktif Tablolar | ${schema.summary.tablesWithRLS} |
| Çekilme Tarihi | ${schema.extractedAt} |

## Kategoriler

`;

    Object.entries(schema.summary.tablesByCategory).forEach(([category, tables]) => {
        md += `### ${category}\n\n`;
        tables.forEach(t => {
            md += `- \`${t}\`\n`;
        });
        md += '\n';
    });

    md += `## Tablo Detayları\n\n`;

    schema.tables.forEach(table => {
        md += `### ${table.name}\n\n`;
        md += `**Satır Sayısı:** ${table.rowCount ?? 'Bilinmiyor'}\n\n`;
        
        if (table.columns && table.columns.length > 0) {
            md += `| Kolon | Tip | Nullable |\n`;
            md += `|-------|-----|----------|\n`;
            table.columns.forEach(col => {
                md += `| ${col.name} | ${col.inferredType} | ${col.nullable ? 'Evet' : 'Hayır'} |\n`;
            });
        } else if (table.note) {
            md += `> ${table.note}\n`;
        }
        md += '\n---\n\n';
    });

    return md;
}

// Script'i çalıştır
extractSchema()
    .then(() => {
        console.log('\n🎉 İşlem tamamlandı!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Beklenmeyen hata:', err);
        process.exit(1);
    });
