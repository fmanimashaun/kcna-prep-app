// Deterministically partition src/data/questions.json into 7 exam sets.
// - Sets 1-6: 60 questions each, distributed proportionally across domains.
// - Set 7: remaining 50 questions.
// - Each question appears in exactly one set.
// Run: node scripts/generate-exam-sets.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const questions = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/questions.json'), 'utf8')
);

// Mulberry32 — tiny seeded PRNG for reproducible shuffles.
function seededRng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SEED = 20260429; // exam date, just a stable number
const FULL_SET_SIZE = 60;
// Build as many full 60-question sets as the pool supports, plus one
// trailing set for the remainder. This keeps sets roughly exam-sized
// as the question bank grows.
const FULL_SETS = Math.floor(questions.length / FULL_SET_SIZE);
const SET_COUNT = FULL_SETS + (questions.length % FULL_SET_SIZE === 0 ? 0 : 1);

// Group by domain
const byDomain = {};
for (const q of questions) {
  (byDomain[q.d] ||= []).push(q);
}

const rng = seededRng(SEED);
// Shuffle each domain once, reproducibly
for (const d of Object.keys(byDomain)) {
  byDomain[d] = shuffle(byDomain[d], rng);
}

// Proportional allocation for a 60-question set
const total = questions.length;
const perSetAlloc = {};
let allocated = 0;
const domains = Object.keys(byDomain);
for (const d of domains) {
  perSetAlloc[d] = Math.round((byDomain[d].length / total) * FULL_SET_SIZE);
  allocated += perSetAlloc[d];
}
// Fix rounding drift so allocation sums to exactly 60
while (allocated !== FULL_SET_SIZE) {
  const diff = FULL_SET_SIZE - allocated;
  // Adjust the largest-pool domain by 1
  const target = domains.reduce((a, b) => (byDomain[a].length > byDomain[b].length ? a : b));
  perSetAlloc[target] += diff > 0 ? 1 : -1;
  allocated += diff > 0 ? 1 : -1;
}

// Build sets 1-6 by draining the shuffled per-domain queues
const sets = [];
const cursors = Object.fromEntries(domains.map(d => [d, 0]));

for (let s = 0; s < FULL_SETS; s++) {
  const ids = [];
  for (const d of domains) {
    const take = perSetAlloc[d];
    const chunk = byDomain[d].slice(cursors[d], cursors[d] + take);
    cursors[d] += take;
    ids.push(...chunk.map(q => q.id));
  }
  // Shuffle the set itself so domains are interleaved, not grouped
  const shuffled = shuffle(ids, rng);
  sets.push({
    id: `set-${s + 1}`,
    name: `Exam Set ${s + 1}`,
    size: shuffled.length,
    questionIds: shuffled,
  });
}

// Set 7: everything remaining
const remainingIds = [];
for (const d of domains) {
  remainingIds.push(...byDomain[d].slice(cursors[d]).map(q => q.id));
}
const finalSet = shuffle(remainingIds, rng);
sets.push({
  id: `set-${SET_COUNT}`,
  name: `Exam Set ${SET_COUNT}`,
  size: finalSet.length,
  questionIds: finalSet,
});

// Sanity checks
const allIds = sets.flatMap(s => s.questionIds);
const uniqueIds = new Set(allIds);
if (allIds.length !== questions.length || uniqueIds.size !== questions.length) {
  throw new Error(
    `Partition invariant broken: ${allIds.length} slots, ${uniqueIds.size} unique, ${questions.length} source questions`
  );
}

const out = {
  generatedAt: new Date().toISOString(),
  seed: SEED,
  totalQuestions: questions.length,
  sets,
};

fs.writeFileSync(
  path.join(ROOT, 'src/data/exam-sets.json'),
  JSON.stringify(out, null, 2)
);

console.log(`Wrote ${sets.length} sets:`);
for (const s of sets) console.log(`  ${s.name} — ${s.size} questions`);
