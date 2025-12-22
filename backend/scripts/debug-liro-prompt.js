/**
 * Debug Script: View Liro System Prompt
 * Generates the full personalized system prompt for a user to verify smart suggestion injection
 */
require('dotenv').config();
const userProfileAnalyzer = require('../utils/userProfileAnalyzer');
const liroPromptGenerator = require('../utils/liroPromptGenerator');

async function main() {
    const userId = '153fe018-0124-43e4-b2e8-dca91f1eb9d4'; // egokhankaya

    console.log('\n🔍 LIRO SYSTEM PROMPT INSPECTOR\n');
    console.log('Generating profile for user:', userId);

    try {
        // 1. Generate full profile
        const profile = await userProfileAnalyzer.generateUserProfile(userId);
        console.log('✅ User Profile Generated');

        // 2. Generate System Prompt
        const systemPrompt = liroPromptGenerator.generateSystemPrompt(profile);

        console.log('\n==================================================');
        console.log('🎨 GENERATED SYSTEM PROMPT (Preview)');
        console.log('==================================================\n');

        // Show the Smart Suggestions section specifically
        const suggestionRegex = /🎯 AKILLI ÖNERİLER[\s\S]*?(?=\n\n|\n[A-Z])/;
        const match = systemPrompt.match(suggestionRegex);

        if (match) {
            console.log('\n✨ FOUND SMART SUGGESTIONS SECTION:\n');
            console.log(match[0]);
        } else {
            console.log('\n⚠️ SMART SUGGESTIONS SECTION NOT FOUND IN PROMPT!');
        }

        console.log('\n--------------------------------------------------');
        console.log('📝 FULL PROMPT (Last 2000 chars):');
        console.log(systemPrompt.slice(-2000));
        console.log('--------------------------------------------------\n');

    } catch (error) {
        console.error('❌ Error generating prompt:', error);
    }

    process.exit(0);
}

main();
