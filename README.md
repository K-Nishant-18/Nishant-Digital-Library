# 📚 My Library — Personal Reading Command Center

A private, self-hostable reading tracker with a built-in **EPUB & PDF reader**, automatic reading-session tracking, gamified streaks, analytics, and a knowledge journal. Think of it as your personal Goodreads + Kindle + Obsidian — but yours, backed by your own Postgres database.

Built with **Next.js 16 (App Router) · React 19 · Prisma · PostgreSQL · Tailwind CSS v4**.

---
<img width="1449" height="826" alt="image" src="https://github.com/user-attachments/assets/a235045c-c075-4684-8f97-20fd339c04db" />


## ✨ Features

### 📖 In-App Book Reader (EPUB + PDF)
- **Upload** an EPUB or PDF (up to 30MB) to any book — stored securely in your own database
- **Kindle-style interface**: tap zones on desktop, swipe gestures on mobile, center-tap toggles distraction-free mode with auto-hiding chrome
- **Display settings (Aa panel)**: 5 themes (White / Sepia / Gray / Dark / Black), text size, serif/sans fonts, line spacing, margins, brightness — all persisted
- **Highlights & notes**: select any passage → highlight it, attach a note, or copy it. Everything is saved against the book and re-rendered when you return
- **Table of contents** drawer for EPUBs + draggable location slider for precise navigation
- **Resume anywhere**: your exact position (CFI for EPUB, page for PDF) is stored server-side
- **Automatic session tracking**: active reading time counts only while you're actually reading (tab visibility aware). Closing the book logs a real reading session — pages, minutes, streaks, XP — exactly like manual logging
- **PDF extras**: fit-width zoom, dark-mode inversion, sepia tinting

### 📊 Dashboard & Analytics
- At-a-glance stat tiles: current streak, books this year (with goal progress), pages this year, average rating
- Currently Reading card pinned to the top of mobile — progress bar, projected finish date (*"on track to finish by Oct 12"* based on your real pace), one-tap continue
- **Year heatmap** (GitHub-style) of every reading session from the past 12 months
- Monthly pages chart, genre distribution, rating distribution, streak records
- TBR queue preview and recent session activity feed

### 📝 Journal (Notes & Quotes)
- Highlights, quotes, reflections, and notes — filterable by type and tags
- Tag cloud with usage counts; one-click copy to clipboard
- **Export everything** as CSV or Markdown (Obsidian/Notion-friendly)
- Full-text search across all notes via ⌘K (server-side, scales past memory)

### 📥 Getting Books In
1. **Search online** — Google Books first, Open Library fallback, covers and metadata auto-filled
2. **Scan a barcode** — point your camera at any ISBN; instant exact-match lookup
3. **Import CSV** — one-shot migration from **Goodreads or StoryGraph** (status mapping, quoted-field parsing, metadata backfill, live progress)
4. Manual entry via the edit modal (ratings, difficulty, emotional impact, re-read value…)

### 🏆 Gamification
- XP for adding books (+50), writing notes (+25), and reading (minutes × 2 + pages)
- Level system, daily streak tracking, completion bonuses (+500)
- Reading goals with yearly targets

