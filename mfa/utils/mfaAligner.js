const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Use global logger or console fallback
const logger = global.logger || console;

const execAsync = promisify(exec);

class MFAAligner {
    constructor() {
        this.modelsReady = false;
        this._dictionaryWordSet = null;

        // Config via ENV
        this.dictPath = process.env.MFA_DICT_PATH;
        this.acousticDir = process.env.MFA_ACOUSTIC_DIR;

        if (!this.dictPath || !this.acousticDir) {
            logger.warn('⚠️ MFA_DICT_PATH or MFA_ACOUSTIC_DIR not set in env. Alignment may fail.');
        }
    }

    async getDictionaryWordSet() {
        if (this._dictionaryWordSet) return this._dictionaryWordSet;
        try {
            const dictContent = await fs.readFile(this.dictPath, 'utf-8');
            const set = new Set();
            for (const line of dictContent.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const word = trimmed.split(/\s+/)[0];
                if (!word) continue;
                set.add(word.toLowerCase());
            }
            this._dictionaryWordSet = set;
            return set;
        } catch {
            this._dictionaryWordSet = new Set();
            return this._dictionaryWordSet;
        }
    }

    async filterTranscriptToDictionary(text) {
        const cleaned = this.cleanTranscript(text == null ? '' : String(text));
        const set = await this.getDictionaryWordSet();
        if (!set || set.size === 0) return cleaned;
        const tokens = cleaned.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return cleaned;
        const kept = [];
        for (const t of tokens) {
            const lower = String(t).toLowerCase();
            if (set.has(lower)) kept.push(lower);
        }
        if (kept.length === 0) return cleaned;
        return kept.join(' ');
    }

    // Debug logger for standalone service
    async writeDebugLine(debug, payload) {
        try {
            if (!debug) return;
            const rawId = typeof debug === 'string' ? debug : (debug.id || debug.requestId || debug.tag);
            const debugId = rawId
                ? String(rawId)
                    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                    .replace(/\s+/g, '_')
                    .slice(0, 120)
                : null;
            if (!debugId) return;
            const logsDir = path.join(__dirname, '../logs');
            await fs.mkdir(logsDir, { recursive: true }).catch(() => { });
            const debugPath = path.join(logsDir, `mfa_${debugId}.jsonl`);
            const line = JSON.stringify({
                ts: new Date().toISOString(),
                debug,
                ...payload,
            }) + os.EOL;
            await fs.appendFile(debugPath, line, 'utf-8');
        } catch (e) {
            try {
                logger.warn(`[MFA DEBUG] Failed to write debug dump file: ${e?.message || String(e)}`);
            } catch {
                // ignore
            }
        }
    }

    async checkMFAAvailability() {
        try {
            const { stdout } = await execAsync('docker run --rm mmcauliffe/montreal-forced-aligner mfa version');
            logger.info(`✅ MFA available via Docker: ${stdout.trim()}`);
            return true;
        } catch (error) {
            logger.error('❌ MFA Docker not available:', error.message);
            return false;
        }
    }

    async checkLocalModels() {
        try {
            const fsSync = require('fs');
            const dictExists = fsSync.existsSync(this.dictPath);
            // MFA usually looks for 'final.mdl' inside the acoustic dir
            const acousticExists = fsSync.existsSync(path.join(this.acousticDir, 'final.mdl'));

            if (dictExists && acousticExists) {
                logger.info('✅ MFA acoustic model found');
                logger.info('✅ MFA dictionary found');
                this.modelsReady = true;
                return true;
            } else {
                logger.error('❌ Local MFA models not found at configured paths');
                logger.error(`Dictionary: ${this.dictPath} - ${dictExists ? 'OK' : 'MISSING'}`);
                logger.error(`Acoustic: ${this.acousticDir} - ${acousticExists ? 'OK' : 'MISSING'}`);
                return false;
            }
        } catch (error) {
            logger.error('Error checking local models:', error.message);
            return false;
        }
    }

