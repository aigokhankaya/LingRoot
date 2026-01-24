/**
 * 🌱 CEFR Vocabulary Seed Script
 * 
 * Seeds the vocabulary table with Oxford 3000/5000 core words.
 * Each word includes CEFR level, definitions, and example sentences.
 * 
 * Data Source: Open-source CEFR word lists
 * Usage: node scripts/seedCefrVocabulary.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Sample Core Vocabulary (first 50 words for demonstration)
// In production, this should be loaded from a larger dataset (e.g., CSV/JSON file)
const cefrVocabulary = [
    // A1 Level - Very Basic
    { word: 'hello', level: 'A1', definition_tr: 'merhaba', definition_en: 'a greeting', example: 'Hello, how are you?', pos: 'interjection', frequency: 1 },
    { word: 'goodbye', level: 'A1', definition_tr: 'hoşça kal', definition_en: 'farewell', example: 'Goodbye, see you tomorrow!', pos: 'interjection', frequency: 2 },
    { word: 'yes', level: 'A1', definition_tr: 'evet', definition_en: 'affirmative response', example: 'Yes, I agree.', pos: 'adverb', frequency: 3 },
    { word: 'no', level: 'A1', definition_tr: 'hayır', definition_en: 'negative response', example: 'No, thank you.', pos: 'adverb', frequency: 4 },
    { word: 'please', level: 'A1', definition_tr: 'lütfen', definition_en: 'polite request word', example: 'Please sit down.', pos: 'adverb', frequency: 5 },
    { word: 'thank', level: 'A1', definition_tr: 'teşekkür etmek', definition_en: 'to express gratitude', example: 'Thank you for your help.', pos: 'verb', frequency: 6 },
    { word: 'name', level: 'A1', definition_tr: 'isim', definition_en: 'what someone is called', example: 'My name is John.', pos: 'noun', frequency: 7 },
    { word: 'water', level: 'A1', definition_tr: 'su', definition_en: 'clear liquid for drinking', example: 'I need some water.', pos: 'noun', frequency: 8 },
    { word: 'food', level: 'A1', definition_tr: 'yemek', definition_en: 'things you eat', example: 'The food is delicious.', pos: 'noun', frequency: 9 },
    { word: 'house', level: 'A1', definition_tr: 'ev', definition_en: 'building where people live', example: 'This is my house.', pos: 'noun', frequency: 10 },

    // A2 Level - Elementary
    { word: 'understand', level: 'A2', definition_tr: 'anlamak', definition_en: 'to comprehend', example: 'I understand the problem now.', pos: 'verb', frequency: 50 },
    { word: 'important', level: 'A2', definition_tr: 'önemli', definition_en: 'having great significance', example: 'This is an important meeting.', pos: 'adjective', frequency: 51 },
    { word: 'different', level: 'A2', definition_tr: 'farklı', definition_en: 'not the same', example: 'They have different opinions.', pos: 'adjective', frequency: 52 },
    { word: 'experience', level: 'A2', definition_tr: 'deneyim', definition_en: 'knowledge from doing things', example: 'She has a lot of experience.', pos: 'noun', frequency: 53 },
    { word: 'quickly', level: 'A2', definition_tr: 'hızlıca', definition_en: 'at a fast speed', example: 'He ran quickly to catch the bus.', pos: 'adverb', frequency: 54 },

    // B1 Level - Intermediate
    { word: 'achieve', level: 'B1', definition_tr: 'başarmak', definition_en: 'to successfully complete', example: 'She achieved her goal.', pos: 'verb', frequency: 200 },
    { word: 'develop', level: 'B1', definition_tr: 'geliştirmek', definition_en: 'to grow or improve', example: 'We need to develop new skills.', pos: 'verb', frequency: 201 },
    { word: 'environment', level: 'B1', definition_tr: 'çevre', definition_en: 'the natural world', example: 'We must protect the environment.', pos: 'noun', frequency: 202 },
    { word: 'opportunity', level: 'B1', definition_tr: 'fırsat', definition_en: 'a favorable situation', example: 'This is a great opportunity.', pos: 'noun', frequency: 203 },
    { word: 'throughout', level: 'B1', definition_tr: 'boyunca', definition_en: 'in every part of', example: 'The news spread throughout the city.', pos: 'preposition', frequency: 204 },

    // B2 Level - Upper Intermediate
    { word: 'acknowledge', level: 'B2', definition_tr: 'kabul etmek', definition_en: 'to accept or admit', example: 'He acknowledged his mistake.', pos: 'verb', frequency: 500 },
    { word: 'comprehensive', level: 'B2', definition_tr: 'kapsamlı', definition_en: 'including everything', example: 'This is a comprehensive guide.', pos: 'adjective', frequency: 501 },
    { word: 'emphasize', level: 'B2', definition_tr: 'vurgulamak', definition_en: 'to stress importance', example: 'I want to emphasize this point.', pos: 'verb', frequency: 502 },
    { word: 'nevertheless', level: 'B2', definition_tr: 'yine de', definition_en: 'in spite of that', example: 'It was raining; nevertheless, we went out.', pos: 'adverb', frequency: 503 },
    { word: 'substantial', level: 'B2', definition_tr: 'önemli miktarda', definition_en: 'considerable in size', example: 'There was a substantial increase.', pos: 'adjective', frequency: 504 },

    // C1 Level - Advanced
    { word: 'albeit', level: 'C1', definition_tr: 'her ne kadar', definition_en: 'although', example: 'He accepted the job, albeit reluctantly.', pos: 'conjunction', frequency: 1000 },
    { word: 'coherent', level: 'C1', definition_tr: 'tutarlı', definition_en: 'logical and consistent', example: 'She gave a coherent explanation.', pos: 'adjective', frequency: 1001 },
    { word: 'intricate', level: 'C1', definition_tr: 'karmaşık', definition_en: 'very detailed and complex', example: 'The design is intricate.', pos: 'adjective', frequency: 1002 },
    { word: 'predominantly', level: 'C1', definition_tr: 'ağırlıklı olarak', definition_en: 'mainly', example: 'The audience was predominantly young.', pos: 'adverb', frequency: 1003 },
    { word: 'spontaneous', level: 'C1', definition_tr: 'kendiliğinden', definition_en: 'happening naturally', example: 'It was a spontaneous decision.', pos: 'adjective', frequency: 1004 },

    // C2 Level - Proficiency
    { word: 'acquiesce', level: 'C2', definition_tr: 'razı olmak', definition_en: 'to accept reluctantly', example: 'She acquiesced to their demands.', pos: 'verb', frequency: 2000 },
    { word: 'ephemeral', level: 'C2', definition_tr: 'geçici', definition_en: 'lasting a very short time', example: 'Fame can be ephemeral.', pos: 'adjective', frequency: 2001 },
    { word: 'ubiquitous', level: 'C2', definition_tr: 'her yerde bulunan', definition_en: 'present everywhere', example: 'Smartphones are now ubiquitous.', pos: 'adjective', frequency: 2002 },
    { word: 'vicissitude', level: 'C2', definition_tr: 'değişkenlik', definition_en: 'a change of circumstances', example: 'The vicissitudes of life.', pos: 'noun', frequency: 2003 },
    { word: 'sycophant', level: 'C2', definition_tr: 'dalkavuk', definition_en: 'a person who flatters', example: 'He surrounded himself with sycophants.', pos: 'noun', frequency: 2004 },
];

async function seedVocabulary() {
    console.log('🌱 Starting CEFR Vocabulary Seed...');
    let inserted = 0;
    let skipped = 0;

    for (const word of cefrVocabulary) {
        try {
            // Check if word already exists
            const existing = await db.query('SELECT id FROM vocabulary WHERE word = $1', [word.word.toLowerCase()]);

            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }

            // Build meanings JSONB
            const meanings = JSON.stringify([{
                sense_id: 1,
                definition_en: word.definition_en,
                definition_tr: word.definition_tr,
                level: word.level,
                part_of_speech: word.pos,
                example: word.example
            }]);

            // Insert word
            await db.query(`
                INSERT INTO vocabulary (word, original_word, definition, example_sentence, level, min_level, max_level, meanings, frequency_rank, is_core, created_at)
                VALUES ($1, $2, $3, $4, $5, $5, $5, $6, $7, true, NOW())
            `, [
                word.word.toLowerCase(),
                word.word,
                word.definition_tr,
                word.example,
                word.level,
                meanings,
                word.frequency
            ]);

            inserted++;
        } catch (error) {
            console.error(`Error inserting "${word.word}":`, error.message);
        }
    }

    console.log(`\n✅ Seed Complete!`);
    console.log(`   📝 Inserted: ${inserted}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total in list: ${cefrVocabulary.length}`);

    process.exit(0);
}

// Run if called directly
if (require.main === module) {
    seedVocabulary().catch(err => {
        console.error('Seed failed:', err);
        process.exit(1);
    });
}

module.exports = { seedVocabulary, cefrVocabulary };
