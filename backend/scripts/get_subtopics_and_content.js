const { supabase } = require('../utils/storage/supabaseClient.js');

async function getSubtopicsAndContent() {
    const parentId = 'aa7f4ee3-29be-4b5b-91be-c777ac5a73e5';

    console.log(`Fetching subtopics for parent topic ${parentId}...`);

    const { data: subtopics, error } = await supabase
        .from('topics')
        .select('id, title, description, level')
        .eq('parent_id', parentId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error("Error fetching subtopics:", error);
        return;
    }

    console.log(`Found ${subtopics.length} subtopics.`);

    if (subtopics.length > 0) {
        console.log("Subtopics:");
        subtopics.forEach(st => console.log(`- [${st.id}] ${st.title} (${st.description || ''})`));

        const subtopicIds = subtopics.map(st => st.id);

        const { data: contents, error: contentError } = await supabase
            .from('topic_contents')
            .select('*')
            .in('topic_id', subtopicIds);

        if (contentError) {
            console.error("Error fetching contents:", contentError);
        } else {
            console.log(`\nFound ${contents.length} generated contents for these subtopics.`);
            if (contents.length > 0) {
                console.log("Column Names:", Object.keys(contents[0]).join(", "));

                contents.forEach(c => {
                    const topicTitle = subtopics.find(s => s.id === c.topic_id)?.title;
                    console.log(`\n--- Content for "${topicTitle}" ---`);
                    console.log(`Created: ${c.created_at}`);

                    // Try to find text column
                    const text = c.english_text || c.adapted_text || c.text || c.content || "N/A";
                    const translated = c.translated_text || c.translation || "N/A";

                    console.log(`Sample (Text): ${text.length > 200 ? text.substring(0, 200) + '...' : text}`);
                    console.log(`Sample (Tr): ${translated.length > 200 ? translated.substring(0, 200) + '...' : translated}`);
                });
            }
        }
    }
}

getSubtopicsAndContent();
