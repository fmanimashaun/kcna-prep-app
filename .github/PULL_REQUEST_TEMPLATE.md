<!-- Thanks for opening a PR. A short, focused description beats a long one. -->

## What this changes

A sentence or two on what's different and the user-visible effect.

## Why

The reason behind the change. If it's tied to an issue, link it (`Closes #123`).

## Type of change

- [ ] Bug fix
- [ ] New feature / enhancement
- [ ] Question / concept / flashcard data change
- [ ] Refactor (no behaviour change)
- [ ] Docs / chore

## Checklist

- [ ] `npm run build` passes locally.
- [ ] No hard-coded references to `fmanimashaun/kcna-prep-app` outside the documented fallback in [`Dashboard.jsx`](src/components/Dashboard.jsx) — the fork-in-5-minutes flow still works.
- [ ] No tokens, secrets, or personal info in the diff.
- [ ] If you touched questions:
  - [ ] The `correct` index lines up with the `expl` text. (Verify it — this is the most common bug class in this repo.)
  - [ ] No "All of the above" / throwaway distractor options.
  - [ ] Modern Kubernetes vocabulary (control plane not master, dockershim removed in 1.24, etc.).
- [ ] If you touched data files, you re-ran `node scripts/generate-exam-sets.js` and committed the regenerated `src/data/exam-sets.json`.
- [ ] If this is a UI change, you smoke-tested it in a browser (sign-in → answer a question → check the dashboard).

## Screenshots / before-after

If this changes what the user sees, paste a before/after pair.
