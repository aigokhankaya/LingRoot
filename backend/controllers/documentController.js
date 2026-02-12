const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const { v4: uuidv4 } = require("uuid");
const pdfParse = require("pdf-parse");
const bookTextExtractor = require('../utils/content/bookTextExtractor.js');
const openaiClient = require('../utils/ai/openaiClient.js');
const { storeTopic } = require("../lib/rag");

/**
 * Cleans PDF text by removing common header/footer artifacts.
 * These artifacts interrupt TTS flow when read aloud.
 * @param {string} rawText - Raw text extracted from PDF
 * @returns {string} Cleaned text
 */
function cleanPdfHeaderFooter(rawText) {
    if (!rawText) return rawText;
    
    let cleaned = rawText;
    
    // Remove standalone page numbers (e.g., "45", "Page 45", "- 45 -", "| 45 |")
    cleaned = cleaned.replace(/^[\s]*[-|]?\s*\d{1,4}\s*[-|]?[\s]*$/gm, '');
    cleaned = cleaned.replace(/^[\s]*Page\s+\d{1,4}[\s]*$/gim, '');
    cleaned = cleaned.replace(/^[\s]*p\.\s*\d{1,4}[\s]*$/gim, '');
    cleaned = cleaned.replace(/^[\s]*\[\s*\d{1,4}\s*\][\s]*$/gm, '');
    
    // Remove inline page markers that interrupt sentences
    cleaned = cleaned.replace(/\s+Page\s+\d{1,4}\s+/gi, ' ');
    cleaned = cleaned.replace(/\s+p\.\s*\d{1,4}\s+/gi, ' ');
    
    // Remove common header patterns (typically repeated on every page)
    // Copyright lines
    cleaned = cleaned.replace(/^[\s]*©.*$/gm, '');
    cleaned = cleaned.replace(/^[\s]*Copyright.*$/gim, '');
    
    // "All rights reserved" lines
    cleaned = cleaned.replace(/^[\s]*All rights reserved.*$/gim, '');
    
    // ISBN lines
    cleaned = cleaned.replace(/^[\s]*ISBN[\s:-]*[\d-X]+[\s]*$/gim, '');
    
    // Publisher info patterns (usually short repeated lines)
    cleaned = cleaned.replace(/^[\s]*Published by.*$/gim, '');
    cleaned = cleaned.replace(/^[\s]*Printed in.*$/gim, '');
    
    // Remove Table of Contents markers that might slip through
    cleaned = cleaned.replace(/^[\s]*Table of Contents[\s]*$/gim, '');
    cleaned = cleaned.replace(/^[\s]*Contents[\s]*$/gim, '');
    
    // Remove dotted/dashed leader lines (from TOC: "Chapter 1 .......... 45")
    cleaned = cleaned.replace(/\.{5,}\s*\d+/g, '');
    cleaned = cleaned.replace(/-{5,}\s*\d+/g, '');
    
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' '); // Multiple spaces to single
    
    return cleaned.trim();
}

/**
 * Uploads a PDF document, extracts text, splits it into sections and
 * saves both the document and its sections into Supabase.
 */
