// Phase 1 of the audit fix: apply mechanical bulk fixes.
//   1. Strip the literal "nan" placeholder option (PDF import artifact)
//   2. Strip trailing page-number artifacts from explanations (e.g., " 143")
//   3. Apply domain retags from the audit report
//   4. Remove the questions flagged as off-syllabus
// Run: node scripts/apply-audit-bulk.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_PATH = path.join(ROOT, 'src/data/questions.json');
const REPORT_PATH = path.join(ROOT, 'scripts/audit/audit-report.json');

const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

// Build verdict map for quick lookup
const verdicts = new Map();
for (const v of report) verdicts.set(v.id, v);

// Track stats
const stats = {
  total: questions.length,
  nanStripped: 0,
  pageNumberStripped: 0,
  retagged: 0,
  removed: 0,
};

// 1 + 2: clean every question (regardless of verdict, since these artifacts
// can be detected mechanically and may have been missed by the auditors).
for (const q of questions) {
  // Strip literal "nan" / "" empty options (PDF import artifact)
  const before = q.opts.length;
  q.opts = q.opts.filter(o => {
    const t = (o || '').trim();
    return t !== '' && t.toLowerCase() !== 'nan';
  });
  if (q.opts.length < before) stats.nanStripped += 1;

  // Sanity-check: correct index is still in range
  if (q.correct >= q.opts.length) {
    console.warn(`! ${q.id}: correct index ${q.correct} out of range after stripping nan (opts=${q.opts.length})`);
  }

  // Strip trailing PDF page numbers from explanation
  // Matches " 143" or " 143." or " 1" at the very end (1-3 digits, optional period).
  const exBefore = q.expl;
  q.expl = q.expl.replace(/\s+\d{1,3}\.?\s*$/, '').trim();
  if (q.expl !== exBefore) stats.pageNumberStripped += 1;
}

// 3: apply retags
for (const q of questions) {
  const v = verdicts.get(q.id);
  if (v && v.verdict === 'retag' && v.newDomain && v.newDomain !== q.d) {
    q.d = v.newDomain;
    stats.retagged += 1;
  }
}

// 4: remove flagged questions
const beforeCount = questions.length;
const cleaned = questions.filter(q => {
  const v = verdicts.get(q.id);
  return !(v && v.verdict === 'remove');
});
stats.removed = beforeCount - cleaned.length;

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(cleaned, null, 2));

console.log('=== PHASE 1 BULK FIXES APPLIED ===');
console.log('Total before:        ', stats.total);
console.log('"nan" options stripped:', stats.nanStripped);
console.log('Page numbers stripped:', stats.pageNumberStripped);
console.log('Retagged:            ', stats.retagged);
console.log('Removed:             ', stats.removed);
console.log('Total after:         ', cleaned.length);
