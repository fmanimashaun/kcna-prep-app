# Security Policy

This is a static, single-page React app deployed to GitHub Pages. It has no backend — everything runs in the user's browser. The threat model is small but real, since the app handles a per-user GitHub personal access token (when sync is enabled) and writes to a private gist on the user's behalf.

## Supported versions

Only the `main` branch / latest deployment is supported. Forks are responsible for their own deployments. Security fixes land on `main` and are picked up automatically by the GitHub Pages build.

## In scope

I'd like to know about issues like:

- **Token leakage** — anything that exfiltrates a user's `gist`-scoped token off-device, sends it somewhere other than `api.github.com`, or persists it where another origin / extension could read it.
- **XSS in user-supplied content** — user notes, flag reasons, or any other text the user types that's later rendered. The app doesn't currently use `dangerouslySetInnerHTML`, but if you find a path that does effective HTML injection, that qualifies.
- **Gist data exposure** — any flow that makes a user's private gist public, or that allows another logged-in GitHub user to read someone else's gist via this app.
- **Supply-chain issues** — a transitive dependency that's known-malicious or that pulls in remote code at build/runtime.
- **Auth-bypass** — anything that lets an unauthenticated request hit `api.github.com` with someone else's token.

## Out of scope

These are bugs, but they go to the regular [issue tracker](https://github.com/fmanimashaun/kcna-prep-app/issues), not here:

- Wrong answer keys or shaky question wording (use the in-app **Flag** button).
- UI bugs that don't expose user data.
- Theoretical attacks against GitHub's gist API itself (report those to GitHub).
- Issues that require an attacker to already control the victim's browser, GitHub session, or local machine.

## How to report

Please **do not open a public issue** for security problems. Use either of these private channels:

- **GitHub private vulnerability reporting** (preferred — keeps everything tracked in one place):
  [github.com/fmanimashaun/kcna-prep-app/security/advisories/new](https://github.com/fmanimashaun/kcna-prep-app/security/advisories/new)
- **Email:** [fisayo.animashaun@outlook.com](mailto:fisayo.animashaun@outlook.com) with `[KCNA Prep – security]` in the subject.

Include reproduction steps and what you'd expect a fix to look like, if you have a view.

## What to expect

I run this in my spare time, so cadence is best-effort:

- **Acknowledgement:** within 5 business days.
- **Initial assessment** (in scope or not, severity): within 10 business days.
- **Fix or mitigation:** depends on severity. Critical issues that expose user data → I aim for under a week. Lower-severity issues batch into normal releases.
- **Public disclosure:** after a fix is deployed to the live site. I'll credit you in the published advisory if you'd like.

## A note on forks

If you're running a fork, the same threat model applies to your deployment. The in-app **Open GitHub issue** button auto-targets your repo (via `VITE_ISSUES_REPO`), so flags from your users land with you, not me. Update this `SECURITY.md` to point at your fork's advisory URL so reports reach you, not the upstream repo.
