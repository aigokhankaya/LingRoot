const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const pdfParse = require("pdf-parse");
const bookTextExtractor = require('../utils/content/bookTextExtractor.js');
const directorAgentService = require("../services/directorAgentService"); // Ensure this path is correct
const { v4: uuidv4 } = require("uuid");
const mammoth = require("mammoth");

/**
 * Cleans PDF text by removing common header/footer artifacts.
 * Refactored from documentController.js for reuse.
 * @param {string} rawText - Raw text extracted from PDF
 * @returns {string} Cleaned text
 */
/**
 * Checks if the extracted text looks like a scanned document (low character count relative to page count)
 * @param {string} text - Extracted text
 * @param {number} pageCount - Number of pages in PDF
 * @returns {boolean} True if scanned/image-heavy
 */
function isScannedPdf(text, pageCount) {
    if (!text || pageCount === 0) return false;
    // Average English page has ~2000-3000 chars. 
    // If a page averages < 100 characters, it's likely scanned or mostly images.
    const charPerPage = text.length / pageCount;
    return charPerPage < 50;
}

/**
 * Advanced PDF Text Cleaner
 * Handles:
 * - Ligatures (fi, fl, etc.)
 * - Hyphenation at line breaks (word-\nbreak -> wordbreak)
 * - Header/Footer artifacts (Page numbers, Copyrights)
 * - Excessive whitespace
 * - Garbage characters
 * @param {string} rawText - Raw text extracted from PDF
 * @returns {string} Cleaned text
 */
function cleanPdfHeaderFooter(rawText) {
    if (!rawText) return rawText;

    let cleaned = rawText;

    // 1. Normalize Ligatures and specialized characters often found in PDFs
    cleaned = cleaned
        .replace(/\uFB01/g, 'fi')
        .replace(/\uFB02/g, 'fl')
        .replace(/\uFB00/g, 'ff')
        .replace(/\uFB03/g, 'ffi')
        .replace(/\uFB04/g, 'ffl')
        .replace(/â€™/g, "'") // Common encoding error for apostrophe
        .replace(/â€œ/g, '"') // Left quote
        .replace(/â€/g, '"'); // Right quote

    // 2. Fix Hyphenation at line breaks (e.g. "contin-\nued" -> "continued")
    // Caution: We must ensuring we don't merge "Self-\nEsteem" to "SelfEsteem".
    // Strategy: If word ends with -, followed by newline, and next line starts with lowercase, likely a split word.
    // However, English is complex. Safest simple heuristic: word- \n word -> word word (if space), word-\nword -> wordword.
    // pdf-parse often outputs "word- \n partial".
    cleaned = cleaned.replace(/(\w+)-\s*\n\s*(\w+)/g, (match, p1, p2) => {
        // If p2 starts with lowercase, assume it's part of the same word
        if (/^[a-z]/.test(p2)) {
            return p1 + p2;
        }
        // If p2 is uppercase, keep the hyphen (e.g. "Pre-\nWar")
        return p1 + '-' + p2;
    });

    // 3. Remove Header/Footer Candidates
    // Page numbers: "Page 12", "12", "- 12 -", "[ 12 ]", "p. 12" on their own lines
    const pageNumberPatterns = [
        /^[\s]*[-|·]?\s*\d{1,4}\s*[-|·]?[\s]*$/gm,
        /^[\s]*Page\s+\d{1,4}[\s]*$/gim,
        /^[\s]*p\.\s*\d{1,4}[\s]*$/gim,
        /^[\s]*\[\s*\d{1,4}\s*\][\s]*$/gm,
        // Roman numerals often used in intros (lower or upper) - strict format to avoid killing text
        /^[\s]*[-]?\s*[ivxlcmIVXLCM]+\s*[-]?[\s]*$/gm
    ];

    pageNumberPatterns.forEach(p => cleaned = cleaned.replace(p, ''));

    // Common headers/footers
    const headerFooterPatterns = [
        /^[\s]*©.*$/gm,
        /^[\s]*Copyright.*$/gim,
        /^[\s]*All rights reserved.*$/gim,
        /^[\s]*ISBN[\s:-]*[\d-X]+[\s]*$/gim,
        /^[\s]*(Published|Printed|Distributed) by.*$/gim,
        /^[\s]*www\..+\.com.*$/gim,
        /^[\s]*http[s]?:\/\/.*$/gim
    ];
    headerFooterPatterns.forEach(p => cleaned = cleaned.replace(p, ''));

    // 4. Remove Navigation/Structure noise
    cleaned = cleaned.replace(/^[\s]*Table of Contents[\s]*$/gim, '');
    cleaned = cleaned.replace(/^[\s]*Contents[\s]*$/gim, '');
    // Dotted lines used in ToC: "Chapter 1 ................ 5"
    cleaned = cleaned.replace(/\.{5,}\s*\d*/g, '');
    cleaned = cleaned.replace(/-{5,}\s*\d*/g, '');
    cleaned = cleaned.replace(/_{5,}/g, '');

    // 5. Cleanup Whitespace
    // Replace multiple newlines with exactly two (paragraph break)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // Replace multiple spaces/tabs with single space
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
    // Remove whitespace at start/end of lines
    cleaned = cleaned.replace(/^ +| +$/gm, '');

    return cleaned.trim();
}

