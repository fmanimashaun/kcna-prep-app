# KCNA Prep · Field Guide

A personal study tool for the **Kubernetes and Cloud Native Associate (KCNA)** exam.

- **410 practice questions** with detailed explanations, weighted by domain
- **83 flashcards** with three-tier spaced review (Again / Learning / Known)
- **CNCF Landscape reference** organized by category for fast recall
- **Live dashboard** with per-domain accuracy, exam countdown, and study strategy
- **Progress persists** in `localStorage` — close the tab, come back later

## Exam distribution

The question bank mirrors the official KCNA domain weights:

| Domain                          | Weight | Questions |
|---------------------------------|--------|-----------|
| Kubernetes Fundamentals         | 46%    | 107       |
| Container Orchestration         | 22%    | 87        |
| Cloud Native Architecture       | 16%    | 77        |
| Cloud Native Observability      | 8%     | 72        |
| Cloud Native Application Delivery | 8%   | 67        |

## Getting started

Requirements: **Node.js 18+** and **npm**.

```bash
# install dependencies
npm install

# run the dev server (opens http://localhost:5173)
npm run dev

# build for production
npm run build

# preview the production build
npm run preview
```

## Project structure

```
kcna-prep-app/
├── index.html                 # Vite entry
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx               # React entry
    ├── App.jsx                # Top-level app (state + routing)
    ├── index.css              # Fonts, theme variables, animations
    ├── data/
    │   ├── questions.json     # 410 practice questions
    │   ├── flashcards.json    # 83 flashcards
    │   ├── landscape.json     # CNCF landscape reference
    │   └── config.json        # Exam date, domains, sources
    ├── components/
    │   ├── Header.jsx
    │   ├── Section.jsx
    │   ├── Card.jsx
    │   ├── Filters.jsx
    │   ├── Dashboard.jsx
    │   ├── Practice.jsx
    │   ├── Flashcards.jsx
    │   └── Landscape.jsx
    └── utils/
        ├── storage.js         # localStorage helpers
        ├── helpers.js         # Date math, array shuffling
        └── theme.js           # Color tokens, font stacks
```

## Customizing

- **Change the exam date:** edit `src/data/config.json` → `examDate`.
- **Add your own questions:** append objects to `src/data/questions.json`. Each question needs `id`, `d` (domain key: `k8s` / `orch` / `arch` / `obs` / `del`), `src` (any string), `q`, `opts` (array), `correct` (index), and `expl`.
- **Add flashcards:** append to `src/data/flashcards.json` — `id`, `d`, `t` (term), `def` (definition).
- **Theme:** edit `src/utils/theme.js` (JS tokens) and `src/index.css` (CSS variables).

## Sources

The question bank is aggregated and deduplicated from three sources:

- **Curated** (60): hand-picked for highest-yield coverage
- **Prep Book** (336): comprehensive domain-specific and mixed banks
- **Quiz Game** (14): supplementary variations not found elsewhere

All three can be filtered independently on the Practice tab.

## Tech stack

- **React 18** with hooks
- **Vite** for dev server and build
- **lucide-react** for icons
- **localStorage** for persistence
- No backend, no API keys, no accounts — everything runs locally in your browser.

## License / Attribution

This is a personal study tool. Question content is drawn from publicly-available KCNA prep materials. If you fork or share, credit the respective original source authors.