exports.uploadDocument = async (req, res) => {
  const requestId = uuidv4();

  try {
    if (!supabase) {
      logger.error("[uploadDocument] Supabase client not configured");
      return res.status(500).json({
        success: false,
        message: "Veritabanı yapılandırması yapılmamış. Lütfen yöneticinizle iletişime geçin.",
      });
    }

    const userId = req.user?.id || null;
    const file = req.file;
    const rawTitle = req.body?.title || req.body?.name || "";
    const title = String(rawTitle).trim();

    logger.info("[uploadDocument] Request received", {
      requestId,
      userId,
      hasFile: !!file,
      title,
    });

    if (!file) {
      return res.status(400).json({ success: false, message: "PDF dosyası zorunludur." });
    }

    if (file.mimetype !== "application/pdf") {
      logger.warn("[uploadDocument] Unsupported mimetype", { mimetype: file.mimetype });
      return res.status(400).json({
        success: false,
        message: "Sadece PDF dosyaları destekleniyor.",
      });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: "Doküman için bir isim (title) zorunludur." });
    }

    logger.info("[uploadDocument] Parsing PDF...", {
      requestId,
      originalname: file.originalname,
      size: file.size,
    });

    const pdfData = await pdfParse(file.buffer);
    const rawTextDirty = (pdfData.text || "").trim();
    
    // Clean header/footer artifacts that interrupt TTS reading
    const rawText = cleanPdfHeaderFooter(rawTextDirty);
    
    logger.info("[uploadDocument] PDF text cleaned", {
      requestId,
      originalLength: rawTextDirty.length,
      cleanedLength: rawText.length,
      removedChars: rawTextDirty.length - rawText.length,
    });

    if (!rawText) {
      logger.warn("[uploadDocument] Extracted text is empty", { requestId });
      return res.status(400).json({
        success: false,
        message: "PDF içeriğinden metin çıkarılamadı veya belge boş görünüyor.",
      });
    }

    logger.info("[uploadDocument] PDF text extracted", {
      requestId,
      textLength: rawText.length,
      numPages: pdfData.numpages || null,
    });

    // Reuse existing chapter splitter: fallback mode will split by word count if no chapter patterns
    let sections = [];
    try {
      const chapters = bookTextExtractor.splitIntoChapters(rawText, title);
      if (Array.isArray(chapters) && chapters.length > 0) {
        sections = chapters.map((ch, idx) => ({
          section_index: ch.chapter_number || idx + 1,
          section_title: ch.title || `Section ${idx + 1}`,
          section_text: ch.content,
          word_count: ch.word_count || (ch.content ? ch.content.split(/\s+/).length : 0),
        }));
      }
    } catch (splitErr) {
      logger.error("[uploadDocument] Error while splitting text into sections", {
        requestId,
        error: splitErr.message,
      });
    }

    // Fallback: single section with whole text
    if (!sections || sections.length === 0) {
      logger.warn("[uploadDocument] No sections produced by splitter, using single-section fallback", {
        requestId,
      });
      sections = [
        {
          section_index: 1,
          section_title: title,
          section_text: rawText,
          word_count: rawText.split(/\s+/).length,
        },
      ];
    }

    // Normalize sections: trim text, ensure word_count, and enforce sequential section_index
    sections = (sections || [])
      .map((s) => {
        const text = (s.section_text || "").toString();
        const normalizedText = text.trim();
        const wordCount =
          typeof s.word_count === "number" && Number.isFinite(s.word_count)
            ? s.word_count
            : normalizedText
              ? normalizedText.split(/\s+/).length
              : 0;

        return {
          ...s,
          section_text: normalizedText,
          word_count: wordCount,
        };
      })
      // Drop completely empty sections to satisfy NOT NULL constraint
      .filter((s) => s.section_text && s.section_text.length > 0)
      // Re-index sequentially to avoid UNIQUE(document_id, section_index) conflicts
      .map((s, idx) => ({
        ...s,
        section_index: idx + 1,
      }));

    logger.info("[uploadDocument] Sections prepared", {
      requestId,
      sectionCount: sections.length,
    });

    // Insert document row
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        page_count: pdfData.numpages || null,
        language: null,
        original_text: rawText,
      })
      .select("*")
      .single();

    if (docError || !document) {
      logger.error("[uploadDocument] Failed to insert document", {
        requestId,
        error: docError?.message,
      });
      return res.status(500).json({
        success: false,
        message: "Doküman kaydedilirken hata oluştu.",
        error: docError?.message,
      });
    }

    const now = new Date().toISOString();
    const sectionsToInsert = sections.map((s) => ({
      document_id: document.id,
      section_index: s.section_index,
      section_title: s.section_title,
      section_text: s.section_text,
      word_count: s.word_count,
      created_at: now,
    }));

    const { data: insertedSections, error: sectionError } = await supabase
      .from("document_sections")
      .insert(sectionsToInsert)
      .select("*")
      .order("section_index", { ascending: true });

    if (sectionError) {
      logger.error("[uploadDocument] Failed to insert document sections", {
        requestId,
        error: sectionError.message,
      });
      return res.status(500).json({
        success: false,
        message: "Doküman bölümleri kaydedilirken hata oluştu.",
        error: sectionError.message,
      });
    }

    logger.info("[uploadDocument] Document and sections saved successfully", {
      requestId,
      documentId: document.id,
      sectionCount: insertedSections?.length || 0,
    });

    // Send response immediately
    const responseObj = res.status(201).json({
      success: true,
      document,
      sections: insertedSections || [],
    });

    // Background Task: Extract and store topic for RAG
    // We don't await this to keep response fast
    (async () => {
      try {
        logger.info("[uploadDocument] Starting background topic extraction...");
        const extracted = await openaiClient.extractTopicFromText(rawText);

        if (extracted && extracted.topic) {
          await storeTopic({
            title: extracted.topic,
            description: extracted.description || `Extracted from document: ${title}`,
            userId: userId,
            sourceType: 'pdf',
            sourceId: document.id
          });
          logger.info("[uploadDocument] Topic extracted and stored:", extracted.topic);
        }
      } catch (bgError) {
        logger.error("[uploadDocument] Background topic extraction failed:", bgError);
      }
    })();

    // Response already sent
  } catch (error) {
    logger.error("[uploadDocument] Unexpected error", { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      message: "Doküman işlenirken beklenmeyen bir hata oluştu.",
      error: error.message,
    });
  }
};