### 🧰 Everything Else
- **Light / Dark themes** with no-flash pre-paint loading; respects your OS preference on first visit
- **PWA**: installable, offline-capable (cached dashboard snapshot + static assets)
- Global quick search (`⌘K` / `Ctrl+K`) across books *and* note text
- Finish-book flow: rate it, write a review, see auto-computed stats (total pages, hours, pages/day, pages/hour)
- Password-protected single-user app (session cookies)

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| UI | React 19, TypeScript 5.7 |
| Styling | Tailwind CSS v4 + hand-crafted semantic CSS |
| Database | PostgreSQL via [Prisma ORM](https://pris.ly) 6 |
| Reader | [epub.js](https://github.com/futurepress/epub.js) + [react-pdf](https://github.com/wojtekmaj/react-pdf) (pdf.js 5) |
| Barcode | [@zxing/library](https://github.com/zxing-js/library) |
| Charts | Recharts |
| Auth | Signed HMAC session cookie (no external provider) |
| Hosting-ready | Vercel Analytics hook, PWA manifest + service worker |

---

## 🚀 Make Your Own

### Prerequisites
- **Node.js 20+**
- **pnpm** (`corepack enable` or `npm i -g pnpm`)
- A **PostgreSQL** database (see below — takes ~2 minutes with Neon)

### 1. Clone & install

```bash
git clone https://github.com/<you>/my-library.git
cd my-library
pnpm install
```

### 2. Create your database

**Option A — Neon (recommended, free):**
1. Sign up at [neon.tech](https://neon.tech) → create a project
2. Copy the pooled connection string (looks like `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`)

**Option B — Local Docker:**

```bash
docker run --name my-library-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mylibrary -p 5432:5432 -d postgres:16
# connection string: postgresql://postgres:postgres@localhost:5432/mylibrary
```

Any Postgres works (Supabase, Railway, RDS…).

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Your Postgres connection string |
| `APP_PASSWORD` | ✅ | The password you'll use to log in |
| `AUTH_SECRET` | Production only | Long random string — `openssl rand -hex 32`. Dev works without it |

### 4. Create tables & run

```bash
npx prisma db push     # creates all tables in YOUR database
pnpm dev               # http://localhost:3000
```

Optional — seed a starter profile/goal:

```bash
npx prisma db seed
```

Log in at `http://localhost:3000` with your `APP_PASSWORD`. That's it — add a book, upload its EPUB, and start reading.

> 💡 All data (books, files, highlights, sessions) now lives in **your** database. Delete the Neon project tomorrow and nothing of yours remains anywhere else.

---

## ☁️ Deploying (Vercel)

1. Push your repo to GitHub
2. Import it on [Vercel](https://vercel.com/new)
3. Add environment variables `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET`
4. Deploy

**Caveat:** EPUB/PDF files are stored as bytes in Postgres. Serverless response limits (~4.5 MB on Vercel Hobby) mean very large books may fail to stream in production hosting while working fine locally or on a long-running host. Keep reader files modest, or swap the storage layer for object storage if needed.

---

## 🗂 Project Structure

```
app/
  layout.tsx            # Root layout, theme init script (no-flash), PWA hooks
  page.tsx              # Main dashboard (auth-gated, loads library data)
  login/                # Password login
  api/reader/[entryId]/ # Streams uploaded EPUB/PDF bytes to the client reader
components/
  library-dashboard.tsx # App shell, topbar, modals, dashboard view
  book-reader.tsx       # Full-screen EPUB/PDF reader (themes, gestures, annotations)
  pdf-pane.tsx          # pdf.js rendering pane (zoom, selection, overlays)
  currently-reading.tsx # Hero view w/ pace projection & finish flow
  virtual-library.tsx   # Collection views (grid/shelf/list) + CSV import entry
  csv-import-modal.tsx  # Goodreads/StoryGraph importer
  finish-book-modal.tsx # Rating/review + auto-computed stats
  notes-journal.tsx     # Journal w/ export
  year-heatmap.tsx      # GitHub-style activity calendar
  barcode-scanner.tsx   # Camera ISBN scanning
  cover-image.tsx       # next/image wrapper w/ graceful fallback
lib/
  actions.ts            # ALL server actions (data, sessions, reader, stats engine)
  api.ts                # Google Books / Open Library clients + ISBN search
  types.ts              # Shared domain types
prisma/schema.prisma    # Book, LibraryEntry, ReadingSession, Note, Shelf,
                        # ReadingGoal, UserProfile, BookFile, ReaderProgress,
                        # ReaderHighlight
public/sw.js            # Offline service worker
```

---

## 🔧 Customization Pointers

| Want to change… | Look at |
|---|---|
| Reader themes / fonts | `THEME_DEFS`, `FONT_STACKS` in `components/book-reader.tsx` |
| Gamification rates | XP formulas in `logReadingSessionAction`, `addBookToLibraryAction`, `flushReaderSessionAction` (`lib/actions.ts`) |
| Upload size limit | `MAX_READER_FILE_BYTES` in `lib/actions.ts` |
| CSV import column mapping | `parseRows` in `components/csv-import-modal.tsx` |
| Streak / pace logic | `computeStats` in `lib/actions.ts` |
| Theme palette | CSS variables in `app/globals.css` (`:root` = dark, `html.light-mode` = light) |

---

## 🩺 Troubleshooting

<details>
<summary><b>Windows: <code>EPERM</code> when running prisma generate/build</b></summary>

Your dev server is holding Prisma's engine DLL. Stop `pnpm dev`, re-run the command, restart the server.
</details>

<details>
<summary><b>Reader shows "module factory not available" or stale chunks after code changes</b></summary>

The service worker cached old chunks. Hard-reload once (**Ctrl+Shift+R**). In development the app now auto-unregisters service workers — this should not recur.
</details>

<details>
<summary><b>PDF fails to load</b></summary>

`public/pdf.worker.min.mjs` must match the pdfjs-dist version react-pdf uses. If you upgrade `react-pdf`, re-copy:

```bash
cp node_modules/.pnpm/react-pdf@*/node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

(On non-pnpm setups: `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/`)
</details>

<details>
<summary><b>Camera scan does nothing</b></summary>

Barcode scanning requires HTTPS (or localhost) camera permission. Type the ISBN manually instead — search treats pure numbers as ISBN lookups.
</details>

---

## 📄 License

MIT — do whatever you like, attribution appreciated.

Built as a personal reading infrastructure project. Happy reading! 📚🔥
