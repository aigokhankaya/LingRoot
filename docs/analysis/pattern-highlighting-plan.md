# Pattern Highlighting & Popup Analysis Plan

> **Oluşturulma:** 2026-01-06 | **Güncelleme:** 2026-01-06 | **Versiyon:** 1.0

## 1. Goal
The objective is to highlight specific phrases (idioms, proverbs, patterns) from the `pattern_library` table in the audio player text views on both Mobile and Web platforms.
- **Highlight Style:** Orange border around the phrase (no background fill).
- **Interaction:** Tapping/clicking the highlight opens a detail popup.
- **Popup Content:** Type, Translation, Example Text, Example Translation.
- **Popup Design:** Must match the "new design" (referenced from `TTSOverlay` / modern UI standards in the project).

## 2. Backend Analysis
**Current State:**
- `PatternController.findPatternsInText` currently queries `daily_usage_patterns`.
- `pattern_library` table exists with columns: `id, lang, type, text, translation, explanation, level, category, example_text, example_translation`.

**Required Changes:**
- Modify `PatternController.findPatternsInText` (or create `PatternController.findLibraryPatternsInText`) to search in `pattern_library`.
- **Search Logic:**
  - Case-insensitive matching of `pattern_library.text` against the provided content.
  - Return all matching patterns with fields: `type`, `translation`, `example_text`, `example_translation`.
- **Response Format:**
  ```json
  {
    "success": true,
    "patterns": [
      {
        "pattern": "piece of cake",
        "type": "idiom",
        "translation": "çocuk oyuncağı",
        "example_text": "The exam was a piece of cake.",
        "example_translation": "Sınav çocuk oyuncağıydı.",
        "startIndex": 10, // Optional: calculated on client or server
        "endIndex": 23
      }
    ]
  }
  ```

## 3. Web Frontend Analysis
**Component:** `frontend/src/components/OutputSection.tsx` (and `NewSyncedTextPlayer.tsx` if applicable).
**Current State:**
- Renders text word-by-word or sentence-by-sentence.
- `OutputSection` handles "English Word Click" for vocabulary lookup.

**Implementation Plan:**
1.  **Pattern Fetching:**
    - In `OutputSection`, call the new backend endpoint when `adaptedText` is available.
    - Store patterns in local state.
2.  **Highlighting Logic:**
    - During text rendering (in the mapping of `adaptedTextWords`), look ahead to identify multi-word patterns.
    - Wrap pattern phrases in a `<span>` with classes: `border-2 border-accent rounded-md cursor-pointer`.
    - Ensure pattern events (click) take precedence over individual word clicks.
3.  **Popup (Modal):**
    - Create a new component `PatternDetailModal.tsx`.
    - **Design Reference:** `newDesign/components/TTSOverlay.tsx`.
    - **Style:**
        - `bg-white`, `rounded-3xl`, `shadow-2xl`.
        - Top Gradient: `bg-gradient-to-r from-orange-400 to-amber-600` (matching the orange theme).
        - Content Layout: Clean typography, icons for sections (Type, Translation, Example).
    - **Integration:** Render `PatternDetailModal` in `OutputSection` when a pattern is clicked.

## 4. Mobile Analysis
**Component:** `LingRootMobile/src/components/AudioPlayer.tsx` & `SkiaWordHighlight.tsx`.
**Current State:**
- `AudioPlayer` already has `loadPatterns` logic (needs verification if it matches the new backend).
- `SkiaWordHighlight` draws filled rectangles for patterns.
- `SkiaWordHighlight` has a built-in Modal with multi-colored cards.

**Implementation Plan:**
1.  **Data Sync:** Ensure `AudioPlayer` receives the corrected data structure from the updated backend.
2.  **Rendering Update (`SkiaWordHighlight.tsx`):**
    - Change `RoundedRect` style from **Fill** to **Stroke** (requires proper Skia Paint usage for stroke, or simulating stroke with inner/outer rects if generic `RoundedRect` defaults to fill. Skia `Paint` style `Stroke` is standard).
    - Color: `ACCENT_COLOR` (Orange #F8B13B).
3.  **Popup Update (`SkiaWordHighlight.tsx`):**
    - Replace the existing `Modal` content with a new design.
    - Match Web's `PatternDetailModal` look:
        - White 3XL rounded card.
        - Subtle shadow.
        - Orange/Amber gradient header.
        - Clean list of attributes (Type, Translation, Example).

## 5. Design Assets
- **Color:** `hsl(var(--accent))` -> Orange (#F8B13B).
- **Border:** `2px solid`.
- **Corner Radius:** `rounded-md` for highlights, `rounded-3xl` for popup.

## 6. Action Items Checklist
- [x] **Backend:** Refactor `patternController` to use `pattern_library`.
- [x] **Web:** Implement `PatternDetailModal` (New Design).
- [x] **Web:** Implement border highlighting in `OutputSection`.
- [x] **Mobile:** Update `SkiaWordHighlight` to use Stroke instead of Fill.
- [x] **Mobile:** Redesign mobile popup to match "New Design".

## 7. Implementation Summary (2026-01-06)
### Backend Changes
- Updated `findPatternsInText` in `patternController.js` to query `pattern_library` table
- Returns `type`, `translation`, `example_text`, `example_translation` fields

### Web Frontend Changes
- Created `PatternDetailModal.tsx` with modern gradient header design
- Updated `OutputSection.tsx`:
  - Added pattern fetching on mount
  - Implemented orange border highlighting for pattern phrases
  - Integrated PatternDetailModal popup

### Mobile Frontend Changes
- Updated `SkiaWordHighlight.tsx`:
  - Changed pattern rendering from Fill to Stroke (border)
  - Uses orange `ACCENT_COLOR` for stroke
  - Redesigned popup with gradient orange header
  - Added type badge and footer close button
  - Supports both new and old backend field names for backward compatibility
