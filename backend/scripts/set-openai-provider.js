/**
 * Update TTS Provider to OpenAI
 * Run: node backend/scripts/set-openai-provider.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../utils/supabaseClient');

async function setOpenAIProvider() {
    console.log('🔧 Setting TTS provider to OpenAI...');

    // First check if setting exists
    const { data: existing, error: selectError } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'tts_provider')
        .single();

    if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Error checking settings:', selectError.message);
        process.exit(1);
    }

    if (existing) {
        console.log(`📋 Current provider: ${existing.value}`);

        // Update existing
        const { data, error } = await supabase
            .from('settings')
            .update({ value: 'openai' })
            .eq('key', 'tts_provider')
            .select();

        if (error) {
            console.error('❌ Error updating provider:', error.message);
            process.exit(1);
        }

        console.log('✅ TTS provider updated to: openai');
    } else {
        // Insert new
        const { data, error } = await supabase
            .from('settings')
            .insert([{ key: 'tts_provider', value: 'openai' }])
            .select();

        if (error) {
            console.error('❌ Error inserting provider:', error.message);
            process.exit(1);
        }

        console.log('✅ TTS provider set to: openai');
    }

    // Verify
    const { data: verify } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'tts_provider')
        .single();

    console.log('📋 Verified setting:', verify);
    console.log('\n🎉 Done! OpenAI TTS is now the default provider.');
    console.log('Available voices: alloy, echo, fable, onyx, nova, shimmer');
}

setOpenAIProvider().catch(console.error);
