/**
 * Import English idioms with improved filtering
 * Scans Kaikki.org JSONL for phrases/idioms using multiple detection methods
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importEnglishIdioms(filePath) {
    console.log('📂 Importing English idioms with improved filtering...');
    console.log(`File: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let imported = 0;
    let skippedDuplicate = 0;
    let batch = [];
    const BATCH_SIZE = 50;
    const seenTexts = new Set(); // Local dedup

    console.log('⏳ Processing... this will take several minutes for large files.');

    for await (const line of rl) {
        try {
            if (!line.trim()) continue;
            const entry = JSON.parse(line);
            lineCount++;

            // Skip if not a phrase or doesn't have multi-word structure
            const word = entry.word || '';
            const wordCount = word.split(/\s+/).length;

            // Must be multi-word (2+ words) for idioms/phrases
            if (wordCount < 2) continue;

            // Skip very long entries (likely not idioms)
            if (wordCount > 10) continue;

            // Check multiple signals for idiom detection
            const pos = entry.pos || '';
            const entryCategories = entry.categories || [];
            const senseCategories = entry.senses?.flatMap(s => s.categories || []) || [];
            const allCategories = [...entryCategories, ...senseCategories];
            const tags = entry.senses?.flatMap(s => s.tags || []) || [];
            const glosses = entry.senses?.flatMap(s => s.glosses || []) || [];

            // Detection methods
            const isPosPhrase = pos === 'phrase';
            const hasCategoryIdiom = allCategories.some(c =>
                c.name?.toLowerCase().includes('idiom') ||
                c.name?.toLowerCase().includes('proverb') ||
                c.name?.toLowerCase().includes('phrasal') ||
                c.name?.toLowerCase().includes('expression')
            );
            const hasTagIdiomatic = tags.some(t =>
                t.toLowerCase().includes('idiom') ||
                t.toLowerCase().includes('figurative') ||
                t.toLowerCase().includes('idiomatic')
            );
            const hasGlossIdiomatic = glosses.some(g =>
                g.toLowerCase().includes('idiomatic') ||
                g.toLowerCase().includes('figuratively') ||
                g.toLowerCase().includes('used to express')
            );

            // At least one signal must be true
            const isIdiomOrPhrase = isPosPhrase || hasCategoryIdiom || hasTagIdiomatic || hasGlossIdiomatic;

            if (!isIdiomOrPhrase) continue;

            // Skip if already seen in this batch
            const normalizedText = word.toLowerCase().trim();
            if (seenTexts.has(normalizedText)) {
                skippedDuplicate++;
                continue;
            }
            seenTexts.add(normalizedText);

            // Get Turkish translation if available
            const translations = entry.senses?.flatMap(s => s.translations || []) || [];
            const trTranslation = translations.find(t => t.code === 'tr');

            // Determine type
            let type = 'idiom';
            if (allCategories.some(c => c.name?.toLowerCase().includes('proverb'))) {
                type = 'proverb';
            } else if (allCategories.some(c => c.name?.toLowerCase().includes('phrasal'))) {
                type = 'phrasal_verb';
            }

            batch.push({
                lang: 'en',
                type: type,
                text: word,
                translation: trTranslation?.word || null,
                explanation: glosses[0] || null,
                source: 'kaikki_org_v2'
            });

            // Insert batch
            if (batch.length >= BATCH_SIZE) {
                const { error } = await supabase.from('pattern_library').insert(batch);

                if (error && !error.message.includes('duplicate')) {
                    console.error('Error inserting batch:', error.message);
                }

                imported += batch.length;
                batch = [];

                if (imported % 1000 === 0) {
                    console.log(`⏳ Imported ${imported} items... (scanned ${lineCount} lines)`);
                }
            }

            // Progress every 200k lines
            if (lineCount % 200000 === 0) {
                console.log(`📊 Progress: scanned ${lineCount} lines, found ${imported} idioms/phrases`);
            }

        } catch (parseErr) {
            // Ignore parse errors
        }
    }

    // Insert remaining
    if (batch.length > 0) {
        const { error } = await supabase.from('pattern_library').insert(batch);
        if (!error) imported += batch.length;
    }

    console.log(`\n✨ Import complete!`);
    console.log(`📊 Total lines scanned: ${lineCount}`);
    console.log(`✅ Total items imported: ${imported}`);
    console.log(`⏭️  Skipped (local duplicates): ${skippedDuplicate}`);
}

// Run
const filePath = process.argv[2] || './kaikki.org-dictionary-English.jsonl';
importEnglishIdioms(filePath);
