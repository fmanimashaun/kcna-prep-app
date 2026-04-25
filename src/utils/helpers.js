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

// Live countdown: days / hours / minutes remaining until the exam start.
// Returns null when no/invalid date is set.
// `expired` flips to true once the target moment has passed.
export function examCountdown(examDate) {
  if (!examDate) return null;
  const target = new Date(examDate);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target - new Date();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, ms: 0, expired: true };
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { days, hours, minutes, ms, expired: false };
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
