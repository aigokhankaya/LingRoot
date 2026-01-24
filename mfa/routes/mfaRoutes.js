const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { mfaAligner } = require('../utils/mfaAligner');

// Setup upload (Memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Setup Queue (Simple In-Memory)
const mfaJobs = new Map();
const mfaJobQueue = [];
let mfaActiveJobs = 0;

const MAX_CONCURRENT = parseInt(process.env.MFA_ASYNC_MAX_CONCURRENT || '2');

const processQueue = () => {
    if (mfaActiveJobs >= MAX_CONCURRENT) return;
    const jobId = mfaJobQueue.shift();
    if (!jobId) return;

    const job = mfaJobs.get(jobId);
    if (!job) return processQueue();

    mfaActiveJobs++;
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    mfaJobs.set(jobId, job);

    (async () => {
        try {
            const result = await mfaAligner.generateWordTimestamps(
                job.tempAudioPath,
                job.transcript,
                job.locale,
                { debug: job.debugId }
            );
            job.status = 'completed';
            job.result = { timepoints: result, wordCount: result.length };
            console.log(`[MFA-JOB] Job ${jobId} completed. Generated ${result.length} timepoints.`);
        } catch (err) {
            job.status = 'failed';
            job.error = err.message;
        } finally {
            // Cleanup temp file
            await fs.unlink(job.tempAudioPath).catch(() => { });
            job.tempAudioPath = null;

            job.updatedAt = new Date().toISOString();
            mfaJobs.set(jobId, job);
            mfaActiveJobs--;
            processQueue();
        }
    })();
};

// --- ROUTES ---

// Sync Align (Not recommended for long audio due to timeouts)
router.post('/align', upload.single('audio'), async (req, res) => {
    let tempPath = null;
    try {
        const { transcript, locale } = req.body;
        if (!req.file && !req.body.audioBuffer) throw new Error('No audio provided');
        if (!transcript) throw new Error('No transcript provided');

        const buffer = req.file ? req.file.buffer : Buffer.from(req.body.audioBuffer, 'base64');

        // Save temp
        const tempId = `sync_${Date.now()}_${Math.random().toString(36).substr(2)}`;
        tempPath = path.join(os.tmpdir(), `${tempId}.mp3`); // Assuming MP3/WAV input
        await fs.writeFile(tempPath, buffer);

        const result = await mfaAligner.generateWordTimestamps(tempPath, transcript, locale, { debug: req.headers['x-mfa-debug-id'] });

        res.json({ success: true, timepoints: result, wordCount: result.length });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (tempPath) await fs.unlink(tempPath).catch(() => { });
    }
});

// Async Align
router.post('/align-async', upload.single('audio'), async (req, res) => {
    try {
        const { transcript, locale } = req.body;
        if (!req.file && !req.body.audioBuffer) return res.status(400).json({ success: false, error: 'No audio' });

        const buffer = req.file ? req.file.buffer : Buffer.from(req.body.audioBuffer, 'base64');

        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2)}`;
        const tempPath = path.join(os.tmpdir(), `${jobId}.audio`);
        await fs.writeFile(tempPath, buffer);

        const job = {
            id: jobId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            transcript,
            locale,
            tempAudioPath: tempPath,
            debugId: req.headers['x-mfa-debug-id']
        };

        mfaJobs.set(jobId, job);
        mfaJobQueue.push(jobId);

        processQueue(); // Trigger worker

        res.json({ success: true, jobId, status: 'pending' });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Job Status
router.get('/job/:jobId', (req, res) => {
    const job = mfaJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    res.json({
        success: true,
        job: {
            id: job.id,
            status: job.status,
            result: job.result,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
        }
    });
});

// Status / Availability
router.get('/status', async (req, res) => {
    const docker = await mfaAligner.checkMFAAvailability();
    const models = await mfaAligner.checkLocalModels();
    res.json({
        success: true,
        available: docker,
        modelsReady: models,
        queueLength: mfaJobQueue.length,
        activeJobs: mfaActiveJobs
    });
});

/**
 * Speaker Correction Endpoint
 * Analyzes MFA word timings to detect and correct speaker assignment errors
 * POST /correct-speakers
 * Body: { wordTimings: [...], turns: [...] }
 */
router.post('/correct-speakers', async (req, res) => {
    try {
        const { wordTimings, turns } = req.body;

        if (!wordTimings || !Array.isArray(wordTimings)) {
            return res.status(400).json({
                success: false,
                error: 'wordTimings array is required'
            });
        }

        if (!turns || !Array.isArray(turns)) {
            return res.status(400).json({
                success: false,
                error: 'turns array is required'
            });
        }

        console.log(`[MFA-SPEAKER] Analyzing ${wordTimings.length} words across ${turns.length} turns`);

        const result = mfaAligner.detectSpeakerChangesFromTimings(wordTimings, turns);

        res.json({
            success: true,
            ...result
        });

    } catch (err) {
        console.error('[MFA-SPEAKER] Error:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
