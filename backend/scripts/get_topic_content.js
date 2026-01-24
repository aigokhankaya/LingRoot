const { supabase } = require('../utils/storage/supabaseClient.js');

async function getContent() {
    const topicId = 'aa7f4ee3-29be-4b5b-91be-c777ac5a73e5';

    console.log(`Fetching contents for topic ${topicId}...`);

    const { data, error } = await supabase
        .from('topic_contents')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} content entries.`);
    if (data.length > 0) {
        const latest = data[0];
        console.log("Latest Content Detail:");
        console.log("ID:", latest.id);
        console.log("Created At:", latest.created_at);
        console.log("English Text Length:", latest.english_text ? latest.english_text.length : 0);
        console.log("Translated Text Length:", latest.translated_text ? latest.translated_text.length : 0);
        console.log("MP3 URL:", latest.mp3_url);

        console.log("\n--- English Text Sample ---");
        console.log(latest.english_text || "N/A");

        console.log("\n--- Translated Text Sample ---");
        console.log(latest.translated_text || "N/A");
    }
}

getContent();
