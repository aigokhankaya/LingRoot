/**
 * Pattern Library Data Import Script
 * 
 * Supports 3 main data sources based on analysis document:
 * 1. Emre Okçular Dataset (Kaggle CSV) - Turkish idioms & proverbs
 * 2. Kaikki.org (Wiktionary JSONL) - English idioms with Turkish translations
 * 3. Tatoeba (TSV) - Parallel sentence pairs
 * 
 * Usage:
 *   node import_all_patterns.js                    # Run all imports (seed data)
 *   node import_all_patterns.js --kaggle ./file.csv # Import Kaggle CSV
 *   node import_all_patterns.js --kaikki            # Stream Kaikki.org (large!)
 *   node import_all_patterns.js --tatoeba ./file.tsv # Import Tatoeba TSV
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const axios = require('axios');
const readline = require('readline');
const csv = require('csv-parser'); // npm install csv-parser

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_KEY
    || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or valid SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data Sources
const SOURCES = {
    KAIKKI_EN: 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl'
};

/**
 * 1. Import Emre Okçular Dataset (Kaggle CSV)
 * Download from: https://www.kaggle.com/datasets/emreokcular/turkish-idioms-and-proverbs
 * Expected columns: soz_id, sozum, anlami, turu2, anahtar
 */
async function importKaggleCsv(filePath) {
    console.log('📚 Importing Emre Okçular Dataset (Kaggle CSV)...');

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.log('📥 Download from: https://www.kaggle.com/datasets/emreokcular/turkish-idioms-and-proverbs');
        return;
    }

    const records = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Map Kaggle columns to our schema
                const type = row.turu2?.toLowerCase().includes('atasözü') ? 'proverb' : 'idiom';

                records.push({
                    lang: 'tr',
                    type: type,
                    text: row.sozum || row.soz,
                    explanation: row.anlami,
                    category: row.anahtar,
                    source: 'kaggle_emre_okcular'
                });
            })
            .on('end', async () => {
                console.log(`✅ Parsed ${records.length} records from CSV`);

                // Batch insert
                const BATCH_SIZE = 100;
                let inserted = 0;

                for (let i = 0; i < records.length; i += BATCH_SIZE) {
                    const batch = records.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase.from('pattern_library').insert(batch);
                    if (error) {
                        console.error('Error inserting batch:', error.message);
                    } else {
                        inserted += batch.length;
                    }
                    if (inserted % 500 === 0) console.log(`⏳ Inserted ${inserted}/${records.length}...`);
                }

                console.log(`✨ Imported ${inserted} Turkish idioms/proverbs from Kaggle`);
                resolve();
            })
            .on('error', reject);
    });
}

/**
 * 2b. Import Kaikki.org from LOCAL JSONL file
 * Filters for idioms/proverbs with Turkish translations
 */
