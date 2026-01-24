const { supabase } = require('../utils/storage/supabaseClient.js');

async function findTopic() {
    console.log("Searching for topic...");
    const { data, error } = await supabase
        .from('topics')
        .select('id, title, description, level, created_at')
        .ilike('title', '%istanbul%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} topics:`);
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log("No topic found containing 'istanbul'.");
    }
}

findTopic();