    async ensureModels() {
        // In standalone, we just verify they exist on disk
        return await this.checkLocalModels();
    }

    async prepareCorpus(audioPath, transcript) {
        const corpusDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-corpus-'));
        const baseName = 'audio';

        // Ensure we preserve the extension or default to .wav if missing
        // Multer temp files often have no extension, so we must rely on the incoming audioPath
        // In this standalone service, audioPath comes from routes/mfaRoutes where we manually add extensions.
        // Let's force a check.
        let audioExt = path.extname(audioPath);
        if (!audioExt || audioExt === '.' || audioExt === '.audio') {
            audioExt = '.wav'; // Fallback
        }

        const corpusAudioPath = path.join(corpusDir, `${baseName}${audioExt}`);
        await fs.copyFile(audioPath, corpusAudioPath);

        const rawTranscript = transcript == null ? '' : String(transcript);

        const splitIntoSentences = (text) => {
            const raw = typeof text === 'string' ? text : '';
            return raw
                .split(/(?<=[.!?])\s+/)
                .map(s => s.trim())
                .filter(Boolean);
        };

        const chunkByWordCount = (text, maxWords = 18) => {
            const raw = typeof text === 'string' ? text : '';
            const words = raw.split(/\s+/).map(w => w.trim()).filter(Boolean);
            if (words.length <= maxWords) return [raw.trim()].filter(Boolean);
            const chunks = [];
            for (let i = 0; i < words.length; i += maxWords) {
                chunks.push(words.slice(i, i + maxWords).join(' '));
            }
            return chunks;
        };

        let sentences = splitIntoSentences(rawTranscript);
        if (sentences.length <= 1) {
            sentences = chunkByWordCount(rawTranscript, 18);
        }

        const cleanedLines = (sentences.length > 0 ? sentences : [rawTranscript])
            .map(s => this.cleanTranscript(s))
            .map(s => (s || '').trim())
            .filter(Boolean);

        const transcriptPath = path.join(corpusDir, `${baseName}.txt`);
        const transcriptForMfa = cleanedLines.length > 0 ? cleanedLines.join(os.EOL) : this.cleanTranscript(rawTranscript);
        await fs.writeFile(transcriptPath, transcriptForMfa, 'utf-8');

        logger.info(`🎯 MFA corpus transcript lines: ${cleanedLines.length}`);
        logger.info(`Corpus prepared: ${corpusDir}`);
        return corpusDir;
    }