async function importKaikkiLocalFile(filePath, sourceLang = 'en') {
    console.log(`📂 Importing Kaikki.org ${sourceLang.toUpperCase()} from local file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let imported = 0;
    let batch = [];
    const BATCH_SIZE = 50;

    console.log('⏳ Processing... this may take several minutes for large files.');

    for await (const line of rl) {
        try {
            if (!line.trim()) continue;
            const entry = JSON.parse(line);
            count++;

            // Filter based on source language
            if (sourceLang === 'en') {
                // English: filter for idioms/proverbs/phrasal verbs
                // Categories can be at entry level OR in senses
                const entryCategories = entry.categories || [];
                const senseCategories = entry.senses?.flatMap(s => s.categories || []) || [];
                const allCategories = [...entryCategories, ...senseCategories];

                const isIdiomOrProverb = allCategories.some(c =>
                    c.name?.includes('English idioms') ||
                    c.name?.includes('English proverbs') ||
                    c.name?.includes('English phrasal verbs') ||
                    c.name?.includes('idiom') ||
                    c.name?.includes('proverb')
                );

                if (!isIdiomOrProverb) continue;

                // Check for Turkish translation (optional now - we'll import even without)
                const translations = entry.senses?.flatMap(s => s.translations || []) || [];
                const trTranslation = translations.find(t => t.code === 'tr');

                const type = allCategories.some(c => c.name?.includes('proverb'))
                    ? 'proverb'
                    : allCategories.some(c => c.name?.includes('phrasal'))
                        ? 'phrasal_verb'
                        : 'idiom';

                batch.push({
                    lang: 'en',
                    type: type,
                    text: entry.word,
                    translation: trTranslation?.word || null,
                    explanation: entry.senses?.[0]?.glosses?.[0] || null,
                    source: 'kaikki_org'
                });
                imported++;
            } else if (sourceLang === 'tr') {
                // Turkish: filter for deyim/atasözü
                const categories = entry.categories || [];
                const pos = entry.pos || '';

                // Turkish idioms often marked as "phrase" or in specific categories
                const isIdiomOrProverb =
                    pos === 'phrase' ||
                    categories.some(c =>
                        c.name?.includes('deyim') ||
                        c.name?.includes('atasöz') ||
                        c.name?.includes('Turkish idioms') ||
                        c.name?.includes('Turkish proverbs')
                    );

                if (!isIdiomOrProverb && pos !== 'phrase') continue;

                // Check for English translation
                const translations = entry.senses?.flatMap(s => s.translations || []) || [];
                const enTranslation = translations.find(t => t.code === 'en');

                const type = categories.some(c => c.name?.includes('atasöz') || c.name?.includes('proverb'))
                    ? 'proverb' : 'idiom';

                batch.push({
                    lang: 'tr',
                    type: type,
                    text: entry.word,
                    translation: enTranslation?.word || null,
                    explanation: entry.senses?.[0]?.glosses?.[0] || null,
                    source: 'kaikki_org'
                });
                imported++;
            }

            // Insert batch
            if (batch.length >= BATCH_SIZE) {
                const { error } = await supabase.from('pattern_library').insert(batch);
                if (error) console.error('Error inserting batch:', error.message);
                batch = [];
                if (imported % 500 === 0) console.log(`⏳ Imported ${imported} items...`);
            }

            // Progress every 100k lines
            if (count % 100000 === 0) {
                console.log(`📊 Scanned ${count} lines, found ${imported} relevant items...`);
            }

        } catch (parseErr) {
            // Ignore parse errors for individual lines
        }
    }

    // Insert remaining
    if (batch.length > 0) {
        await supabase.from('pattern_library').insert(batch);
    }

    console.log(`✨ Import complete. Scanned ${count} lines, imported ${imported} items.`);
}

/**
 * 2. Import Kaikki.org (Wiktionary JSONL) - Streaming from URL
 * Downloads ~1-2GB file and filters for idioms/proverbs with Turkish translations
 */
async function importKaikkiEnglishData() {
    console.log('📥 Starting Kaikki.org English dictionary stream...');
    console.log('⚠️  This downloads a large file (~1-2GB) and may take 10-30 minutes!');

    try {
        const response = await axios({
            method: 'get',
            url: SOURCES.KAIKKI_EN,
            responseType: 'stream'
        });

        const rl = readline.createInterface({
            input: response.data,
            crlfDelay: Infinity
        });

        let count = 0;
        let imported = 0;
        let batch = [];
        const BATCH_SIZE = 50;

        for await (const line of rl) {
            try {
                if (!line.trim()) continue;
                const entry = JSON.parse(line);
                count++;

                // Filter for Idioms/Proverbs/Phrasal Verbs
                const categories = entry.categories || [];
                const isIdiomOrProverb = categories.some(c =>
                    c.name?.includes('English idioms') ||
                    c.name?.includes('English proverbs') ||
                    c.name?.includes('English phrasal verbs')
                );

                if (!isIdiomOrProverb) continue;

                // Check for Turkish translation
                const translations = entry.senses?.flatMap(s => s.translations || []) || [];
                const trTranslation = translations.find(t => t.code === 'tr');

                if (trTranslation) {
                    const type = categories.some(c => c.name?.includes('proverbs'))
                        ? 'proverb'
                        : categories.some(c => c.name?.includes('phrasal'))
                            ? 'phrasal_verb'
                            : 'idiom';

                    batch.push({
                        lang: 'en',
                        type: type,
                        text: entry.word,
                        translation: trTranslation.word,
                        explanation: entry.senses?.[0]?.glosses?.[0] || null,
                        source: 'kaikki_org'
                    });

                    imported++;
                }

                // Insert batch
                if (batch.length >= BATCH_SIZE) {
                    const { error } = await supabase.from('pattern_library').insert(batch);
                    if (error) console.error('Error inserting Kaikki batch:', error.message);
                    batch = [];
                    if (imported % 100 === 0) console.log(`⏳ Imported ${imported} English items...`);
                }

                // Progress every 100k lines
                if (count % 100000 === 0) {
                    console.log(`📊 Scanned ${count} lines, found ${imported} relevant items...`);
                }

            } catch (parseErr) {
                // Ignore parse errors for individual lines
            }
        }

        // Insert remaining
        if (batch.length > 0) {
            await supabase.from('pattern_library').insert(batch);
        }

        console.log(`✨ Kaikki.org import complete. Scanned ${count} lines, imported ${imported} items.`);

    } catch (err) {
        console.error('Failed to stream Kaikki data:', err.message);
    }
}

/**
 * 3. Import Tatoeba (TSV) - Parallel sentence pairs
 * Download from: https://www.manythings.org/bilingual/tur/
 * Format: English TAB Turkish
 */
async function importTatoebaTsv(filePath) {
    console.log('📝 Importing Tatoeba sentence pairs...');

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.log('📥 Download from: https://www.manythings.org/bilingual/tur/');
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let imported = 0;
    let batch = [];
    const BATCH_SIZE = 100;

    for await (const line of rl) {
        try {
            const parts = line.split('\t');

            // Support both formats:
            // 2-column: English TAB Turkish
            // 4-column: ID TAB English TAB ID TAB Turkish (Tatoeba download format)
            let englishText, turkishText;

            if (parts.length >= 4) {
                // 4-column format: ID, EN, ID, TR
                englishText = parts[1].trim();
                turkishText = parts[3].trim();
            } else if (parts.length >= 2) {
                // 2-column format: EN, TR
                englishText = parts[0].trim();
                turkishText = parts[1].trim();
            } else {
                continue;
            }

            if (!englishText || !turkishText) continue;

            // Filter: 3-20 words for quality patterns (relaxed)
            const wordCount = englishText.split(' ').length;
            if (wordCount < 3 || wordCount > 20) continue;

            batch.push({
                lang: 'en',
                type: 'sentence',
                text: englishText,
                translation: turkishText,
                source: 'tatoeba'
            });

            count++;

            if (batch.length >= BATCH_SIZE) {
                const { error } = await supabase.from('pattern_library').insert(batch);
                if (error) console.error('Error inserting Tatoeba batch:', error.message);
                else imported += batch.length;
                batch = [];
                if (imported % 1000 === 0) console.log(`⏳ Imported ${imported} sentences...`);
            }

        } catch (err) {
            // Skip malformed lines
        }
    }

    // Insert remaining
    if (batch.length > 0) {
        const { error } = await supabase.from('pattern_library').insert(batch);
        if (!error) imported += batch.length;
    }

    console.log(`✨ Tatoeba import complete. Imported ${imported} sentence pairs.`);
}

/**
 * 4. Seed Data (Fallback) - Manual curated patterns
 */
async function importSeedData() {
    console.log('🌱 Importing seed data (manual patterns)...');

    const records = [
        // Turkish Proverbs
        { lang: 'tr', type: 'proverb', text: 'Ağaç yaşken eğilir', translation: 'A tree bends while it is young', explanation: 'Eğitim küçük yaşta başlamalı', source: 'seed' },
        { lang: 'tr', type: 'proverb', text: 'Damlaya damlaya göl olur', translation: 'Drop by drop, a lake forms', explanation: 'Küçük şeyler birleşince büyük sonuçlar doğurur', source: 'seed' },
        { lang: 'tr', type: 'proverb', text: 'Sakla samanı gelir zamanı', translation: 'Save the straw, its time will come', explanation: 'Her şeyin bir gün lazım olabileceğini anlatır', source: 'seed' },
        { lang: 'tr', type: 'proverb', text: 'Gözden ırak olan gönülden de ırak olur', translation: 'Out of sight, out of mind', explanation: 'Uzaklaşan kişi zamanla unutulur', source: 'seed' },

        // Turkish Idioms
        { lang: 'tr', type: 'idiom', text: 'Etekleri zil çalmak', translation: 'To be overjoyed', explanation: 'Çok mutlu olmak', source: 'seed' },
        { lang: 'tr', type: 'idiom', text: 'Gözden düşmek', translation: 'To fall out of favor', explanation: 'Birinin gözünde değerini kaybetmek', source: 'seed' },
        { lang: 'tr', type: 'idiom', text: 'Kulağına küpe olmak', translation: 'To be a lesson learned', explanation: 'Bir olaydan ders çıkarmak', source: 'seed' },

        // English Idioms
        { lang: 'en', type: 'idiom', text: 'Break a leg', translation: 'İyi şanslar', explanation: 'Used to wish someone good luck, especially before a performance', source: 'seed' },
        { lang: 'en', type: 'idiom', text: 'Piece of cake', translation: 'Çocuk oyuncağı', explanation: 'Something very easy to do', source: 'seed' },
        { lang: 'en', type: 'idiom', text: 'Hit the nail on the head', translation: 'Tam isabetli konuşmak', explanation: 'To describe exactly what is causing a situation or problem', source: 'seed' },
        { lang: 'en', type: 'idiom', text: 'Bite the bullet', translation: 'Dişini sıkmak', explanation: 'To face a difficult situation bravely', source: 'seed' },
        { lang: 'en', type: 'idiom', text: 'Cost an arm and a leg', translation: 'Göz kamaştıran fiyat', explanation: 'Very expensive', source: 'seed' },

        // English Proverbs
        { lang: 'en', type: 'proverb', text: 'Actions speak louder than words', translation: 'Davranışlar sözlerden daha etkilidir', explanation: 'What you do is more important than what you say', source: 'seed' },
        { lang: 'en', type: 'proverb', text: 'The early bird catches the worm', translation: 'Erken kalkan yol alır', explanation: 'Success comes to those who prepare well and work hard', source: 'seed' },
        { lang: 'en', type: 'proverb', text: 'When in Rome, do as the Romans do', translation: 'Ata binmeden ayaklar sallanmaz', explanation: 'Follow the customs of the place you are visiting', source: 'seed' },

        // Sentence Patterns (from analysis doc section 6)
        { lang: 'en', type: 'pattern', text: 'It is no use [Verb+ing]', translation: '[Fiil]-menin bir faydası yok', explanation: 'Bir eylemin anlamsızlığını vurgular', level: 'B1', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'I would rather [Verb A] than [Verb B]', translation: '[Fiil B]-mektense [Fiil A]-meyi tercih ederim', explanation: 'Tercih ifade eder', level: 'B1', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'I am looking forward to [Noun/Verb+ing]', translation: '[Nesne]-i dört gözle bekliyorum', explanation: 'Heyecanla beklemek', level: 'A2', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'I can\'t help [Verb+ing]', translation: 'Kendimi [Fiil]-mekten alamıyorum', explanation: 'Kontrol edilemeyen bir eylem', level: 'B2', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'There is no point in [Verb+ing]', translation: '[Fiil]-in bir anlamı yok', explanation: 'Bir eylemin gereksizliği', level: 'B1', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'It is likely that...', translation: 'Muhtemelen... / ...-mesi muhtemel', explanation: 'Olasılık ifade eder', level: 'B1', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'I should have [Verb V3]', translation: '[Fiil]-meliydim', explanation: 'Geçmişte yapılmayan bir eylemden pişmanlık', level: 'B2', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'How about [Verb+ing]?', translation: '[Fiil]-meye ne dersin?', explanation: 'Öneri yapmak', level: 'A2', source: 'seed' },
        { lang: 'en', type: 'pattern', text: 'Would you mind [Verb+ing]?', translation: '[Fiil]-menin sakıncası var mı?', explanation: 'Nazik rica', level: 'B1', source: 'seed' },
    ];

    const { error } = await supabase.from('pattern_library').insert(records);
    if (error) {
        console.error('Error inserting seed data:', error.message);
    } else {
        console.log(`✨ Imported ${records.length} seed patterns.`);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--kaggle')) {
        const csvPath = args[args.indexOf('--kaggle') + 1];
        if (csvPath) {
            await importKaggleCsv(csvPath);
        } else {
            console.log('Usage: node import_all_patterns.js --kaggle ./turkish_idioms.csv');
        }
    } else if (args.includes('--kaikki-en')) {
        // Local English JSONL file
        const filePath = args[args.indexOf('--kaikki-en') + 1];
        if (filePath) {
            await importKaikkiLocalFile(filePath, 'en');
        } else {
            console.log('Usage: node import_all_patterns.js --kaikki-en ./kaikki.org-dictionary-English.jsonl');
        }
    } else if (args.includes('--kaikki-tr')) {
        // Local Turkish JSONL file
        const filePath = args[args.indexOf('--kaikki-tr') + 1];
        if (filePath) {
            await importKaikkiLocalFile(filePath, 'tr');
        } else {
            console.log('Usage: node import_all_patterns.js --kaikki-tr ./kaikki.org-dictionary-Turkish.jsonl');
        }
    } else if (args.includes('--kaikki')) {
        // Stream from URL (legacy)
        await importKaikkiEnglishData();
    } else if (args.includes('--tatoeba')) {
        const tsvPath = args[args.indexOf('--tatoeba') + 1];
        if (tsvPath) {
            await importTatoebaTsv(tsvPath);
        } else {
            console.log('Usage: node import_all_patterns.js --tatoeba ./tur-eng.tsv');
        }
    } else {
        // Default: import seed data
        console.log('🚀 Running default import (seed data only)');
        console.log('');
        console.log('For full data import, use:');
        console.log('  --kaggle ./file.csv       : Import Kaggle Turkish idioms CSV');
        console.log('  --kaikki-en ./file.jsonl  : Import local English Kaikki JSONL');
        console.log('  --kaikki-tr ./file.jsonl  : Import local Turkish Kaikki JSONL');
        console.log('  --tatoeba ./file.tsv      : Import Tatoeba sentence pairs');
        console.log('');
        await importSeedData();
    }

    console.log('🚀 Import complete!');
}

main();
