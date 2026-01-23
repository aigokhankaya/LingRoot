const db = require('./config/db');

async function checkStatus() {
    try {
        const email = 'egokhankaya@gmail.com';
        console.log(`Checking for user: ${email}`);

        // 1. Get User ID
        const userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log(`User ID: ${userId}`);

        // 2. Check Quest Progress
        console.log('\n--- Quest Progress ---');
        const questsRes = await db.query(`
            SELECT qn.id, qn.title, qn.task_type, uqp.status, uqp.completed_at 
            FROM quest_nodes qn
            LEFT JOIN user_quest_progress uqp ON qn.id = uqp.node_id
            WHERE uqp.user_id = $1
            ORDER BY qn.step_order
        `, [userId]);
        console.table(questsRes.rows);

        // 3. Check Word Reviews Today
        console.log('\n--- Review Stats Today ---');
        const reviewsRes = await db.query(`
            SELECT 
                COUNT(*) as total_reviews,
                SUM(CASE WHEN last_reviewed_at >= CURRENT_DATE THEN 1 ELSE 0 END) as reviewed_today,
                SUM(CASE WHEN next_review_date <= CURRENT_DATE THEN 1 ELSE 0 END) as due_today
            FROM word_reviews
            WHERE user_id = $1
        `, [userId]);
        console.table(reviewsRes.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Force exit
        process.exit();
    }
}

checkStatus();
