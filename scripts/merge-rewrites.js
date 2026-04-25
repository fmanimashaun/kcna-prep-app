// Merge the 8 agent rewrite outputs into questions.json.
// Each rewritten-N.json is an array of partial question objects (id + changed fields).
// We apply each as a shallow patch and validate that `correct` stays in range.
// Run: node scripts/merge-rewrites.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_PATH = path.join(ROOT, 'src/data/questions.json');

const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
const byId = new Map(questions.map(q => [q.id, q]));

const stats = { totalRewrites: 0, applied: 0, missing: 0, invalid: 0 };
const issues = [];

for (let i = 1; i <= 8; i++) {
  const file = path.join(ROOT, `scripts/audit/rewritten-${i}.json`);
  if (!fs.existsSync(file)) {
    console.log(`Skipping missing ${file}`);
    continue;
  }
  const rewrites = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`rewritten-${i}.json: ${rewrites.length} rewrites`);

  for (const r of rewrites) {
    stats.totalRewrites += 1;
    const q = byId.get(r.id);
    if (!q) {
      stats.missing += 1;
      issues.push(`${r.id}: not found in questions.json (already removed?)`);
      continue;
    }

    // Apply only the changed fields
    if (r.q !== undefined) q.q = r.q;
    if (r.opts !== undefined) q.opts = r.opts;
    if (r.correct !== undefined) q.correct = r.correct;
    if (r.expl !== undefined) q.expl = r.expl;
    if (r.d !== undefined) q.d = r.d;

    // Validate
    if (!Array.isArray(q.opts) || q.opts.length < 2) {
      stats.invalid += 1;
      issues.push(`${r.id}: opts is not a valid array (${q.opts?.length} items)`);
      continue;
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.opts.length) {
      stats.invalid += 1;
      issues.push(`${r.id}: correct index ${q.correct} out of range (opts=${q.opts.length})`);
      continue;
    }
    if (!q.q || !q.expl) {
      stats.invalid += 1;
      issues.push(`${r.id}: missing q or expl`);
      continue;
    }
    stats.applied += 1;
  }
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2));

console.log('\n=== MERGE COMPLETE ===');
console.log('Total rewrites considered:', stats.totalRewrites);
console.log('Applied:                 ', stats.applied);
console.log('Missing in questions.json:', stats.missing);
console.log('Invalid (skipped):       ', stats.invalid);
console.log('Final questions.json size:', questions.length);

if (issues.length > 0) {
  console.log('\n=== ISSUES ===');
  for (const i of issues.slice(0, 30)) console.log('  ', i);
  if (issues.length > 30) console.log(`  ...and ${issues.length - 30} more`);
}
