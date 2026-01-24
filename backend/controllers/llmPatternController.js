/**
 * LLM Pattern Generator Controller
 * Generates patterns (idioms, proverbs, phrasal verbs) using OpenAI GPT-4o-mini
 * Supports batch processing for large counts
 * Supports exclusion of existing patterns to avoid duplicates
 */

const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const OpenAI = require('openai');

// Fixed model - GPT-4o-mini
const MODEL_ID = 'gpt-4o-mini';
const MODEL_NAME = 'GPT-4o-mini';
const INPUT_COST_PER_M = 0.15;  // $0.15 per 1M input tokens
const OUTPUT_COST_PER_M = 0.60; // $0.60 per 1M output tokens
const BATCH_SIZE = 50; // Max patterns per API call

// Pattern types
const PATTERN_TYPES = ['idiom', 'pattern', 'phrasal_verb', 'proverb'];

/**
 * Get configuration info
 */
exports.getModels = async (req, res) => {
    try {
        res.json({
            success: true,
            model: {
                id: MODEL_ID,
                name: MODEL_NAME,
                inputCostPerM: INPUT_COST_PER_M,
                outputCostPerM: OUTPUT_COST_PER_M
            },
            types: PATTERN_TYPES,
            batchSize: BATCH_SIZE
        });
    } catch (error) {
        logger.error('Error getting LLM config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Generate a single batch of patterns with optional exclusion list
 */
async function generateBatch(openai, type, batchCount, batchNumber, excludeList = []) {
    let exclusionText = "";
    if (excludeList.length > 0) {
        // GPT-4o-mini has 128k context window. 
        // 5000 items * ~5-10 tokens = ~25k-50k tokens. This is well within safe limits and cheap ($0.15/1M).
        // Increasing limit to 10000 to handle large databases effectively.
        const limit = 10000;
        const limitedList = excludeList.slice(0, limit);
        // Only verify we are sending strings and escape quotes
        const listStr = limitedList.map(t => typeof t === 'string' ? `"${t.replace(/"/g, '')}"` : `""`).join(", ");
        exclusionText = `\nIMPORTANT: Do NOT generate any of the following ${type}s as we already have them: [${listStr}]. Generate completely NEW and UNIQUE ones.`;
    }

    const systemPrompts = {
        idiom: `You are an expert English linguist. Generate unique English idioms with their Turkish translations and explanations.
Focus on commonly used, practical idioms. Do NOT include very common ones like "break a leg" or "piece of cake".
Generate diverse idioms - avoid repetition.${exclusionText}`,

        proverb: `You are an expert linguist specializing in proverbs. Generate unique English proverbs with their Turkish equivalents.
Focus on lesser-known but useful proverbs. Generate diverse proverbs.${exclusionText}`,

        phrasal_verb: `You are an expert English teacher. Generate unique English phrasal verbs with Turkish translations.
Focus on commonly used phrasal verbs in everyday English. Generate diverse phrasal verbs.${exclusionText}`,

        pattern: `You are an expert English grammar teacher. Generate unique English sentence patterns with Turkish equivalents.
Focus on practical patterns for conversation and writing. Generate diverse patterns.${exclusionText}`
    };

    const userPrompts = {
        idiom: `Generate exactly ${batchCount} unique English idioms (batch ${batchNumber}). For each idiom, provide:
- text: The English idiom
- translation: Turkish equivalent or translation
- explanation: Brief explanation in English
- level: CEFR level (A2, B1, B2, C1, or C2)
- example_text: An example sentence using the idiom
- example_translation: Turkish translation of the example

Return as a JSON object with "items" array containing ${batchCount} idioms.`,

        proverb: `Generate exactly ${batchCount} unique English proverbs (batch ${batchNumber}). For each proverb, provide:
- text: The English proverb
- translation: Turkish equivalent proverb (cultural equivalent if exists, not literal)
- explanation: Brief explanation of the meaning
- level: CEFR level (A2, B1, B2, C1, or C2)

Return as a JSON object with "items" array containing ${batchCount} proverbs.`,

        phrasal_verb: `Generate exactly ${batchCount} unique English phrasal verbs (batch ${batchNumber}). For each, provide:
- text: The phrasal verb (e.g., "look up", "break down")
- translation: Turkish meaning
- explanation: Brief explanation of usage
- level: CEFR level (A2, B1, B2, C1, or C2)
- example_text: An example sentence
- example_translation: Turkish translation of the example

Return as a JSON object with "items" array containing ${batchCount} phrasal verbs.`,

        pattern: `Generate exactly ${batchCount} unique English sentence patterns (batch ${batchNumber}). For each, provide:
- text: The pattern structure (e.g., "I would rather [verb] than [verb]")
- translation: Turkish equivalent pattern
- explanation: When and how to use this pattern
- level: CEFR level (A2, B1, B2, C1, or C2)
- example_text: An example sentence using the pattern
- example_translation: Turkish translation

Return as a JSON object with "items" array containing ${batchCount} patterns.`
    };

    const completion = await openai.chat.completions.create({
        model: MODEL_ID,
        messages: [
            { role: 'system', content: systemPrompts[type] },
            { role: 'user', content: userPrompts[type] }
        ],
        temperature: 0.9,
        max_tokens: 8192,
        response_format: { type: 'json_object' }
    });

    const usage = completion.usage || {};
    const responseText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.patterns || parsed.idioms || parsed.proverbs || parsed.phrasal_verbs || []);

    return {
        patterns: items,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0
    };
}

/**
 * Generate patterns using OpenAI GPT-4o-mini with batch processing
 */
exports.generatePatterns = async (req, res) => {
    try {
        const { type, count, language = 'en' } = req.body;

        // Validate inputs
        if (!type || !count) {
            return res.status(400).json({
                success: false,
                message: 'type and count are required'
            });
        }

        if (!PATTERN_TYPES.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid type. Must be one of: ${PATTERN_TYPES.join(', ')}`
            });
        }

        const numCount = parseInt(count);
        if (isNaN(numCount) || numCount < 1) {
            return res.status(400).json({
                success: false,
                message: 'count must be at least 1'
            });
        }

        // Get OpenAI API key from environment
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: 'OPENAI_API_KEY not configured'
            });
        }

        // Fetch existing patterns to use as exclusion list
        // Fetching up to 10000 items to prevent duplicates even in large databases
        let existingPatterns = [];
        try {
            // Using a simple query. Getting 'text' only
            const { data, error } = await supabase
                .from('pattern_library')
                .select('text')
                .eq('type', type)
                .limit(10000);

            if (!error && data) {
                existingPatterns = data.map(i => i.text);
                logger.info(`[LLM Pattern] Fetched ${existingPatterns.length} existing ${type}s for exclusion.`);
            }
        } catch (fetchError) {
            logger.warn('Failed to fetch existing patterns for exclusion:', fetchError);
        }

        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey });

        const startTime = Date.now();

        // Calculate number of batches needed
        const numBatches = Math.ceil(numCount / BATCH_SIZE);
        logger.info(`[LLM Pattern] Starting generation: ${numCount} ${type}s in ${numBatches} batches`);

        let allPatterns = [];
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let batchErrors = 0;
        let insertedCount = 0;
        let duplicateCount = 0;

        // Process batches sequentially and INSERT IMMEDIATELY after each batch
        for (let i = 0; i < numBatches; i++) {
            const batchStart = i * BATCH_SIZE;
            const batchCount = Math.min(BATCH_SIZE, numCount - batchStart);

            logger.info(`[LLM Pattern] Processing batch ${i + 1}/${numBatches} (${batchCount} items)...`);

            try {
                // Pass the updated exclusion list (including newly generated ones if needed, but here we use initial DB state)
                // To be even safer, we could add 'allPatterns' (newly generated) to exclusion list for subsequent batches
                // Let's combine existing DB + newly generated in this session
                const currentExclusionList = [...existingPatterns, ...allPatterns.map(p => p.text)];

                const result = await generateBatch(openai, type, batchCount, i + 1, currentExclusionList);
                totalInputTokens += result.inputTokens;
                totalOutputTokens += result.outputTokens;

                logger.info(`[LLM Pattern] Batch ${i + 1} complete: ${result.patterns.length} patterns generated, inserting to DB...`);

                // INSERT IMMEDIATELY after each batch
                for (const p of result.patterns) {
                    const insertItem = {
                        lang: language,
                        type: type,
                        text: p.text,
                        translation: p.translation || null,
                        explanation: p.explanation || null,
                        level: p.level || null,
                        example_text: p.example_text || null,
                        example_translation: p.example_translation || null,
                        source: 'llm_generated'
                    };

                    const { error } = await supabase.from('pattern_library').insert(insertItem);
                    if (error) {
                        if (error.message.includes('duplicate')) {
                            duplicateCount++;
                        } else {
                            logger.error('Insert error:', error.message);
                        }
                    } else {
                        insertedCount++;
                        // Add to our local list for response and exclusion in next batches
                        allPatterns.push(p);
                    }
                }

                // Note: We are pushing to allPatterns inside the loop above only if inserted success? 
                // Actually result.patterns contains all generated. 
                // Let's refine: allPatterns should contain successful ones OR all generated ones to exclude from *next* batch?
                // Probably all generated ones to avoid generating same thing in batch 2 that we did in batch 1 (even if insert failed)
                // But simplified: generateBatch returns all generated.

                // Memory Optimization: If allPatterns gets too big, we only keep recent ones or sample.
                // But for response we need to show some. Let's just keep first 100 for response.
                // Re-sync allPatterns to be just for response or just for exclusion?
                // The logical flow: 
                // 1. generateBatch returns patterns
                // 2. We try to insert them.
                // 3. We assume they are now "known". 

                logger.info(`[LLM Pattern] Batch ${i + 1} DB insert done. Total inserted: ${insertedCount}, duplicates: ${duplicateCount}`);

            } catch (batchError) {
                logger.error(`[LLM Pattern] Batch ${i + 1} failed:`, batchError.message);
                batchErrors++;
                // Continue with remaining batches
            }

            // Small delay between batches to avoid rate limiting
            if (i < numBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const endTime = Date.now();

        // Calculate total cost
        const totalTokens = totalInputTokens + totalOutputTokens;
        const inputCost = (totalInputTokens / 1000000) * INPUT_COST_PER_M;
        const outputCost = (totalOutputTokens / 1000000) * OUTPUT_COST_PER_M;
        const estimatedCost = inputCost + outputCost;

        logger.info(`[LLM Pattern] COMPLETE: ${insertedCount} inserted, ${duplicateCount} duplicates, ${totalTokens} tokens, $${estimatedCost.toFixed(4)}, ${((endTime - startTime) / 1000).toFixed(1)}s`);

        res.json({
            success: true,
            requested: numCount,
            generated: allPatterns.length, // total processed
            inserted: insertedCount,
            duplicates: duplicateCount,
            batchErrors: batchErrors,
            patterns: allPatterns.slice(0, 100), // Only return first 100 for display
            usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                totalTokens,
                estimatedCost: estimatedCost.toFixed(6),
                processingTimeMs: endTime - startTime,
                model: MODEL_NAME,
                batches: numBatches
            }
        });

    } catch (error) {
        logger.error('Error generating patterns:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
