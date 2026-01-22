const fs = require('fs');
const path = require('path');
// Use the project's centralized DB configuration
const { pool } = require('../config/db');

async function main() {
    // Correct path to docs directory from backend/scripts/
    const contentDir = path.join(__dirname, '../../docs/sector-content');

    if (!fs.existsSync(contentDir)) {
        console.error(`Directory not found: ${contentDir}`);
        // Check if we are in the wrong directory context
        console.error(`Current directory: ${__dirname}`);
        process.exit(1);
    }

    const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));

    if (files.length === 0) {
        console.log('No Markdown files found in the directory.');
        process.exit(0);
    }

    console.log(`Found ${files.length} sector files.`);

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(path.join(contentDir, file), 'utf-8');
        await processFile(content);
    }

    console.log('All files processed.');
    // pool.end() might close the connection too early if listeners are active, 
    // but for a script it is usually fine.
    // However, since we import from a shared module, let's be careful.
    // Force exit after a short delay to allow pending inserts to finish
    setTimeout(() => process.exit(0), 1000);
}

async function processFile(content) {
    // 1. Get Sector Code
    const sectorCodeMatch = content.match(/\*\*Sektör Kodu:\*\*\s*`([^`]+)`/);
    if (!sectorCodeMatch) {
        console.warn('Sector code not found in file, skipping.');
        return;
    }
    const sectorCode = sectorCodeMatch[1];

    // 2. Get Sector ID from DB
    const sectorRes = await pool.query('SELECT id FROM sectors WHERE code = $1', [sectorCode]);
    if (sectorRes.rows.length === 0) {
        console.warn(`Sector not found in DB: ${sectorCode}, skipping.`);
        return;
    }
    const sectorId = sectorRes.rows[0].id;
    console.log(`Sector ID for ${sectorCode}: ${sectorId}`);

    // 3. Parse and Insert Vocabulary
    await processVocabulary(content, sectorId);

    // 4. Parse and Insert Phrases (as Vocabulary with specific category)
    await processPhrases(content, sectorId);

    // 5. Parse and Insert Sentences, Dialogues, Emails (as Content)
    await processContent(content, sectorId);
}

async function processVocabulary(content, sectorId) {
    const sections = content.split('### ');

    let count = 0;
    for (const section of sections) {
        if (!section.includes('| Kelime |')) continue;

        const titleLine = section.split('\n')[0].trim();
        let cefr = 'B1';
        const cefrMatch = titleLine.match(/\((A1|A2|B1|B2|C1|C2)(?:-(A1|A2|B1|B2|C1|C2))?\)/);
        if (cefrMatch) cefr = cefrMatch[1];

        let category = titleLine.replace(/\(.*\)/, '').trim();

        const lines = section.split('\n');
        for (const line of lines) {
            if (!line.startsWith('|') || line.includes('---|---') || line.includes('| Kelime |')) continue;

            const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
            if (parts.length >= 4) {
                const word = parts[0];
                const pronunciation = parts[1];
                const translation = parts[2];
                const example = parts[3];

                try {
                    const check = await pool.query(
                        'SELECT id FROM sector_vocabulary WHERE sector_id = $1 AND word = $2',
                        [sectorId, word]
                    );

                    if (check.rows.length > 0) {
                        await pool.query(
                            `UPDATE sector_vocabulary SET 
                definition_tr = $1, 
                definition_en = $2,
                example_sentence = $3,
                pronunciation = $4,
                category = $5,
                cefr_level = $6
               WHERE id = $7`,
                            [translation, 'Definition pending', example, pronunciation, category, cefr, check.rows[0].id]
                        );
                    } else {
                        await pool.query(
                            `INSERT INTO sector_vocabulary 
                (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, category, cefr_level)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [sectorId, word, pronunciation, 'Definition pending', translation, example, category, cefr]
                        );
                    }
                    count++;
                } catch (err) {
                    console.error(`Error inserting word ${word}:`, err.message);
                }
            }
        }
    }
    console.log(`  vocabulary items processed: ${count}`);
}

