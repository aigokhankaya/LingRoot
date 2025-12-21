# LingRoot Modern UI Design Prompt

**Role:** Expert Senior Frontend Engineer & UI/UX Designer  
**Frameworks:** Next.js (React), Tailwind CSS, Framer Motion, Lucide React icons.  
**Platform:** Mobile-First Web Application (PWA ready).  
**Vibe:** Premium, "Apple-Quality", Highly Animated, Smooth, Airy, Colorful but clean.

## Objective
Redesign the "Welcome/Home" experience of LingRoot, a personalized AI language learning app. The goal is to move away from a static form-based UI to a dynamic, interactive, and visually stunning "command center" that feels like a native iOS app.

## Visual Language
- **Glassmorphism:** Use extensive backdrop-blur, translucent whites/darks for cards and navigation bars.
- **Micro-interactions:** Every button press, hover, and transition must have a smooth spring animation (using Framer Motion).
- **Typography:** Clean, modern sans-serif (e.g., Inter, Geist, or SF Pro). Large, bold headings, readable body text.
- **Rounded Aesthetics:** Heavy use of `rounded-2xl` or `rounded-3xl` to mimic modern mobile trends.
- **Shadows:** Soft, colored shadows to create depth (e.g., `shadow-indigo-500/20`).

## Core Layout & Features

### 1. Header & Greeting
- A personalized, animated greeting area (e.g., "Good Evening, [User]").
- Display user streaks or daily goals with a progress ring animation.
- A "Liro" AI Agent avatar that gently pulses or looks at the user (animated SVG or Lottie).

### 2. The "Learning Mode" Selector (Hero Section)
Instead of a crowded list, create a vertically scrollable or swipeable "Carousel" of distinct Learning Modes. Each card should trigger a layout change or expand when selected.
- **Topic Tree:** A visual node-based graphic.
- **Book Library:** A 3D-tilted book cover flow.
- **Podcast Studio:** An animated audio waveform visualization.
- **YouTube Learning:** A video player frame with floating play buttons.
- **Document/Text:** A clean paper-like document icon.
- **Hobbies:** A dynamic grid of interest icons (gaming, art, tech).

*Animation Idea:* When a user swipes card to card, the background gradient shifts color subtly to match the mode (e.g., Blue for Books, Purple for Podcast, Red for YouTube).

### 3. Dynamic Input Area (The "Stage")
Below the selector, show a context-aware input section.
- If **Podcast** is selected: Show "Host" & "Guest" avatars that slide in.
- If **Topic** is selected: Show a "What do you want to learn?" floating input field.
- If **Upload** is selected: A drag-and-drop zone that pulses.

### 4. Interactive History Tape
- A horizontal scrolling ticker or list at the bottom showing recent generated content.
- Items should slide in with a stagger effect.
- Playing an item should expand a mini-player (Spotify style) floating above the bottom nav.

### 5. Navigation
- A floating "Dock" style bottom navigation bar with blur effect.
- Icons: Home, Library, Community, Profile.
- The active tab should have a glowing background or indicator.

## Technical Constraints & Requirements
- **Responsive:** Must look perfect on mobile (iPhone 14 Pro size ref) and scale gracefully to desktop (centered mobile app view or grid).
- **Animations:** Use `<AnimatePresence>` for page transitions. Use `layoutId` for shared element transitions between the card selection and the input view.
- **Code Quality:** Modern React functional components, strictly typed TypeScript interfaces.
- **Colors:** Use a curated palette (Violet, Indigo, Emerald, Slate) via Tailwind config.

## Example Scenario to Generate
"User opens the app, sees a 'Good Morning' message with their avatar. They swipe right to select 'Podcast Mode'. The background shifts to a deep violet gradient. Two character avatars (Host & Guest) pop up. The user types 'Future of AI' and hits a glowing 'Generate' button. The button morphs into a loading spinner, then transitions into a media player playing the generated podcast."
