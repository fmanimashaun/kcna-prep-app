// daysUntilExam(examDate)
// examDate: ISO string like "2026-04-29" or "2026-04-29T09:00:00".
// Returns null when no date is set, otherwise a non-negative integer.
export function daysUntilExam(examDate) {
  if (!examDate) return null;
  const target = new Date(examDate);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
