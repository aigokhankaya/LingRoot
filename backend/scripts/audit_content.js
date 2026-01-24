
const { pool } = require('../config/db');

async function runAudit() {
    try {
        console.log('Starting Content Audit...');

        // 1. Fetch from contenthistory
        console.log('\n--- Content History Samples ---');
        try {
            // Select basic info and a substring of text to check quality
            const contentQuery = `
                SELECT id, content_type, level, 
                       substring(original_text from 1 for 100) as original_snippet,
                       substring(adapted_text from 1 for 200) as adapted_snippet
                FROM contenthistory 
                ORDER BY created_at DESC 
                LIMIT 5;
            `;
            const contentRes = await pool.query(contentQuery);
            if (contentRes.rows.length === 0) console.log("No rows found in contenthistory.");
            contentRes.rows.forEach(r => {
                console.log(`ID: ${r.id}, Type: ${r.content_type}, Level: ${r.level}`);
                console.log(`Original: ${r.original_snippet}...`);
                console.log(`Adapted: ${r.adapted_snippet}...`);
                console.log('---');
            });
        } catch (e) {
            console.error('Failed to query contenthistory:', e.message);
        }

        // 2. Fetch from daily_usage_patterns (raw_response often has the full JSON)
        console.log('\n--- Daily Usage Patterns (generated content) ---');
        try {
            const patternQuery = `
                SELECT id, topic, level, raw_response
                FROM daily_usage_patterns 
                ORDER BY created_at DESC 
                LIMIT 3;
            `;
            const patternRes = await pool.query(patternQuery);
            if (patternRes.rows.length === 0) console.log("No rows found in daily_usage_patterns.");
            patternRes.rows.forEach(r => {
                console.log(`ID: ${r.id}, Topic: ${r.topic}, Level: ${r.level}`);
                // daily_usage_patterns raw_response might be big JSON
                let sample = r.raw_response;
                if (typeof sample === 'object') sample = JSON.stringify(sample);
                if (sample && sample.length > 500) sample = sample.substring(0, 500);
                console.log(`Response Snippet: ${sample}...`);
                console.log('---');
            });
        } catch (e) {
            console.error('Failed to query daily_usage_patterns:', e.message);
        }

        // 3. Fetch topic_contents if exists
        console.log('\n--- Topic Contents ---');
        try {
            // check if table exists first as it wasn't in schema doc
            const tcQuery = `SELECT * FROM topic_contents LIMIT 3`;
            const tcRes = await pool.query(tcQuery);
            if (tcRes.rows.length === 0) console.log("No rows found in topic_contents.");
            tcRes.rows.forEach(r => {
                console.log(JSON.stringify(r).substring(0, 300) + '...');
            });
        } catch (e) {
            console.log('topic_contents query failed (expected if table differs):', e.message);
        }

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await pool.end();
    }
}

runAudit();
