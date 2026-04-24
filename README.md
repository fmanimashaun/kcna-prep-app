# KCNA Prep · Field Guide

A study tool for the **Kubernetes and Cloud Native Associate (KCNA)** exam — 410 practice questions, 83 flashcards, 16 concept deep-dives, timed exam simulations, and a CNCF landscape reference.

**Live demo:** https://fmanimashaun.github.io/kcna-prep-app/

> This is a personal study tool first — built for one person to pass the exam. But everything is client-side, so you can fork it, host your own copy on GitHub Pages in ~5 minutes, and have your own private prep site with cross-device sync.

---

## Features

- **410 practice questions** with detailed explanations, partitioned across 7 exam-style sets (6 × 60 + 1 × 50).
- **Timed exam mode** — 60 questions, 90-minute countdown, question navigator with flagging, review-answers screen.
- **Free practice mode** — filter by domain, source, only-unanswered, only-previously-wrong; shuffle the deck; instant feedback.
- **16 concept deep-dives** in the Revise tab — each with summary, key points, common traps, and related terms. Write your own notes alongside the curated set.
- **"Learn more" panel** below every explanation — surfaces 1–2 concepts from the same domain (keyword-matched to the question) as collapsible inline cards.
- **83 flashcards** with three-tier spaced review (Again / Learning / Known).
- **CNCF landscape reference** organized by category for fast recall.
- **Live dashboard** — questions attempted, overall accuracy, data-driven "weak areas" (your 3 lowest-accuracy domains), exam-run history, days-until-exam countdown.
- **Per-user progress tracking** — multiple people can share the same browser without mixing results.
- **Optional cross-device sync** via a private GitHub Gist — open the app on your phone, tablet, or another laptop and see the same progress.
- **No backend, no accounts, no tracking** — everything runs in your browser. The Gist sync talks directly to github.com; nothing else.

---

## Using the app

