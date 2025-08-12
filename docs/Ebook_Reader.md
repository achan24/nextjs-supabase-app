# Ebook Reader — Product & Technical Specification

This document defines the MVP and v1 feature set for a first‑class ebook reader inside Guardian Angel. It focuses on fast importing, delightful reading, robust annotations, and tight integration with the Notes/Obsidian-style system.

## 1) Goals & Principles
- Be the fastest way to get an EPUB/PDF into your library and start reading.
- Make highlights, bookmarks, and notes frictionless with instant sync.
- Notes should reference exact locations in the book and be round‑trippable to the Notes app.
- ADHD‑friendly: low-friction starts, visible progress, short feedback loops.
- Offline-first; sync when online.

Non‑negotiables:
- Never lose annotations. Store on server and cache locally.
- PDF and EPUB parity: highlights, bookmarks, note links.
- Jump-links in notes like `[p.123]` must navigate the reader.

## 2) Supported Formats
- EPUB (reflowable) — rendered via ePub.js or equivalent
- PDF — rendered via PDF.js
- Long‑form Articles (HTML/Markdown) — optional import pipeline (later)

## 3) Core Features (MVP)
- Library
  - Drag‑drop upload of `.epub`/`.pdf`
  - Cover thumbnails, title/author, reading progress
  - Tags, shelves (custom collections)
- Reader UI
  - Page turns (tap/arrow keys), continuous scroll toggle
  - Font size, line height, margins, theme (light/dark/sepia), custom CSS (EPUB)
  - Table of contents; chapter navigation
  - Reading progress: page/percentage, per‑session timer
- Annotations
  - Highlights (colors), underline, and inline notes
  - Bookmarks (named, optional color)
  - Quick note panel (right side) with timestamps; link back to location
- Notes Integration
  - Dedicated notes area per book (Obsidian‑like) with markdown
  - Jump tokens recognized: `[p.123]` (PDF page), `[page 123]`, `[loc:cfi]` (EPUB CFI), `[ch:2.3]` (chapter anchor)
  - Clicking a token focuses the reader at that location
- Search
  - In‑book full‑text search
  - Find in notes, filter by highlight color/tag
- Sync & Offline
  - Files in Supabase Storage; local caching for offline reading
  - Annotations locally queued and synced

## 4) Nice‑to‑Have (v1)
- Dictionary/translation popover; Wikipedia lookup
- Text‑to‑Speech (TTS) with auto‑scroll
- Export highlights/notes to Notes app, with backlinks
- Quote images (shareable) from selection
- Reading goals and stats: daily minutes, pages/day, streaks
- Import from OPDS/Calibre / URL (remote EPUB/PDF)
- OCR layer for scanned PDFs (server pipeline)
- Generate flashcards from highlights (cloze maker)
- Auto create "Reading Plan" (chapters per day)

## 5) Reader–Notes Linking (spec)
- Tokens recognized inside notes:
  - PDF: `[p.123]`, `[page 123]` → page = 123
  - EPUB: `[loc:EPUB_CFI]` (e.g., `loc:epubcfi(/6/2[chap1]!/4/2/14)`)
  - Chapter anchor: `[ch:2.3]` (second‑level heading index), resolved via TOC map
- Clicking tokens dispatches `window.dispatchEvent(new CustomEvent('ebook:navigate', { detail: { bookId, target } }))`.
- Reader listens and navigates (PDF: `pageNumber`; EPUB: `rendition.display(cfi)`)

## 6) Data Model (tables)
- `ebooks`
  - `id uuid pk`, `user_id`, `title`, `author`, `series`, `cover_url`, `format enum('pdf','epub')`, `created_at`, `updated_at`
- `ebook_files`
  - `id uuid pk`, `ebook_id fk`, `storage_path`, `size`, `hash_sha256`, `uploaded_at`
