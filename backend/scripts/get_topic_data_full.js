const { supabase } = require('../utils/storage/supabaseClient.js');

async function getFullData() {
    const topicId = '7e08a77d-0e8f-41db-b060-ceef9d9b18d3'; // Istanbul Topic

    // Also check previous topic (Muslim History) for comparison
    const historyTopicId = 'aa7f4ee3-29be-4b5b-91be-c777ac5a73e5';

    await analyzeTopic(topicId, "İSTANBUL");
    console.log("\n--------------------------------------------------\n");
    await analyzeTopic(historyTopicId, "TÜRK TARİHİ");
}

async function analyzeTopic(topicId, label) {
    console.log(`Analyzing Topic: ${label} (${topicId})`);

    // 1. Get Topic Itself
    const { data: topic } = await supabase.from('topics').select('*').eq('id', topicId).single();
    if (!topic) {
        console.log("Topic not found!");
        return;
    }
    console.log(`Title: ${topic.title} (${topic.level})`);

    // 2. Get Topic Content
    const { data: content } = await supabase.from('topic_contents').select('*').eq('topic_id', topicId).order('created_at', { ascending: false });
    if (content && content.length > 0) {
        console.log(`Main Topic Content: YES (Count: ${content.length})`);
        const text = content[0].text_content || content[0].adapted_text || content[0].english_text || "N/A";
        console.log(`Sample: ${text.substring(0, 100)}...`);
    } else {
        console.log("Main Topic Content: NO");
    }

    // 3. Get Subtopics
    const { data: subtopics } = await supabase.from('topics').select('*').eq('parent_id', topicId).order('order_index', { ascending: true });
    console.log(`Found ${subtopics ? subtopics.length : 0} subtopics.`);

    if (subtopics && subtopics.length > 0) {
        const ids = subtopics.map(s => s.id);
        const { data: subContent } = await supabase.from('topic_contents').select('*').in('topic_id', ids);

        const contentCount = subContent ? subContent.length : 0;
        console.log(`Subtopic Content Coverage: ${contentCount}/${subtopics.length}`);

        // Print Subtopic Titles and Content status
        subtopics.forEach(s => {
            const c = subContent ? subContent.find(x => x.topic_id === s.id) : null;
            const status = c ? "✅ CONTENT" : "❌ EMPTY";
            let sample = "";
            if (c) {
                const txt = c.text_content || c.adapted_text || c.english_text || "";
                sample = txt.substring(0, 50) + "...";
            }
            console.log(`- ${s.title}: ${status} ${sample}`);
        });
    }
}

getFullData();
