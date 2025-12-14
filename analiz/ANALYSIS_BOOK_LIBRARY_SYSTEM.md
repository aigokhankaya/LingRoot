# Deep Dive Analysis: Book & Audio Library System

## 1. Executive Summary

This document outlines the technical and user experience architecture for transforming LingRoot's document handling into a **Premium Audio Library Experience** (similar to Audible, Storytel, or Kindle).

**Goal:** Create a unified "My Library" dashboard where users can manage, listen to, and track progress on both Public Books (Gutenberg) and Personal Documents (PDFs).

**Current State:**
- Basic file upload exists.
- "Book Mode" TTS pipeline is fixed (backend).
- Frontend is fragmented (documents list vs. public books list).
- No progress tracking (user loses place).
- No unified "Player" experience.

**Target State:**
- **Unified Library:** All content in one grid.
- **Smart Player:** Persistent audio player with chapter navigation.
- **Progress Tracking:** "Continue where you left off."
- **Karaoke Mode:** Highlight text while listening.

---

## 2. User Experience (UX) Architecture

### A. The "My Library" Dashboard
A new top-level section in the Dashboard (`/dashboard/library`).

**Visual Layout:**
- **Hero Section:** "Continue Listening" (Last accessed book with progress bar).
- **Tabs/Filters:**
  - All Items
  - Started (In Progress)
  - Not Started
  - Finished
  - Favorites
- **Grid View:** Book Cards displaying:
  - Cover Art (Generated for PDFs, Fetched for Books)
  - Title & Author
  - Progress Bar (visual %)
  - "Audio Ready" badge (if TTS generated)
  - Action Menu: Play, Remove, Mark Finished

### B. The "Immersive Player" View
When a user clicks a book, they enter the Player View (`/dashboard/library/player/[id]`).

**Layout:**
- **Left Panel (Content):**
  - Readable text (for language learning).
  - Sentence highlighting (Karaoke style - *Future Phase*).
  - Font size/style controls.
- **Right Panel (Controls & Nav):**
  - **Player Controls:** Play/Pause, Rewind 15s, Forward 30s, Speed (0.8x - 2.0x).
  - **Voice Selector:** Switch narrator voice.
  - **Chapter List:** Scrollable list with status icons:
    - 🔒 Locked (Processing)
    - ⏳ Generating
    - ▶️ Ready to Play
    - ✅ Completed
  - **Vocabulary Drawer:** Quick save words to personal dictionary.

---

## 3. Database Schema Updates

We need to track *user-specific* interactions with *static* content.

### New Table: `user_book_progress`
Tracks where the user is in a specific book/document.

```sql
CREATE TABLE user_book_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Polymorphic reference (can be Public Book or User Document)
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('book', 'document')),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Progress Data
    current_chapter_index INTEGER DEFAULT 1,
    current_position_seconds INTEGER DEFAULT 0, -- Audio timestamp
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_finished BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints to ensure logical integrity
    CONSTRAINT check_content_reference CHECK (
        (content_type = 'book' AND book_id IS NOT NULL AND document_id IS NULL) OR
        (content_type = 'document' AND document_id IS NOT NULL AND book_id IS NULL)
    ),
    UNIQUE(user_id, content_type, book_id, document_id)
);

CREATE INDEX idx_user_progress_user ON user_book_progress(user_id);
CREATE INDEX idx_user_progress_last_access ON user_book_progress(last_accessed_at DESC);
```

### New Table: `library_items` (Virtual View or Table)
To unify `books` and `documents` for easy querying.
*Recommendation:* Use a Database View or a unified API endpoint rather than a new table, to avoid data duplication.

### Updates to `documents` Table
- Add `cover_image_url` (text) - Auto-generate from first page or abstract art.
- Add `author` (text) - Extracted or user-provided.

---

## 4. Frontend Component Architecture (React/Next.js)

### Components Tree

```
src/components/library/
├── LibraryLayout.tsx          # Main container
├── LibraryHeader.tsx          # Search, filters, stats
├── BookGrid.tsx              # Grid of BookCards
├── BookCard.tsx              # Individual item with progress bar
├── Player/
│   ├── AudioPlayer.tsx       # HTML5 Audio wrapper + controls
│   ├── ChapterList.tsx       # Navigation sidebar
│   ├── TextReader.tsx        # Main text display area
│   └── SpeedControl.tsx      # Playback speed dropdown
└── EmptyState.tsx            # "Start your first book" view
```

### State Management (Zustand/Context)
**`usePlayerStore`**:
- `isPlaying`: boolean
- `currentBookId`: string
- `currentChapterId`: string
- `currentTime`: number
- `duration`: number
- `volume`: number
- `playbackRate`: number
- `actions`: `play()`, `pause()`, `seek()`, `nextChapter()`, `setSpeed()`

---

## 5. Backend API Strategy

### Endpoints

1.  **GET /api/library**
    - Returns combined list of Public Books + User Documents.
    - Joins with `user_book_progress` to show % complete.
    - Sorts by `last_accessed_at`.

2.  **GET /api/library/:id/progress**
    - Returns current location for a specific book.

3.  **POST /api/library/progress/sync**
    - Updates `current_position_seconds` and `current_chapter_index`.
    - Called periodically (every 10-30s) while playing.

4.  **POST /api/library/favorites/toggle**
    - Adds/Removes from `user_favorites`.

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Backend)
1.  Run Migration: Create `user_book_progress` table.
2.  Update `documentController`: Add cover generation (simple placeholder logic for now).
3.  Create `libraryController`: Logic to fetch unified list.

### Phase 2: The Dashboard (Frontend)
1.  Create `src/app/dashboard/library` page.
2.  Build `BookCard` with progress bar visualization.
3.  Implement "Recent" vs "All" tabs.

### Phase 3: The Player (Core Feature)
1.  Build the persistent Audio Player component.
2.  Connect to `ttsController` output.
3.  Implement "Auto-play next chapter".

### Phase 4: Polish & "Smart" Features
1.  **Resume Playback:** When opening a book, jump to `current_position_seconds`.
2.  **Karaoke Highlighting:** (Advanced) Use VTT files to highlight active sentence.
3.  **Vocabulary Integration:** Double-click word to define & save.

## 7. Technical Recommendations

- **Audio Persistence:** Use a global context provider (`Layout.tsx`) for the audio player so audio continues playing even if the user navigates to the "Vocabulary" page to check a word.
- **Optimistic UI:** When clicking "Mark as Finished", update UI immediately before API response.
- **Cover Art:** For PDFs, use a dynamic SVG generator based on the Title's hash color if no real cover exists.

---

**Prepared by:** Cascade AI
**Date:** December 2025