1. Open the live site (or your fork's URL).
2. Enter your name. Progress is saved under that name.
3. Pick a tab:
   - **Dashboard** — where you stand, weak areas, exam countdown.
   - **Practice** — two modes: *Exam sets (timed)* for dress rehearsal, *Free practice (untimed)* for grinding specific domains.
   - **Revise** — read concept deep-dives and add your own notes.
   - **Flashcards** — quick recall, three-tier review.
   - **Landscape** — CNCF project reference grid.
4. (Optional) Click the cloud icon in the header to enable cross-device sync — see [Cross-device sync](#cross-device-sync) below.

---

## Fork it and host your own

The app is a static Vite build. GitHub Pages runs it for free. Here's how to get your own copy live in a few minutes.

### 1. Fork the repo

Click **Fork** at the top of [this repo](https://github.com/fmanimashaun/kcna-prep-app). Name it whatever you want (keep `kcna-prep-app` if you want the same URL shape).

### 2. Enable GitHub Pages

In your fork:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Save. (No other field to fill in.)

> **Heads up:** GitHub may offer you a "Jekyll" workflow template. **Don't pick it** — this app uses a custom Vite workflow that's already included in `.github/workflows/deploy.yml`. If you accidentally merged a Jekyll workflow, delete `.github/workflows/jekyll-gh-pages.yml` from your repo.

### 3. Push any commit to trigger the deploy

Just pushing to `main` runs the workflow. You can:

- Commit something small (like updating this README with your own name), or
- Go to **Actions → Deploy to GitHub Pages → Run workflow** to trigger manually.

Wait ~1 minute, then open:

```
https://<your-github-username>.github.io/<your-repo-name>/
```

### 4. If you renamed the repo

The Vite build needs the base path to match the subpath on GitHub Pages. The workflow (`.github/workflows/deploy.yml`) already reads the repo name automatically:

```yaml
env:
  VITE_BASE: /${{ github.event.repository.name }}/
```

No manual change needed — it just works for whatever you called the fork.

---

## Cross-device sync

Progress is stored in `localStorage` by default, which means each browser has its own separate data. If you want to pick up from where you left off on your phone, tablet, or another laptop, enable Gist sync.

### Why a Gist?

- No server to run, maintain, or pay for.
- No separate account to sign up for.
- Your data lives in a **private Gist** on your own GitHub account.
- Versioned automatically — GitHub keeps history.
- Works offline: changes queue locally, push when you reconnect.

### Generate a personal access token

1. Go to **https://github.com/settings/tokens/new?description=KCNA+Prep+Sync&scopes=gist** (pre-fills the name and scope).
2. Set an expiration (30–90 days is fine — you can regenerate later).
3. Scopes: **only** `gist` should be checked. No `repo`, no `admin`, nothing else.
4. Click **Generate token** at the bottom.
5. **Copy the token** — GitHub only shows it once.

> **Why `gist`-only?** That scope only lets the token read and write gists. It **cannot** touch your repos, your issues, your account settings, or anything else. Even if you lost the token, the worst someone could do is read/write your gists. Revoke at github.com/settings/tokens the moment you don't need it.

### Connect the app

1. Open the app (on any device).
2. Enter your name.
3. Click the **cloud icon** in the header → **Paste token** → **Connect**.
4. The app searches your gists for one named `kcna-prep-data.json`:
   - If it finds one (from another device), it **pulls** the data and your local state is replaced with it.
   - If not, it **creates** a new private gist and pushes your current local state.

### Use on a second device

1. Open the same URL on your phone / tablet / other laptop.
2. Enter the same name.
3. Paste the same token.
4. Done — you now see the same progress.

Every change (answering a question, finishing an exam set, adding a note) is pushed to the Gist with a 2-second debounce, so rapid clicks don't spam the API. Opening the app pulls the latest state.

### Notes on sync

- **Single source of truth is the Gist.** On pull, the remote overwrites local.
- **Last-write-wins** on simultaneous edits. Realistically not an issue for a personal prep app.
- **Token per device.** The token is stored in `localStorage` on each browser. Paste it once per device, not every session.
- **Revoke anytime** at github.com/settings/tokens — the app falls back to localStorage-only when the token is gone.

---

## Customizing content

Data lives in [`src/data/`](src/data/). All files are plain JSON.

### Change the exam date

Edit `src/data/config.json`:

```json
{
  "examDate": "2026-04-29T09:00:00",
  ...
}
```

### Add practice questions

Append to `src/data/questions.json`. Schema:

```json
{
  "id": "q0411",
  "d": "k8s",
  "src": "curated",
  "q": "Your question text?",
  "opts": ["A", "B", "C", "D"],
  "correct": 2,
  "expl": "Why the correct answer is correct, and why the others aren't."
}
```

- `d` — domain key: `k8s`, `orch`, `arch`, `obs`, `del`
- `src` — any string (e.g. `curated`, `mine`, `prep`) — filterable in the UI
- `correct` — zero-based index into `opts`

If you add many new questions, regenerate the exam sets so they include the new content:

```bash
node scripts/generate-exam-sets.js
```

### Add flashcards

Append to `src/data/flashcards.json`:

```json
{ "id": "f0084", "d": "k8s", "t": "Term", "def": "Definition" }
```

### Add a curated concept for the Revise tab

Append to `src/data/concepts.json`:

```json
{
  "id": "c017",
  "title": "Your topic",
  "d": "orch",
  "summary": "One-line why it matters.",
  "points": ["First point", "**Second** point with bold"],
  "traps": ["Common misconception"],
  "related": ["related term 1", "related term 2"]
}
```

Supports `**bold**` and `` `code` `` in inline strings.

### Tweak the theme

Colors and font stacks live in `src/utils/theme.js`. CSS variables and animations are in `src/index.css`.

---

## Local development

Requirements: **Node.js 20+** and **npm**.

```bash
# install
npm install

# run dev server (http://localhost:5173 — or the next free port)
npm run dev

# production build (writes to dist/)
npm run build

# preview the production build
npm run preview
```

The GitHub Actions workflow runs `npm ci && npm run build` on every push to `main` with `VITE_BASE` set to match the repo name, and deploys the `dist/` output to GitHub Pages.

---

## Project structure

```
kcna-prep-app/
├── .github/workflows/deploy.yml   # GH Pages build + deploy on push to main
├── scripts/
│   └── generate-exam-sets.js      # Partitions questions.json into 7 exam sets
├── src/
│   ├── main.jsx                   # React entry
│   ├── App.jsx                    # Top-level state, routing, sync orchestration
│   ├── index.css                  # Fonts, theme variables, animations
│   ├── data/
│   │   ├── questions.json         # 410 practice questions
│   │   ├── exam-sets.json         # Generated: 7 stable exam sets
│   │   ├── flashcards.json        # 83 flashcards
│   │   ├── concepts.json          # 16 curated concept deep-dives
│   │   ├── landscape.json         # CNCF landscape reference
│   │   └── config.json            # Exam date, domains, sources, weights
│   ├── components/
│   │   ├── Header.jsx             # Tabs, user switch, sync indicator
│   │   ├── Section.jsx, Card.jsx, Filters.jsx
│   │   ├── Dashboard.jsx          # Snapshot, weak areas, exam history
│   │   ├── Practice.jsx           # Container: exam sets + free practice
│   │   ├── ExamSets.jsx           # Timed exam picker + active + results
│   │   ├── FreePractice.jsx       # Untimed filtered practice
│   │   ├── Revise.jsx             # Concept deep-dives + user notes
│   │   ├── RelatedConcepts.jsx    # "Learn more" panel after explanations
│   │   ├── Flashcards.jsx         # Three-tier flashcard review
│   │   ├── Landscape.jsx          # CNCF project grid
│   │   ├── UserPrompt.jsx         # First-load name entry
│   │   └── SyncPanel.jsx          # Gist sync setup modal
│   └── utils/
│       ├── storage.js             # Per-user localStorage schema
│       ├── sync.js                # Gist API client + sync config
│       ├── conceptRender.jsx      # Shared markdown + concept matching
│       ├── helpers.js             # Date math, array shuffling
│       └── theme.js               # Color tokens, font stacks
└── vite.config.js                 # Uses VITE_BASE env for subpath hosting
```

---

## Tech stack

- **React 18** with hooks
- **Vite 8** for dev server and build
- **lucide-react** for icons
- **localStorage** + **GitHub Gist API** for persistence
- No other third-party services, no tracking, no analytics.

---

## License and attribution

This is a personal study tool, provided as-is. Question content is aggregated and deduplicated from publicly-available KCNA prep materials. If you fork, extend, or share, please credit the original source authors of the question content.

Code is yours to adapt for your own prep — or any other exam. The engine is generic; replace the data files and it works for anything with multiple-choice questions, flashcards, and concept notes.