/**
 * Lists documents belonging to the authenticated user.
 */
exports.listDocuments = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Veritabanı yapılandırması yapılmamış." });
    }

    const userId = req.user?.id;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[listDocuments] Supabase error", { error: error.message });
      return res.status(500).json({ success: false, message: "Dokümanlar alınırken hata oluştu.", error: error.message });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    logger.error("[listDocuments] Unexpected error", { error: error.message });
    return res.status(500).json({ success: false, message: "İşlem sırasında beklenmeyen bir hata oluştu.", error: error.message });
  }
};

/**
 * Returns a single document (only if it belongs to the authenticated user).
 */
exports.getDocumentById = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Veritabanı yapılandırması yapılmamış." });
    }

    const userId = req.user?.id;
    const documentId = parseInt(req.params.documentId, 10);

    if (Number.isNaN(documentId)) {
      return res.status(400).json({ success: false, message: "Geçersiz doküman ID." });
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: "Doküman bulunamadı." });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("[getDocumentById] Unexpected error", { error: error.message });
    return res.status(500).json({ success: false, message: "İşlem sırasında beklenmeyen bir hata oluştu.", error: error.message });
  }
};

/**
 * Returns all sections for a given document, only if the document belongs to the user.
 */
exports.getDocumentSections = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Veritabanı yapılandırması yapılmamış." });
    }

    const userId = req.user?.id;
    const documentId = parseInt(req.params.documentId, 10);

    if (Number.isNaN(documentId)) {
      return res.status(400).json({ success: false, message: "Geçersiz doküman ID." });
    }

    // Ensure document belongs to user
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ success: false, message: "Doküman bulunamadı." });
    }

    if (document.user_id && document.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Bu dokümana erişim yetkiniz yok." });
    }

    const { data: sections, error: sectionError } = await supabase
      .from("document_sections")
      .select("*")
      .eq("document_id", documentId)
      .order("section_index", { ascending: true });

    if (sectionError) {
      logger.error("[getDocumentSections] Supabase error", { error: sectionError.message });
      return res.status(500).json({ success: false, message: "Bölümler alınırken hata oluştu.", error: sectionError.message });
    }

    return res.status(200).json({ success: true, data: sections || [] });
  } catch (error) {
    logger.error("[getDocumentSections] Unexpected error", { error: error.message });
    return res.status(500).json({ success: false, message: "İşlem sırasında beklenmeyen bir hata oluştu.", error: error.message });
  }
};

/**
 * Returns a single section by document + section id, ensuring ownership.
 */
exports.getDocumentSectionById = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Veritabanı yapılandırması yapılmamış." });
    }

    const userId = req.user?.id;
    const documentId = parseInt(req.params.documentId, 10);
    const sectionId = parseInt(req.params.sectionId, 10);

    if (Number.isNaN(documentId) || Number.isNaN(sectionId)) {
      return res.status(400).json({ success: false, message: "Geçersiz doküman veya bölüm ID." });
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ success: false, message: "Doküman bulunamadı." });
    }

    if (document.user_id && document.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Bu dokümana erişim yetkiniz yok." });
    }

    const { data: section, error: sectionError } = await supabase
      .from("document_sections")
      .select("*")
      .eq("id", sectionId)
      .eq("document_id", documentId)
      .single();

    if (sectionError || !section) {
      return res.status(404).json({ success: false, message: "Bölüm bulunamadı." });
    }

    return res.status(200).json({ success: true, data: section });
  } catch (error) {
    logger.error("[getDocumentSectionById] Unexpected error", { error: error.message });
    return res.status(500).json({ success: false, message: "İşlem sırasında beklenmeyen bir hata oluştu.", error: error.message });
  }
};

/**
 * Creates a document directly from raw text (no file upload).
 * This is used when the frontend has already extracted text from a PDF/DOCX
 * but wants to start the book-like document flow (split into sections + save).
 */
