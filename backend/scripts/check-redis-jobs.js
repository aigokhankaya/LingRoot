
const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

// User provided Redis URL takes precedence for this script
const REDIS_URL = process.env.REDIS_URL || 'rediss://default:AU94AAIncDE2N2I0OWFjNDc3YTQ0ODJiYThlN2VlMTQzNDJmN2UzNXAxMjAzNDQ@current-grouper-20344.upstash.io:6379';

async function checkJobs() {
    console.log('Connecting to Redis URL...');
    // Mask password in logs
    // console.log(REDIS_URL.replace(/:([^:@]+)@/, ':****@'));

    const connection = new Redis(REDIS_URL, {
        tls: { rejectUnauthorized: false } // Upstash usually requires TLS
    });

    const queueName = 'podcast-processing';
    const queue = new Queue(queueName, { connection });

    console.log(`Checking queue: ${queueName}`);

    const counts = await queue.getJobCounts();
    console.log('Job Counts:', counts);

    console.log('\n--- Active Jobs ---');
    const active = await queue.getActive();
    active.forEach(job => {
        console.log(`Job ID: ${job.id}, Data:`, job.data);
    });

    console.log('\n--- Waiting Jobs ---');
    const waiting = await queue.getWaiting();
    waiting.forEach(job => {
        console.log(`Job ID: ${job.id}, Data:`, job.data);
    });

    console.log('\n--- Failed Jobs (Last 5) ---');
    const failed = await queue.getFailed(0, 5);
    failed.forEach(job => {
        console.log(`Job ID: ${job.id}, Failed Reason: ${job.failedReason}, Data:`, job.data);
    });

    await queue.close();
    await connection.quit();
}

checkJobs().catch(console.error);