async function processPhrases(content, sectorId) {
    const sectionMatch = content.match(/## 💬 Cümle Kalıpları[\s\S]*?(?=## 🗣️|$)/);
    if (!sectionMatch) return;

    const sectionText = sectionMatch[0];
    const subSections = sectionText.split('### ');

    let count = 0;
    for (const sub of subSections) {
        if (!sub.includes('| Kalıp |')) continue;

        const titleLine = sub.split('\n')[0].trim();
        let cefr = 'B1';
        const cefrMatch = titleLine.match(/\((A1|A2|B1|B2|C1|C2)(?:-(A1|A2|B1|B2|C1|C2))?\)/);
        if (cefrMatch) cefr = cefrMatch[1];

        const lines = sub.split('\n');
        for (const line of lines) {
            if (!line.startsWith('|') || line.includes('---|---') || line.includes('| Kalıp |')) continue;

            const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
            if (parts.length >= 3) {
                const phrase = parts[0];
                const translation = parts[1];
                const usage = parts[2];

                try {
                    const check = await pool.query(
                        'SELECT id FROM sector_vocabulary WHERE sector_id = $1 AND word = $2',
                        [sectorId, phrase]
                    );

                    if (check.rows.length === 0) {
                        await pool.query(
                            `INSERT INTO sector_vocabulary 
                                (sector_id, word, definition_en, definition_tr, example_sentence, category, cefr_level, usage_notes)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [sectorId, phrase, 'Common Phrase', translation, usage, 'phrases', cefr, 'Common Phrase / Idiom']
                        );
                        count++;
                    }
                } catch (err) {
                    console.error(`Error inserting phrase ${phrase}:`, err.message);
                }
            }
        }
    }
    console.log(`  phrases processed: ${count}`);
}

async function processContent(content, sectorId) {
    // 1. Essential Sentences
    const sentencesMatch = content.match(/## 🗣️ Temel Cümleler[\s\S]*?(?=## 🎯|$)/);
    if (sentencesMatch) {
        const lines = sentencesMatch[0].split('\n');
        let extracted = [];
        for (const line of lines) {
            if (line.trim().startsWith('|') && !line.includes('---|---') && !line.includes('| İngilizce |')) {
                const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
                if (parts.length >= 2) {
                    extracted.push({ en: parts[0], tr: parts[1] });
                }
            }
        }

        if (extracted.length > 0) {
            const payload = JSON.stringify(extracted);

            // Content title specific to sector
            // But we only have one type per sector for essential sentences usually
            const title = 'Essential Sentences';

            const check = await pool.query(
                "SELECT id FROM sector_content WHERE sector_id = $1 AND content_type = 'essential_sentences'",
                [sectorId]
            );

            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO sector_content (sector_id, content_type, cefr_level, title, original_text, status)
                      VALUES ($1, $2, $3, $4, $5, $6)`,
                    [sectorId, 'essential_sentences', 'B1', title, payload, 'published']
                );
                console.log('  Inserted Essential Sentences');
            } else {
                await pool.query(
                    `UPDATE sector_content SET original_text = $1 WHERE id = $2`,
                    [payload, check.rows[0].id]
                );
                console.log('  Updated Essential Sentences');
            }
        }
    }

    // 2. Dialogues
    const dialoguesMatch = content.match(/## 🎯 Diyalog Örnekleri[\s\S]*?(?=## 📧|$)/);
    if (dialoguesMatch) {
        const dialogues = dialoguesMatch[0].split('### ').slice(1);
        for (const dia of dialogues) {
            const lines = dia.split('\n');
            const title = lines[0].trim();
            const body = lines.slice(1).join('\n').trim();

            const check = await pool.query(
                "SELECT id FROM sector_content WHERE sector_id = $1 AND title = $2 AND content_type = 'dialogue'",
                [sectorId, title]
            );

            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO sector_content (sector_id, content_type, cefr_level, title, original_text, status)
                      VALUES ($1, $2, $3, $4, $5, $6)`,
                    [sectorId, 'dialogue', 'B2', title, body, 'published']
                );
                console.log(`  Inserted Dialogue: ${title}`);
            }
        }
    }

    // 3. Email Templates
    const emailMatch = content.match(/## 📧 E-posta Şablonları[\s\S]*?(?=## 📊|$)/);
    if (emailMatch) {
        const emails = emailMatch[0].split('### ').slice(1);
        for (const eml of emails) {
            const lines = eml.split('\n');
            const title = lines[0].trim();
            const codeBlockMatch = eml.match(/```([\s\S]*?)```/);
            if (codeBlockMatch) {
                const body = codeBlockMatch[1].trim();
                const check = await pool.query(
                    "SELECT id FROM sector_content WHERE sector_id = $1 AND title = $2 AND content_type = 'email_template'",
                    [sectorId, title]
                );

                if (check.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO sector_content (sector_id, content_type, cefr_level, title, original_text, status)
                          VALUES ($1, $2, $3, $4, $5, $6)`,
                        [sectorId, 'email_template', 'B2', title, body, 'published']
                    );
                    console.log(`  Inserted Email Template: ${title}`);
                }
            }
        }
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
