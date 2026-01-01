const { pool } = require('../config/db');
require('dotenv').config({ path: '../.env' });

async function run() {
  try {
    // 1. Get User
    const userRes = await pool.query("SELECT id FROM users WHERE email = 'egokhankaya@gmail.com'");
    if (userRes.rows.length === 0) {
      console.error("User not found");
      process.exit(1);
    }
    const userId = userRes.rows[0].id;

    // 2. Get Main Topic
    const topicRes = await pool.query("SELECT * FROM topics WHERE user_id = $1 AND title ILIKE '%Codex yazılım şirket%'", [userId]);
    if (topicRes.rows.length === 0) {
      console.error("Main topic not found");
      process.exit(1);
    }
    const mainTopic = topicRes.rows[0];

    // 3. Get Subtopics
    const subtopicsRes = await pool.query("SELECT * FROM topics WHERE parent_id = $1 ORDER BY order_index", [mainTopic.id]);
    const subtopics = subtopicsRes.rows;

    // 4. Get Content
    const allTopicIds = [mainTopic.id, ...subtopics.map(t => t.id)];

    const contentsRes = await pool.query(`
        SELECT tc.*, t.title as topic_title
        FROM topic_contents tc
        JOIN topics t ON tc.topic_id = t.id
        WHERE tc.topic_id = ANY($1::uuid[])
        ORDER BY tc.created_at DESC
    `, [allTopicIds]);

    const contents = contentsRes.rows;

    const topicContentMap = {};
    contents.forEach(c => {
      if (!topicContentMap[c.topic_id]) {
        topicContentMap[c.topic_id] = c;
      }
    });

    const formatContent = (contentRow) => {
      if (!contentRow) return "NO_CONTENT_FOUND";

      let text = contentRow.adapted_text || contentRow.original_text;

      if (!text && contentRow.json_content && Array.isArray(contentRow.json_content)) {
        // Reconstruct from json_content
        text = contentRow.json_content.map(w => w.word).join(' ');
      }

      return text || "TEXT_NULL";
    };

    const result = {
      main_topic: {
        title: mainTopic.title,
        content: formatContent(topicContentMap[mainTopic.id])
      },
      subtopics: subtopics.map(t => ({
        title: t.title,
        content: formatContent(topicContentMap[t.id])
      }))
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