/**
 * Clean Book Title
 * Removes file extensions, URLs, and common 'spam' patterns like 'pdfstok.com'
 * @param {string} title 
 */
function cleanTitle(title) {
    if (!title) return "Untitled";

    let cleaned = title;

    // Remove common file extensions
    cleaned = cleaned.replace(/\.pdf$/i, '');
    cleaned = cleaned.replace(/\.docx?$/i, '');
    cleaned = cleaned.replace(/\.txt$/i, '');
    cleaned = cleaned.replace(/\.epub$/i, '');

    // Remove domains / URLs
    cleaned = cleaned.replace(/pdfstok\.com/gi, '');
    cleaned = cleaned.replace(/www\.[a-z0-9-]+\.[a-z]+/gi, '');
    cleaned = cleaned.replace(/\.com$/gi, '');

    // Remove common separator noise often found in filenames like "Book - Author"
    // Ideally we keep the title part. If the user provided separate Author field, we might just want to keep the first part.
    // For now, let's just clean the obvious junk.

    // Remove trailing/leading hyphens or spaces
    cleaned = cleaned.replace(/^[\s-]+|[\s-]+$/g, '');

    return cleaned.trim();
}

/**
 * Admin: Upload a PDF Book
 * 1. Extract text
 * 2. Split into chapters
 * 3. Analyze each chapter with Director Agent
 * 4. Save to 'books' and 'book_chapters' tables
 */