exports.createDocumentFromText = async (req, res) => {
  const requestId = uuidv4();

  try {
    if (!supabase) {
      logger.error("[createDocumentFromText] Supabase client not configured");
      return res.status(500).json({
        success: false,
        message: "Veritabanı yapılandırması yapılmamış. Lütfen yöneticinizle iletişime geçin.",
      });
    }

    const userId = req.user?.id || null;
    const rawTitle = req.body?.title || req.body?.name || "";
    const title = String(rawTitle).trim();
    const rawTextInput = req.body?.text || req.body?.content || "";
    const rawText = String(rawTextInput).trim();

    logger.info("[createDocumentFromText] Request received", {
      requestId,
      userId,
      title,
      textLength: rawText.length,
    });

    if (!title) {
      return res.status(400).json({ success: false, message: "Doküman için bir isim (title) zorunludur." });
    }

    if (!rawText) {
      return res.status(400).json({ success: false, message: "Metin bulunamadı. Lütfen geçerli bir içerik gönderin." });
    }

    // Reuse existing chapter splitter: fallback mode will split by word count if no chapter patterns
    let sections = [];
    try {
      const chapters = bookTextExtractor.splitIntoChapters(rawText, title);
      if (Array.isArray(chapters) && chapters.length > 0) {
        sections = chapters.map((ch, idx) => ({
          section_index: ch.chapter_number || idx + 1,
          section_title: ch.title || `Section ${idx + 1}`,
          section_text: ch.content,
          word_count: ch.word_count || (ch.content ? ch.content.split(/\s+/).length : 0),
        }));
      }
    } catch (splitErr) {
      logger.error("[createDocumentFromText] Error while splitting text into sections", {
        requestId,
        error: splitErr.message,
      });
    }

    // Fallback: single section with whole text
    if (!sections || sections.length === 0) {
      logger.warn("[createDocumentFromText] No sections produced by splitter, using single-section fallback", {
        requestId,
      });
      sections = [
        {
          section_index: 1,
          section_title: title,
          section_text: rawText,
          word_count: rawText.split(/\s+/).length,
        },
      ];
    }

    // Normalize sections: trim text, ensure word_count, and enforce sequential section_index
    sections = (sections || [])
      .map((s) => {
        const text = (s.section_text || "").toString();
        const normalizedText = text.trim();
        const wordCount =
          typeof s.word_count === "number" && Number.isFinite(s.word_count)
            ? s.word_count
            : normalizedText
              ? normalizedText.split(/\s+/).length
              : 0;

        return {
          ...s,
          section_text: normalizedText,
          word_count: wordCount,
        };
      })
      // Drop completely empty sections to satisfy NOT NULL constraint
      .filter((s) => s.section_text && s.section_text.length > 0)
      // Re-index sequentially to avoid UNIQUE(document_id, section_index) conflicts
      .map((s, idx) => ({
        ...s,
        section_index: idx + 1,
      }));

    logger.info("[createDocumentFromText] Sections prepared", {
      requestId,
      sectionCount: sections.length,
    });

    const now = new Date().toISOString();

    // Insert document row (no original file, text-based)
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title,
        original_filename: null,
        mime_type: "text/plain",
        page_count: null,
        language: null,
        original_text: rawText,
        created_at: now,
      })
      .select("*")
      .single();

    if (docError || !document) {
      logger.error("[createDocumentFromText] Failed to insert document", {
        requestId,
        error: docError?.message,
      });
      return res.status(500).json({
        success: false,
        message: "Doküman kaydedilirken hata oluştu.",
        error: docError?.message,
      });
    }

    const sectionsToInsert = sections.map((s) => ({
      document_id: document.id,
      section_index: s.section_index,
      section_title: s.section_title,
      section_text: s.section_text,
      word_count: s.word_count,
      created_at: now,
    }));

    const { data: insertedSections, error: sectionError } = await supabase
      .from("document_sections")
      .insert(sectionsToInsert)
      .select("*")
      .order("section_index", { ascending: true });

    if (sectionError) {
      logger.error("[createDocumentFromText] Failed to insert document sections", {
        requestId,
        error: sectionError.message,
      });
      return res.status(500).json({
        success: false,
        message: "Doküman bölümleri kaydedilirken hata oluştu.",
        error: sectionError.message,
      });
    }

    logger.info("[createDocumentFromText] Document and sections saved successfully", {
      requestId,
      documentId: document.id,
      sectionCount: insertedSections?.length || 0,
    });

    return res.status(201).json({
      success: true,
      document,
      sections: insertedSections || [],
    });
  } catch (error) {
    logger.error("[createDocumentFromText] Unexpected error", { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      message: "Doküman oluşturulurken beklenmeyen bir hata oluştu.",
      error: error.message,
    });
  }
};