- `ebook_progress`
  - `id uuid pk`, `ebook_id fk`, `current_location` (JSON: `{ page?: number, cfi?: string }`), `percentage numeric`, `last_opened_at`
- `ebook_annotations`
  - `id uuid pk`, `ebook_id fk`, `type enum('highlight','underline','note','bookmark')`
  - `color text`, `page int`, `cfi text`, `rects jsonb` (PDF quads), `text text`, `note text`, `created_at`, `updated_at`
- `ebook_notes`
  - `id uuid pk`, `ebook_id fk`, `content text (markdown)`, `updated_at`
- `ebook_tags` / `ebook_tag_links`

Storage
- Bucket `ebooks/` with `{user_id}/{ebook_id}/book.epub|book.pdf` and `cover.jpg`.

Indexes & policies
- All tables RLS by `user_id`.
- Index on `ebook_annotations(ebook_id, page, cfi)` and `ebook_progress(ebook_id)`.

## 7) API Endpoints
- `POST /api/ebooks` → create and get upload URL
- `POST /api/ebooks/:id/complete` → finalize upload (extract cover, metadata)
- `GET /api/ebooks` → list user library (search, tag filter)
- `GET /api/ebooks/:id` → metadata, progress, counts
- `POST /api/ebooks/:id/progress` → save location/percentage
- `POST /api/ebooks/:id/annotations` → create; `PATCH`/`DELETE`
- `GET /api/ebooks/:id/annotations` → range queries (by page/cfi)
- `GET/PUT /api/ebooks/:id/notes` → markdown content

## 8) Frontend Architecture
- Library page
  - Grid/list with quick filters (format, tags, status: unread/reading/finished)
  - Dropzone uploader; progress feedback
- Reader page
  - Left: TOC panel; Center: viewer; Right: Notes panel (collapsible)
  - Bottom: progress bar, page/percent, session timer, bookmark button
  - Selection toolbar: highlight color, add note, copy quote, define/translate
- Notes panel
  - Markdown editor (same stack as Obsidian client) with token link support
  - Backlinks to highlights (preview: text snippet)

## 9) Rendering & Location Model
- PDF
  - Use PDF.js; location = `{ page: number, rects?: [x,y,w,h]* }`
  - Highlights store page + normalized quads; clicking list item scrolls to first quad
- EPUB
  - Use ePub.js; location = `{ cfi: string }`
  - Highlights via CFI ranges; persist with rendition annotations

## 10) Search
- In‑book text search (per format provider)
- Notes search: tokens, tags, highlight text
- Global library search: title/author/tags

## 11) Export & Interop
- Export highlights (CSV/Markdown) with page/cfi links
- Push selected quotes into Notes as linked entries with `[p.X]` tokens
- Optional: sync a read‑only note per book (auto-updated)

## 12) Reading Stats & Goals (v1)
- Track sessions `{ started_at, ended_at, minutes, pages/loc advanced }`
- Goals: minutes/day or chapters/week; streak indicator
- Insights: most highlighted books, top topics (tags from notes)

## 13) Security & Privacy
- RLS everywhere; storage paths namespaced by `user_id`
- Large files chunked; antivirus scan hook (future)

## 14) Roadmap
- Phase 1 (MVP): import, library, reader, annotations, bookmarks, notes, `[p.X]`/`[loc:...]` navigation, offline cache, sync
- Phase 2: dictionary/translate, TTS, export to Notes, reading stats/goals, OPDS import
- Phase 3: OCR pipeline, flashcards/cloze from highlights, article ingestion, collaborative notes (shared books)

## 15) Open Questions
- Do we need DRM‑protected formats? (Out of scope for MVP)
- Per‑book CSS presets? (likely yes for EPUB)
- Multi‑device annotation merge strategy (CRDT vs last‑write‑wins)

---
This spec is implementation‑ready. Next steps: scaffold database tables + storage bucket, create `/dashboard/ebooks` pages (library + reader), and reuse the Obsidian markdown components for the notes panel and token navigation.