exports.uploadBook = async (req, res) => {
    const requestId = uuidv4();

    try {
        if (!supabase) {
            return res.status(500).json({ success: false, message: "Veritabanı yapılandırması eksik." });
        }

        const file = req.file;
        let { title, author, coverUrl, language = 'en' } = req.body;

        // Clean the title immediately
        if (title) {
            title = cleanTitle(title);
        }

        logger.info("[AdminBookUpload] Request received", { requestId, title, hasFile: !!file });

        if ((!file && !req.body.textContent) || (file && !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(file.mimetype))) {
            return res.status(400).json({ success: false, message: "Geçerli bir dosya (PDF, DOCX, TXT) yükleyin veya metin girin." });
        }

        if (!title) {
            return res.status(400).json({ success: false, message: "Kitap başlığı zorunludur." });
        }

        let rawText = "";

        if (file) {
            // File Upload Handling
            logger.info("[AdminBookUpload] Processing file upload...", { requestId, mimeType: file.mimetype });

            if (file.mimetype === 'application/pdf') {
                const pdfData = await pdfParse(file.buffer);
                rawText = (pdfData.text || "").trim();

                // Check for scanned PDF
                if (isScannedPdf(rawText, pdfData.numpages)) {
                    logger.warn("[AdminBookUpload] Scanned PDF detected", { requestId, length: rawText.length, pages: pdfData.numpages });
                    return res.status(400).json({
                        success: false,
                        message: "Bu PDF taranmış görsellerden oluşuyor (metin/sayfa oranı çok düşük). Lütfen metin içeren bir PDF yükleyin veya önce OCR işlemi uygulayın."
                    });
                }
            } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                // DOCX Handling
                const result = await mammoth.extractRawText({ buffer: file.buffer });
                rawText = result.value.trim();
                if (result.messages && result.messages.length > 0) {
                    logger.warn("[AdminBookUpload] Mammoth messages", { messages: result.messages });
                }
            } else if (file.mimetype === 'text/plain') {
                // TXT Handling
                rawText = file.buffer.toString('utf-8').trim();
            } else {
                return res.status(400).json({ success: false, message: "Desteklenmeyen dosya formatı. Lütfen PDF, DOCX veya TXT dosyası yükleyin." });
            }

        } else if (req.body.textContent) {
            // Direct Text Input Handling
            logger.info("[AdminBookUpload] Processing direct text input...", { requestId });
            rawText = req.body.textContent.trim();
        } else {
            return res.status(400).json({ success: false, message: "Dosya yükleyin veya metin içeriği girin." });
        }

        if (!rawText) {
            return res.status(400).json({ success: false, message: "İçerik okunamadı veya boş." });
        }

        const cleanedText = cleanPdfHeaderFooter(rawText);
        logger.info("[AdminBookUpload] Text cleaned", { requestId, length: cleanedText.length });

        // 2. Split into Chapters
        let chapters = [];
        try {
            chapters = bookTextExtractor.splitIntoChapters(cleanedText, title);
        } catch (e) {
            logger.warn("[AdminBookUpload] Split failed, fallback to single chapter", { error: e.message });
        }

        if (!chapters || chapters.length === 0) {
            chapters = [{
                chapter_number: 1,
                title: "Chapter 1",
                content: cleanedText,
                word_count: cleanedText.split(/\s+/).length
            }];
        }

        logger.info(`[AdminBookUpload] Prepared ${chapters.length} chapters`, { requestId });

        // 3. Create Book Record
        // Generate a pseudo distinct ID for gutendex_id to avoid collision
        // Note: Gutenberg IDs are positive integers.
        // Try using a large random positive integer to avoid potential constraints on negative numbers
        const fakeGutendexId = Math.floor(Math.random() * 1000000) + 10000000;

        // Explicitly generate ID to bypass 'null value in id' error if sequence is missing
        const bookId = Math.floor(Math.random() * 1000000) + 100000;

        const { data: book, error: bookError } = await supabase
            .from('books')
            .insert({
                id: bookId, // Explicit ID
                title,
                authors: JSON.stringify([author || 'Unknown']), // Schema expects JSON array as string
                cover_url: coverUrl || null,
                language,
                subjects: '["Uploaded PDF"]',
                copyright: false,
                text_url: null, // No external text URL
                gutendex_id: fakeGutendexId
            })
            .select()
            .single();

        if (bookError || !book) {
            logger.error("[AdminBookUpload] Failed to create book", { error: bookError, pgError: bookError?.message, details: bookError?.details });
            return res.status(500).json({ success: false, message: "Kitap kaydı oluşturulamadı: " + (bookError?.message || "Bilinmeyen hata"), error: bookError });
        }

        logger.info(`[AdminBookUpload] Book created with ID: ${book.id}`, { requestId });

        // 4. Analyze & Insert Chapters
        // We'll process chapters in parallel chunks to speed up but not overwhelm API
        const chaptersToInsert = [];
        const CHUNK_SIZE = 3;

        for (let i = 0; i < chapters.length; i += CHUNK_SIZE) {
            const chunk = chapters.slice(i, i + CHUNK_SIZE);

            const processedChunk = await Promise.all(chunk.map(async (ch, idx) => {
                // Run Director Agent Analysis
                const analysis = await directorAgentService.analyzeChapter(ch.content);

                // Generate unique ID for this chapter
                const chapterId = Math.floor(Math.random() * 1000000) + (i + idx) * 10000 + 1000000;

                return {
                    id: chapterId, // Explicit ID to avoid primary key conflicts
                    book_id: book.id,
                    chapter_index: ch.chapter_number,
                    chapter_title: (ch.title || 'Untitled').substring(0, 250), // Truncate to avoid VARCHAR overflow
                    chapter_text: ch.content,
                    director_analysis: analysis // JSONB column
                };
            }));

            chaptersToInsert.push(...processedChunk);
        }

        const { error: chapterError } = await supabase
            .from('book_chapters')
            .insert(chaptersToInsert);

        if (chapterError) {
            logger.error("[AdminBookUpload] Failed to save chapters", {
                error: chapterError,
                message: chapterError.message,
                details: chapterError.details,
                hint: chapterError.hint,
                code: chapterError.code,
                sampleChapter: chaptersToInsert[0] ? {
                    book_id: chaptersToInsert[0].book_id,
                    chapter_index: chaptersToInsert[0].chapter_index,
                    chapter_title: chaptersToInsert[0].chapter_title?.substring(0, 50),
                    hasText: !!chaptersToInsert[0].chapter_text,
                    textLength: chaptersToInsert[0].chapter_text?.length,
                    hasAnalysis: !!chaptersToInsert[0].director_analysis,
                    analysisType: typeof chaptersToInsert[0].director_analysis
                } : null
            });
            // Cleanup book? Ideally yes, but for now we report error
            return res.status(500).json({
                success: false,
                message: "Bölümler kaydedilirken hata oluştu: " + (chapterError.message || chapterError.code || "Bilinmeyen hata"),
                error: chapterError.message,
                details: chapterError.details
            });
        }

        logger.info("[AdminBookUpload] Success", { requestId, bookId: book.id, chapters: chaptersToInsert.length });

        return res.status(201).json({
            success: true,
            message: "Kitap başarıyla yüklendi ve analiz edildi.",
            book,
            chapterCount: chaptersToInsert.length
        });

    } catch (error) {
        logger.error("[AdminBookUpload] Unexpected error", { requestId, error: error.message });
        return res.status(500).json({ success: false, message: "Beklenmeyen sunucu hatası.", error: error.message });
    }
};