    cleanTranscript(text) {
        return (text || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
            .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
            .replace(/[\u2013\u2014]/g, ' ')
            .replace(/\u2026/g, ' ')
            .replace(/\([^)]*\)/g, ' ')
            .replace(/\[[^\]]*\]/g, ' ')
            .replace(/\{[^}]*\}/g, ' ')
            .replace(/[.,!?;:\"\-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async prepareDictionary(corpusDir) {
        const dictPath = path.join(corpusDir, 'english.dict');
        try {
            await fs.copyFile(this.dictPath, dictPath);
            return dictPath;
        } catch (error) {
            logger.error('❌ Failed to copy dictionary to corpus:', error.message);
            throw error;
        }
    }

    async align(corpusDir, dictPath, outputDir, debug = null, alignOptions = {}) {
        const { beam = null, retryBeam = null, singleSpeaker = false } = alignOptions || {};

        // Convert Windows paths to Docker format
        // Reverting to the logic that works in the original project:
        // //c/foo/bar format (double slash at start, lowercase drive letter)
        const toDockerPath = (p) => '//' + p.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);

        // Debug: Verify files exist before mounting
        try {
            const files = await fs.readdir(corpusDir);
            logger.info(`[MFA] Corpus directory contents: ${files.join(', ')}`);
        } catch (e) {
            logger.error(`[MFA] Failed to read corpus dir: ${e.message}`);
        }

        const dockerCorpusDir = toDockerPath(corpusDir);
        const dockerOutputDir = toDockerPath(outputDir);
        const dockerDictDir = toDockerPath(path.dirname(this.dictPath));
        const dockerAcousticDir = toDockerPath(this.acousticDir);

        const extraArgs = [];
        if (singleSpeaker) extraArgs.push('--single_speaker');
        if (beam != null) extraArgs.push(`--beam ${Number(beam)}`);
        if (retryBeam != null) extraArgs.push(`--retry_beam ${Number(retryBeam)}`);

        const command = `docker run --rm --user root ` +
            `-v "${dockerCorpusDir}:/corpus" ` +
            `-v "${dockerOutputDir}:/output" ` +
            `-v "${dockerDictDir}:/dict" ` +
            `-v "${dockerAcousticDir}:/acoustic" ` +
            `mmcauliffe/montreal-forced-aligner ` +
            `mfa align /corpus /dict/${path.basename(this.dictPath)} /acoustic /output --clean --output_format long_textgrid --verbose ${extraArgs.join(' ')}`.trim();

        logger.info(`Running MFA: ${command}`);

        await this.writeDebugLine(debug, { stage: 'docker-command', command });

        const { spawn } = require('child_process');
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let stdout = '';
            let stderr = '';

            // MFA Steps for Progress Logging
            const mfaSteps = [
                'Setting up corpus',
                'Loading corpus',
                'Initializing multiprocessing',
                'Normalizing text',
                'Generating MFCCs',
                'Calculating CMVN',
                'Generating final features',
                'Creating corpus split',
                'Compiling training graphs',
                'Performing first-pass alignment',
                'Generating alignments',
                'Collecting phone and word alignments',
                'Analyzing alignment quality',
                'Exporting alignment TextGrids'
            ];
            let currentStep = 0;

            const child = spawn('cmd', ['/c', command], { shell: true, windowsHide: true });
            const self = this;

            child.stdout.on('data', d => { stdout += d.toString(); });
            child.stderr.on('data', d => {
                const t = d.toString();
                stderr += t;

                // Parse MFA logs
                const lines = t.split('\n');
                lines.forEach(l => {
                    const trimmed = l.trim();
                    if (!trimmed) return;

                    // Check for steps
                    for (let i = currentStep; i < mfaSteps.length; i++) {
                        if (trimmed.toLowerCase().includes(mfaSteps[i].toLowerCase())) {
                            currentStep = i + 1;
                            const stepPercent = Math.round((currentStep / mfaSteps.length) * 100);
                            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                            logger.info(`📍 MFA Step ${currentStep}/${mfaSteps.length} (${stepPercent}%): ${mfaSteps[i]} [${elapsed}s]`);
                            break;
                        }
                    }

                    if (trimmed.includes('ERROR')) {
                        logger.error(`❌ MFA: ${trimmed}`);
                    }
                });
            });

            child.on('close', async (code) => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                if (code === 0) {
                    logger.info(`✅ MFA Success in ${elapsed}s`);
                    resolve(outputDir);
                } else {
                    logger.error(`❌ MFA Failed code ${code} in ${elapsed}s`);
                    // Check for "No alignments"
                    if (stderr.includes('NoAlignmentsError') || stderr.includes('no successful alignments')) {
                        reject(new Error('NoAlignmentsError'));
                    } else {
                        const err = new Error(`MFA failed with code ${code}`);
                        err.stderr = stderr;
                        reject(err);
                    }
                }
            });

            // 40 min timeout to handle very long processing
            setTimeout(() => {
                child.kill();
                reject(new Error('MFA Timeout'));
            }, 2400000);
        });
    }

    async parseTextGrid(textGridPath) {
        try {
            const content = await fs.readFile(textGridPath, 'utf-8');
            const words = [];
            const lines = content.split('\n');

            let inWords = false;
            let start = null, end = null, text = null;

            for (const line of lines) {
                const trimmed = line.trim();

                if (trimmed.includes('name = "words"')) {
                    inWords = true;
                    continue;
                }
                if (trimmed.includes('name = "phones"')) {
                    inWords = false;
                    continue;
                }

                if (inWords) {
                    const xminMatch = trimmed.match(/xmin = ([\d.]+)/);
                    const xmaxMatch = trimmed.match(/xmax = ([\d.]+)/);
                    const textMatch = trimmed.match(/text = "([^"]+)"/);

                    if (xminMatch) start = parseFloat(xminMatch[1]);
                    if (xmaxMatch) end = parseFloat(xmaxMatch[1]);
                    if (textMatch) {
                        text = textMatch[1];
                        if (start !== null && end !== null && text && text !== '' && text !== 'sil' && text !== 'sp') {
                            words.push({
                                word: text,
                                startTime: start,
                                endTime: end
                            });
                        }
                        start = null; end = null; text = null;
                    }
                }
            }
            logger.info(`[MFA-SERVER] Parsed TextGrid: Found ${words.length} aligned words.`);
            return words;
        } catch (error) {
            logger.error('Failed to parse TextGrid:', error.message);
            throw error;
        }
    }

    /**
     * Main entry point for alignment
     */
    async generateWordTimestamps(audioPath, transcript, locale = 'en_US', options = {}) {
        // Standalone service always processes locally (Docker)
        const { debug = null } = options;

        const transcriptText = transcript == null ? '' : String(transcript);
        const cleanedTranscript = this.cleanTranscript(transcriptText);
        const cleanedTokenCount = cleanedTranscript.split(/\s+/).filter(Boolean).length;
        const shouldUseStrongFirstPass = cleanedTokenCount >= 120;
        const audioExt = path.extname(audioPath || '');
        let audioSize = null;
        try {
            const stat = await fs.stat(audioPath);
            audioSize = stat.size;
        } catch {
            audioSize = null;
        }

        await this.writeDebugLine(debug, {
            stage: 'start',
            audioPath,
            audioExt,
            audioSize,
            locale,
            transcript: transcriptText,
            cleanedTranscript,
            cleanedTokenCount,
            shouldUseStrongFirstPass,
        });

        let corpusDir = null, outputDir = null;
        try {
            if (!await this.checkMFAAvailability()) throw new Error('Docker MFA Not Available');
            await this.ensureModels();

            corpusDir = await this.prepareCorpus(audioPath, transcriptText);
            let dictPath = await this.prepareDictionary(corpusDir);

            outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-output-'));
            await this.writeDebugLine(debug, {
                stage: 'local-prepared',
                corpusDir,
                outputDir,
                dictPath,
                models: { dictPath: this.dictPath, acousticDir: this.acousticDir },
            });

            // For long texts (>=120 words), start with aggressive beam settings directly
            const initialAlignOptions = shouldUseStrongFirstPass
                ? { beam: 1000, retryBeam: 4000, singleSpeaker: true }
                : { singleSpeaker: true };

            try {
                await this.writeDebugLine(debug, {
                    stage: 'local-align-initial-options',
                    initialAlignOptions,
                    shouldUseStrongFirstPass,
                });
                await this.align(corpusDir, dictPath, outputDir, debug, initialAlignOptions);
            } catch (alignErr) {
                const msg = alignErr?.message || String(alignErr);
                const shouldRetry = msg.includes('NoAlignmentsError') || msg.includes('There were no successful alignments');

                if (shouldRetry) {
                    // If we already started with high beam (shouldUseStrongFirstPass),
                    // skip intermediate retries and go straight to OOV filtering
                    if (shouldUseStrongFirstPass) {
                        const filteredTranscript = await this.filterTranscriptToDictionary(transcriptText);
                        await this.writeDebugLine(debug, {
                            stage: 'local-align-retry',
                            reason: 'oov_filter_direct',
                            originalTokenCount: cleanedTranscript.split(/\s+/).filter(Boolean).length,
                            filteredTokenCount: filteredTranscript.split(/\s+/).filter(Boolean).length,
                        });
                        try {
                            const transcriptPath = path.join(corpusDir, 'audio.txt');
                            const filteredTokens = filteredTranscript.split(/\s+/).filter(Boolean);
                            const chunked = [];
                            for (let i = 0; i < filteredTokens.length; i += 18) {
                                chunked.push(filteredTokens.slice(i, i + 18).join(' '));
                            }
                            await fs.writeFile(transcriptPath, chunked.join(os.EOL), 'utf-8');
                            await this.align(corpusDir, dictPath, outputDir, debug, { beam: 1000, retryBeam: 4000, singleSpeaker: true });
                        } catch (oovErr) {
                            await this.writeDebugLine(debug, {
                                stage: 'local-align-error',
                                errorMessage: oovErr?.message || String(oovErr),
                                stdout: oovErr?.stdout,
                                stderr: oovErr?.stderr,
                            });
                            throw oovErr;
                        }
                    } else {
                        // For short texts: try beam 100, then beam 1000, then OOV filter
                        const firstRetryOptions = { beam: 100, retryBeam: 400, singleSpeaker: true };
                        await this.writeDebugLine(debug, {
                            stage: 'local-align-retry',
                            reason: 'NoAlignmentsError',
                            retryWith: firstRetryOptions,
                        });

                        try {
                            await this.align(corpusDir, dictPath, outputDir, debug, firstRetryOptions);
                        } catch (retryErr) {
                            const retryMsg = retryErr?.message || String(retryErr);
                            const shouldRetryMore = retryMsg.includes('NoAlignmentsError') || retryMsg.includes('There were no successful alignments');
                            if (shouldRetryMore) {
                                await this.writeDebugLine(debug, {
                                    stage: 'local-align-retry',
                                    reason: 'NoAlignmentsError',
                                    retryWith: { beam: 1000, retryBeam: 4000, singleSpeaker: true },
                                });
                                try {
                                    await this.align(corpusDir, dictPath, outputDir, debug, { beam: 1000, retryBeam: 4000, singleSpeaker: true });
                                } catch (retry2Err) {
                                    const retry2Msg = retry2Err?.message || String(retry2Err);
                                    const shouldTryOovFilter = retry2Msg.includes('NoAlignmentsError') || retry2Msg.includes('There were no successful alignments');
                                    if (shouldTryOovFilter) {
                                        const filteredTranscript = await this.filterTranscriptToDictionary(transcriptText);
                                        await this.writeDebugLine(debug, {
                                            stage: 'local-align-retry',
                                            reason: 'oov_filter',
                                            originalTokenCount: cleanedTranscript.split(/\s+/).filter(Boolean).length,
                                            filteredTokenCount: filteredTranscript.split(/\s+/).filter(Boolean).length,
                                        });
                                        try {
                                            const transcriptPath = path.join(corpusDir, 'audio.txt');
                                            const filteredTokens = filteredTranscript.split(/\s+/).filter(Boolean);
                                            const chunked = [];
                                            for (let i = 0; i < filteredTokens.length; i += 18) {
                                                chunked.push(filteredTokens.slice(i, i + 18).join(' '));
                                            }
                                            await fs.writeFile(transcriptPath, chunked.join(os.EOL), 'utf-8');
                                            await this.align(corpusDir, dictPath, outputDir, debug, { beam: 1000, retryBeam: 4000, singleSpeaker: true });
                                        } catch (oovErr) {
                                            await this.writeDebugLine(debug, {
                                                stage: 'local-align-error',
                                                errorMessage: oovErr?.message || String(oovErr),
                                                stdout: oovErr?.stdout,
                                                stderr: oovErr?.stderr,
                                            });
                                            throw oovErr;
                                        }
                                    } else {
                                        await this.writeDebugLine(debug, {
                                            stage: 'local-align-error',
                                            errorMessage: retry2Msg,
                                            stdout: retry2Err?.stdout,
                                            stderr: retry2Err?.stderr,
                                        });
                                        throw retry2Err;
                                    }
                                }
                            } else {
                                await this.writeDebugLine(debug, {
                                    stage: 'local-align-error',
                                    errorMessage: retryMsg,
                                    stdout: retryErr?.stdout,
                                    stderr: retryErr?.stderr,
                                });
                                throw retryErr;
                            }
                        }
                    }
                } else {
                    await this.writeDebugLine(debug, {
                        stage: 'local-align-error',
                        errorMessage: msg,
                        stdout: alignErr?.stdout,
                        stderr: alignErr?.stderr,
                    });
                    throw alignErr;
                }
            }

            const textGridPath = path.join(outputDir, 'audio.TextGrid');
            const parsed = await this.parseTextGrid(textGridPath);
            logger.info(`✅ [MFA-SERVER] Execution finished. Returning ${parsed.length} timepoints.`);
            return parsed;

        } catch (error) {
            logger.error('MFA Process Error:', error);
            throw error;
        } finally {
            if (corpusDir) await fs.rm(corpusDir, { recursive: true, force: true }).catch(() => { });
            if (outputDir) await fs.rm(outputDir, { recursive: true, force: true }).catch(() => { });
        }
    }

    /**
     * Analyze word timings to detect speaker changes based on pauses
     * Speaker changes typically happen after significant pauses (>0.3s)
     * @param {Array} wordTimings - Array of {word, startTime, endTime} from MFA
     * @param {Array} turns - Original speaker turns [{speaker, text}, ...]
     * @returns {Object} - {corrections: [], correctedTurns: [], pauseAnalysis: []}
     */
    detectSpeakerChangesFromTimings(wordTimings, turns) {
        if (!wordTimings || wordTimings.length === 0 || !turns || turns.length === 0) {
            return { corrections: [], correctedTurns: turns || [], pauseAnalysis: [] };
        }

        const SPEAKER_CHANGE_PAUSE_THRESHOLD = 0.35; // 350ms pause indicates speaker change
        const SHORT_PAUSE_THRESHOLD = 0.15; // 150ms pause within same speaker

        // Analyze pauses between words
        const pauseAnalysis = [];
        for (let i = 1; i < wordTimings.length; i++) {
            const prev = wordTimings[i - 1];
            const curr = wordTimings[i];
            const pauseDuration = curr.startTime - prev.endTime;

            if (pauseDuration > SHORT_PAUSE_THRESHOLD) {
                pauseAnalysis.push({
                    afterWordIndex: i - 1,
                    afterWord: prev.word,
                    beforeWord: curr.word,
                    pauseDuration: pauseDuration,
                    likelySpeakerChange: pauseDuration >= SPEAKER_CHANGE_PAUSE_THRESHOLD,
                    time: prev.endTime
                });
            }
        }

        logger.info(`[MFA-SPEAKER] Found ${pauseAnalysis.length} significant pauses, ${pauseAnalysis.filter(p => p.likelySpeakerChange).length} likely speaker changes`);

        // Map word indices to turn indices
        const turnWordRanges = [];
        let globalWordIndex = 0;
        for (let turnIdx = 0; turnIdx < turns.length; turnIdx++) {
            const turn = turns[turnIdx];
            const turnWords = (turn.text || '').split(/\s+/).filter(w => w.length > 0);
            turnWordRanges.push({
                turnIndex: turnIdx,
                startWordIndex: globalWordIndex,
                endWordIndex: globalWordIndex + turnWords.length - 1,
                wordCount: turnWords.length,
                originalSpeaker: turn.speaker
            });
            globalWordIndex += turnWords.length;
        }

        // Detect mismatches: if a significant pause occurs WITHIN a turn, it might indicate wrong speaker assignment
        const corrections = [];
        const correctedTurns = JSON.parse(JSON.stringify(turns));

        for (const pause of pauseAnalysis) {
            if (!pause.likelySpeakerChange) continue;

            // Find which turn this pause occurs in
            const turnRange = turnWordRanges.find(tr =>
                pause.afterWordIndex >= tr.startWordIndex && pause.afterWordIndex < tr.endWordIndex
            );

            if (turnRange) {
                // Pause within a turn - this might indicate the turn should be split or speaker changed
                // For now, we flag it but don't auto-correct (splitting turns is complex)
                logger.debug(`[MFA-SPEAKER] Significant pause (${pause.pauseDuration.toFixed(2)}s) detected WITHIN turn ${turnRange.turnIndex} after word "${pause.afterWord}"`);
            }
        }

        // Check for consecutive same-speaker turns separated by short pauses (might need to keep them together)
        // and consecutive different-speaker turns with no pause (might need to swap)
        for (let i = 1; i < turns.length; i++) {
            const prevTurn = correctedTurns[i - 1];
            const currTurn = correctedTurns[i];
            const prevRange = turnWordRanges[i - 1];
            const currRange = turnWordRanges[i];

            if (!prevRange || !currRange) continue;

            // Find pause between these turns
            const pauseBetween = pauseAnalysis.find(p =>
                p.afterWordIndex === prevRange.endWordIndex
            );

            const hasSpeakerChangePause = pauseBetween && pauseBetween.likelySpeakerChange;
            const sameSpeaker = prevTurn.speaker === currTurn.speaker;

            // Case 1: Same speaker but significant pause - might need to swap one
            if (sameSpeaker && hasSpeakerChangePause) {
                // Check if current turn is short (likely a reaction that should be from other speaker)
                const currWordCount = (currTurn.text || '').split(/\s+/).filter(Boolean).length;
                if (currWordCount <= 5) {
                    const suggestedSpeaker = currTurn.speaker === 'A' ? 'B' : 'A';
                    corrections.push({
                        turnIndex: i,
                        originalSpeaker: currTurn.speaker,
                        correctedSpeaker: suggestedSpeaker,
                        reason: 'speaker_change_pause_detected',
                        confidence: Math.min(0.95, 0.5 + pauseBetween.pauseDuration),
                        pauseDuration: pauseBetween.pauseDuration
                    });
                    correctedTurns[i].speaker = suggestedSpeaker;
                    logger.info(`[MFA-SPEAKER] Correction: Turn ${i} "${currTurn.text.substring(0, 30)}..." changed from ${currTurn.speaker} to ${suggestedSpeaker} (pause: ${pauseBetween.pauseDuration.toFixed(2)}s)`);
                }
            }

            // Case 2: Different speaker but no pause - might be wrong assignment
            if (!sameSpeaker && !hasSpeakerChangePause && pauseBetween) {
                // Very short pause between different speakers is suspicious
                if (pauseBetween.pauseDuration < 0.1) {
                    // Check if current turn is very short (likely continuation)
                    const currWordCount = (currTurn.text || '').split(/\s+/).filter(Boolean).length;
                    if (currWordCount <= 3) {
                        corrections.push({
                            turnIndex: i,
                            originalSpeaker: currTurn.speaker,
                            correctedSpeaker: prevTurn.speaker,
                            reason: 'no_pause_between_different_speakers',
                            confidence: 0.7,
                            pauseDuration: pauseBetween.pauseDuration
                        });
                        correctedTurns[i].speaker = prevTurn.speaker;
                        logger.info(`[MFA-SPEAKER] Correction: Turn ${i} "${currTurn.text.substring(0, 30)}..." changed from ${currTurn.speaker} to ${prevTurn.speaker} (no pause: ${pauseBetween.pauseDuration.toFixed(2)}s)`);
                    }
                }
            }
        }

        return {
            corrections,
            correctedTurns,
            pauseAnalysis,
            summary: {
                totalTurns: turns.length,
                totalCorrections: corrections.length,
                significantPauses: pauseAnalysis.filter(p => p.likelySpeakerChange).length
            }
        };
    }
}

module.exports = { mfaAligner: new MFAAligner() };
