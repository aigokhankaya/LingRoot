const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Get unified library (Public Books + User Documents) with progress
 */
exports.getLibrary = async (req, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        // Fetch documents and book progress in parallel (independent queries)
        const [documentsResult, booksResult] = await Promise.all([
            // 1. Fetch User Documents
            supabase
                .from('documents')
                .select(`
                    id, title, author, cover_image_url, created_at, page_count,
                    user_book_progress!document_id (
                        current_chapter_index,
                        progress_percentage,
                        is_finished,
                        last_accessed_at
                    )
                `)
                .eq('user_id', userId)
                .eq('user_book_progress.user_id', userId),
            // 2. Fetch Public Books (that user has interacted with OR favorites)
            supabase
                .from('user_book_progress')
                .select(`
                    current_chapter_index,
                    progress_percentage,
                    is_finished,
                    last_accessed_at,
                    books!book_id (
                        id, title, authors, cover_url, language
                    )
                `)
                .eq('user_id', userId)
                .eq('content_type', 'book'),
        ]);

        const { data: documents, error: docError } = documentsResult;
        if (docError) throw docError;

        const { data: books, error: bookError } = booksResult;
        if (bookError) throw bookError;

        // 3. Normalize and Merge Data
        const normalizedDocs = documents.map(doc => ({
            id: `doc_${doc.id}`,
            real_id: doc.id,
            type: 'document',
            title: doc.title,
            author: doc.author || 'Me',
            cover_url: doc.cover_image_url,
            progress: doc.user_book_progress?.[0]?.progress_percentage || 0,
            current_chapter: doc.user_book_progress?.[0]?.current_chapter_index || 1,
            last_accessed: doc.user_book_progress?.[0]?.last_accessed_at || doc.created_at,
            is_finished: doc.user_book_progress?.[0]?.is_finished || false
        }));

        const normalizedBooks = books.map(item => ({
            id: `book_${item.books.id}`,
            real_id: item.books.id,
            type: 'book',
            title: item.books.title,
            author: parseAuthors(item.books.authors),
            cover_url: item.books.cover_url,
            progress: item.progress_percentage || 0,
            current_chapter: item.current_chapter_index || 1,
            last_accessed: item.last_accessed_at,
            is_finished: item.is_finished || false
        }));

        const library = [...normalizedDocs, ...normalizedBooks].sort((a, b) => 
            new Date(b.last_accessed) - new Date(a.last_accessed)
        );

        res.json({ success: true, data: library });

    } catch (error) {
        logger.error(`[Library] Error fetching library: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get details for a specific library item (book or document)
 */
exports.getItemDetails = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { type } = req.query; // 'book' or 'document'

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!id || !type) return res.status(400).json({ success: false, message: 'Missing id or type' });

    try {
        let itemData = null;
        let chapters = [];

        if (type === 'book') {
            // Fetch Book Details
            const { data: book, error: bookError } = await supabase
                .from('books')
                .select('id, title, authors, cover_url, language, created_at, updated_at')
                .eq('id', id)
                .single();
            
            if (bookError) throw bookError;
            
            // Fetch Book Chapters
            const { data: bookChapters, error: chapError } = await supabase
                .from('book_chapters')
                .select('id, book_id, chapter_index, chapter_title, chapter_text, created_at')
                .eq('book_id', id)
                .order('chapter_index', { ascending: true });

            if (chapError) throw chapError;

            itemData = {
                id: book.id,
                title: book.title,
                author: parseAuthors(book.authors),
                cover_url: book.cover_url,
                type: 'book'
            };
            chapters = bookChapters.map(ch => ({
                id: ch.id,
                index: ch.chapter_index,
                title: ch.chapter_title || `Chapter ${ch.chapter_index}`,
                content: ch.chapter_text
            }));

        } else if (type === 'document') {
            // Fetch Document Details
            const { data: doc, error: docError } = await supabase
                .from('documents')
                .select('id, user_id, title, author, cover_image_url, page_count, created_at, updated_at')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (docError) throw docError;

            // Fetch Document Sections
            const { data: docSections, error: secError } = await supabase
                .from('document_sections')
                .select('id, document_id, section_index, section_title, section_text, created_at')
                .eq('document_id', id)
                .order('section_index', { ascending: true });

            if (secError) throw secError;

            itemData = {
                id: doc.id,
                title: doc.title,
                author: doc.author || 'User Document',
                cover_url: doc.cover_image_url,
                type: 'document'
            };
            chapters = docSections.map(sec => ({
                id: sec.id,
                index: sec.section_index,
                title: sec.section_title || `Section ${sec.section_index}`,
                content: sec.section_text
            }));
        } else {
            return res.status(400).json({ success: false, message: 'Invalid type' });
        }

        // Fetch user progress
        const { data: progress, error: progError } = await supabase
            .from('user_book_progress')
            .select('id, user_id, book_id, document_id, content_type, current_chapter_index, current_position_seconds, progress_percentage, is_finished, last_accessed_at, created_at, updated_at')
            .eq('user_id', userId)
            .eq('content_type', type)
            .eq(type === 'book' ? 'book_id' : 'document_id', id)
            .single();

        // If no progress found, default to start
        const userProgress = progress || {
            current_chapter_index: 1,
            current_position_seconds: 0,
            progress_percentage: 0,
            is_finished: false
        };

        res.json({
            success: true,
            data: {
                item: itemData,
                chapters,
                progress: userProgress
            }
        });

    } catch (error) {
        logger.error(`[Library] Error fetching item details: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update progress for a specific item
 */
exports.updateProgress = async (req, res) => {
    const userId = req.user?.id;
    const { type, id, chapterIndex, positionSeconds, progressPercentage, isFinished } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
        const updateData = {
            user_id: userId,
            content_type: type, // 'book' or 'document'
            last_accessed_at: new Date().toISOString()
        };

        if (type === 'book') updateData.book_id = id;
        else if (type === 'document') updateData.document_id = id;
        else return res.status(400).json({ success: false, message: 'Invalid type' });

        if (chapterIndex !== undefined) updateData.current_chapter_index = chapterIndex;
        if (positionSeconds !== undefined) updateData.current_position_seconds = positionSeconds;
        if (progressPercentage !== undefined) updateData.progress_percentage = progressPercentage;
        if (isFinished !== undefined) updateData.is_finished = isFinished;

        // Upsert progress
        const { data, error } = await supabase
            .from('user_book_progress')
            .upsert(updateData, { 
                onConflict: type === 'book' ? 'user_id, content_type, book_id' : 'user_id, content_type, document_id' 
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });

    } catch (error) {
        logger.error(`[Library] Error updating progress: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Parse authors JSON string from books table
function parseAuthors(authorsStr) {
    if (!authorsStr) return 'Unknown Author';
    try {
        const authors = JSON.parse(authorsStr);
        if (Array.isArray(authors)) {
            return authors.map(a => a.name).join(', ');
        }
        return authorsStr;
    } catch (e) {
        return authorsStr;
    }
}
