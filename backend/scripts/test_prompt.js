const promptService = require('../utils/promptService');
const logger = require('../utils/logger');

async function testPrompt() {
    try {
        console.log('Testing prompt generation...');

        const prompt = promptService.getPrompt('topic/subtopics', {
            main_topic: 'Tarihte Kurulan Türk Devletleri',
            level: 'B2',
            language: 'Turkish',
            count: 17,
            angle_description: 'Belirtilmedi'
        });

        console.log('--- GENERATED PROMPT ---');
        console.log(prompt);
        console.log('------------------------');

        if (prompt.includes('KATEGORİ ÇEŞİTLİLİĞİ VE LİSTELEME MANTIĞI')) {
            console.log('✅ SUCCESS: New logic found in prompt.');
        } else {
            console.log('❌ FAILURE: New logic NOT found in prompt.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testPrompt();
