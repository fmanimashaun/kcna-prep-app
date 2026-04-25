# Contributing

Thanks for taking a look. This is a personal study tool that other people now use to prep for the **Kubernetes and Cloud Native Associate (KCNA)** exam, so the bar isn't "production SaaS" — it's "trustworthy enough to study from." The two things that matter most:

1. **Answer correctness.** Wrong answer keys actively harm someone's prep. They take priority over everything else.
2. **A forker can run their own copy in 5 minutes.** Anything that breaks that — hard-coded URLs, secrets in code, repo-name assumptions — is a regression.

If you keep those two in mind, you're already aligned with the project.

---

## Ways to contribute

### 1. Flag a wrong answer or shaky question (no PR needed)

The fastest path is the in-app flow:

1. In free practice (or after submitting an exam set), click the **flag icon** on the question.
2. Write a one-line reason (e.g. "answer key looks wrong", "option C is ambiguous", "explanation contradicts the right answer"). Save.
3. Open the **Dashboard** → **Flagged for review** → **Open GitHub issue**.
4. Your browser opens a pre-filled new-issue page on this repo with the question id, options, current "correct" answer, and your reason. Hit submit.

This is by far the most useful kind of contribution — it doesn't need git, a fork, or a PR.

### 2. Add or fix questions, concepts, or flashcards (PR)

Data lives in plain JSON in [`src/data/`](src/data/):

- [`questions.json`](src/data/questions.json) — practice questions
- [`concepts.json`](src/data/concepts.json) — Revise-tab deep-dives
- [`flashcards.json`](src/data/flashcards.json) — three-tier flashcards
- [`landscape.json`](src/data/landscape.json) — CNCF project grid

Schemas are documented in [README → Customizing content](README.md#customizing-content). When you add or change questions:

- Match the existing voice — short, exam-realistic stems with **no joke distractors** ("All of the above", obviously-wrong throwaway options, "All listed components are containers" filler).
- The explanation should justify the right answer **and** call out why the other plausible options are wrong. KCNA trades on subtle distinctions (DaemonSet vs Deployment, ClusterIP vs NodePort, HPA vs VPA vs CA) — that's what a good explanation should pin down.
- Use current Kubernetes vocabulary — control plane (not master), dockershim removed in 1.24, Gateway API GA in 1.29, EndpointSlice replacing Endpoints, etc.
- If you add many new questions, regenerate the exam sets so they include the new content:
  ```bash
  node scripts/generate-exam-sets.js
  ```

### 3. App code (PR)

Pick an issue, or open one first if the change is non-trivial. Useful starting points:

- Components live under [`src/components/`](src/components/) — pure React, no global state library.
- Per-user persistence is in [`src/utils/storage.js`](src/utils/storage.js).
- Cross-device sync (private GitHub Gist) is in [`src/utils/sync.js`](src/utils/sync.js).
- The build is plain Vite — no test runner, no formatter config. Match the surrounding style.

### 4. Discussion / study tips / strategy

If it isn't a code change or a wrong answer, take it to **[Discussions](https://github.com/fmanimashaun/kcna-prep-app/discussions)** — that's the right place for "what worked for me", "anyone else taking it on date X", "I'm stuck on this concept", etc.

---

## Local development

Requirements: **Node.js 20+** and **npm**.

```bash
git clone https://github.com/<your-username>/kcna-prep-app.git
cd kcna-prep-app
npm install
npm run dev    # http://localhost:5173
```

Before opening a PR:

```bash
npm run build  # must pass
```

There are no automated tests right now. Manual smoke-test:

1. Sign in with a fresh name and exam date.
2. Run a free practice question, answer right and wrong.
3. Open the Dashboard, click a recent answer — it should re-open the question without restarting.
4. Open a flag and verify the GitHub-issue pre-fill points at the **right repo** (your fork in dev, this repo in prod). Set `VITE_ISSUES_REPO` if you want to test the prod path locally:
   ```bash
   VITE_ISSUES_REPO=your-username/your-repo npm run dev
   ```

---

## Pull request checklist

Before requesting review, make sure:

- [ ] `npm run build` passes.
- [ ] No hard-coded references to `fmanimashaun/kcna-prep-app` outside the documented fallback in `Dashboard.jsx`.
- [ ] No tokens, secrets, or personal info in the diff.
- [ ] If you touched data files, you re-ran `node scripts/generate-exam-sets.js` and committed the regenerated `src/data/exam-sets.json`.
- [ ] If you touched questions, the `correct` index lines up with the `expl` text (this is the single most common bug class — verify it).
- [ ] PR description explains the *why*, not just the *what*. The diff already shows the what.

---

## Reporting security issues

Don't open a public issue. See [SECURITY.md](SECURITY.md) for the threat model, what's in scope, and how to file a private report. Both a private GitHub advisory and an email channel are listed there.

---

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Be kind. The community is small but real — someone reading what you write may be 36 hours from sitting the exam and feeling stressed. Lead with that energy.
