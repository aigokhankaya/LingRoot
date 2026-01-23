/**
 * Database Schema Exporter
 * Supabase veritabanındaki tüm tabloları, kolonları ve ilişkileri çeker
 * Çalıştırma: node scripts/export_database_schema.js
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
    console.error('Backend .env dosyasını kontrol edin.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportSchema() {
    console.log('🔍 Supabase veritabanı şeması çekiliyor...\n');

    try {
        // 1. Tüm tabloları çek
        const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables');

        if (tablesError) {
            // RPC yoksa alternatif yöntem kullan
            console.log('ℹ️ RPC fonksiyonu bulunamadı, alternatif sorgu kullanılıyor...');
            return await exportSchemaAlternative();
        }

        console.log(`✅ ${tables.length} tablo bulundu\n`);

        const schema = {
            exportedAt: new Date().toISOString(),
            database: 'Supabase PostgreSQL',
            tables: tables
        };

        saveSchema(schema);

    } catch (error) {
        console.error('❌ Hata:', error.message);
        return await exportSchemaAlternative();
    }
}

async function exportSchemaAlternative() {
    console.log('🔄 Alternatif yöntem: information_schema sorgusu...\n');

    // Tablo listesi için raw SQL çalıştır
    const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

    if (tablesError) {
        // information_schema erişimi yoksa, bilinen tabloları manuel kontrol et
        console.log('⚠️ information_schema erişimi yok, bilinen tabloları kontrol ediyorum...');
        return await exportSchemaManual();
    }

    const tables = tablesData.map(t => t.table_name);
    console.log(`✅ ${tables.length} tablo bulundu:`, tables.join(', '));

    const schema = {
        exportedAt: new Date().toISOString(),
        database: 'Supabase PostgreSQL',
        tables: {}
    };

    for (const tableName of tables) {
        try {
            // Her tablo için kolonları çek
            const { data: columns, error } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable, column_default')
                .eq('table_schema', 'public')
                .eq('table_name', tableName);

            if (!error && columns) {
                schema.tables[tableName] = {
                    columns: columns,
                    rowCount: 'N/A'
                };
            }
        } catch (err) {
            console.log(`  ⚠️ ${tableName} kolonları alınamadı`);
        }
    }

    saveSchema(schema);
}

async function exportSchemaManual() {
    console.log('📋 Manuel tablo kontrolü başlıyor...\n');

    // Bilinen tablolar listesi (migration dosyalarından)
    const knownTables = [
        'users', 'plans', 'subscriptions', 'conversations', 'messages',
        'books', 'book_chapters', 'chapter_audio', 'topics', 'topic_contents',
        'content_history', 'user_vocabulary', 'user_interests', 'user_favorites',
        'user_book_progress', 'documents', 'document_sections',
        'notifications', 'device_tokens', 'user_insights',
        'api_costs', 'pattern_library', 'daily_usage_patterns',
        'content_ratings', 'content_feedback',
        'payment_providers', 'card_transactions',
        'support_conversations', 'support_messages', 'support_message_attachments',
        // Gamification
        'user_gamification', 'user_goals', 'achievements', 'user_achievements',
        'quest_nodes', 'user_quest_progress', 'daily_quests',
        'word_reviews', 'word_mastery', 'quiz_attempts', 'xp_transactions',
        'weekly_scores', 'leagues', 'weekly_challenges', 'user_challenge_progress',
        'user_topic_mastery', 'user_preference_cache', 'content_categories',
        // Sector English
        'sectors', 'user_sectors', 'sector_content', 'sector_vocabulary',
        'user_sector_content_progress', 'user_sector_stats',
        'sector_quizzes', 'user_quiz_results',
        'sector_modules', 'module_items', 'user_module_progress', 'user_module_item_progress',
        // Diğer
        'external_services', 'user_settings', 'hobby_suggestions', 'parameters'
    ];

    const schema = {
        exportedAt: new Date().toISOString(),
        database: 'Supabase PostgreSQL',
        tables: {}
    };

    let foundCount = 0;
    let notFoundCount = 0;

    for (const tableName of knownTables) {
        try {
            // Tablonun var olup olmadığını kontrol et
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })
                .limit(0);

            if (!error) {
                // Tablo var, örnek bir satır çek
                const { data: sample } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);

                const columns = sample && sample.length > 0
                    ? Object.keys(sample[0]).map(col => ({
                        column_name: col,
                        sample_value: typeof sample[0][col] === 'object'
                            ? JSON.stringify(sample[0][col]).substring(0, 50) + '...'
                            : String(sample[0][col]).substring(0, 50)
                    }))
                    : [];

                schema.tables[tableName] = {
                    exists: true,
                    rowCount: count || 0,
                    columns: columns
                };

                console.log(`  ✅ ${tableName} (${count || 0} satır, ${columns.length} kolon)`);
                foundCount++;
            } else {
                schema.tables[tableName] = {
                    exists: false,
                    error: error.message
                };
                console.log(`  ❌ ${tableName} - ${error.message}`);
                notFoundCount++;
            }
        } catch (err) {
            schema.tables[tableName] = {
                exists: false,
                error: err.message
            };
            console.log(`  ❌ ${tableName} - ${err.message}`);
            notFoundCount++;
        }
    }

    console.log(`\n📊 Özet: ${foundCount} tablo bulundu, ${notFoundCount} tablo bulunamadı`);

    saveSchema(schema);
}

function saveSchema(schema) {
    const outputPath = path.join(__dirname, '../../docs/database/supabase_schema_export.json');

    // docs/database klasörünün var olduğundan emin ol
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`\n💾 Şema kaydedildi: ${outputPath}`);

    // Markdown özet de oluştur
    generateMarkdownSummary(schema);
}

function generateMarkdownSummary(schema) {
    const outputPath = path.join(__dirname, '../../docs/database/supabase_tables_summary.md');

    let md = `# Supabase Veritabanı Tabloları

> **Oluşturulma:** ${new Date().toISOString().split('T')[0]} | **Güncelleme:** ${new Date().toISOString().split('T')[0]} | **Versiyon:** 1.0

Bu dosya \`scripts/export_database_schema.js\` tarafından otomatik oluşturulmuştur.

## Tablo Listesi

| Tablo Adı | Durum | Satır Sayısı | Kolon Sayısı |
|-----------|-------|--------------|--------------|
`;

    const tables = Object.entries(schema.tables);

    for (const [tableName, tableInfo] of tables) {
        const status = tableInfo.exists !== false ? '✅' : '❌';
        const rowCount = tableInfo.rowCount || '-';
        const colCount = tableInfo.columns ? tableInfo.columns.length : '-';
        md += `| ${tableName} | ${status} | ${rowCount} | ${colCount} |\n`;
    }

    md += `\n## Toplam: ${tables.filter(([_, t]) => t.exists !== false).length} aktif tablo\n`;

    // Her tablo için detay
    md += `\n---\n\n## Tablo Detayları\n\n`;

    for (const [tableName, tableInfo] of tables) {
        if (tableInfo.exists === false) continue;

        md += `### ${tableName}\n\n`;
        md += `- **Satır Sayısı:** ${tableInfo.rowCount || 'N/A'}\n`;

        if (tableInfo.columns && tableInfo.columns.length > 0) {
            md += `- **Kolonlar:**\n\n`;
            md += `| Kolon | Örnek Değer |\n`;
            md += `|-------|-------------|\n`;

            for (const col of tableInfo.columns) {
                const colName = col.column_name || col;
                const sampleVal = col.sample_value || '-';
                md += `| ${colName} | ${sampleVal.replace(/\|/g, '\\|')} |\n`;
            }
        }
        md += '\n';
    }

    fs.writeFileSync(outputPath, md, 'utf8');
    console.log(`📄 Markdown özet: ${outputPath}`);
}

// Çalıştır
exportSchema().catch(console.error);
