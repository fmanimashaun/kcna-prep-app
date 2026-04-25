import { useMemo, useState } from 'react';
import { RotateCcw, TrendingDown, Clock, Flag, Copy, Check } from 'lucide-react';
import Section from './Section';
import Card from './Card';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
import { daysUntilExam } from '../utils/helpers';
import config from '../data/config.json';
import QUESTIONS from '../data/questions.json';
import FLASHCARDS from '../data/flashcards.json';

const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

const DOMAINS = config.domains;
const PASS_MARK = config.passMark;

function formatRunDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDurationShort(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

const MIN_ANSWERS_FOR_WEAK_AREAS = 20;

export default function Dashboard({ progress, onReset, user }) {
  const days = daysUntilExam();
  const runs = progress.runs || [];

  const stats = useMemo(() => {
    const byDomain = {};
    Object.keys(DOMAINS).forEach(d => {
      const qs = QUESTIONS.filter(q => q.d === d);
      const fs = FLASHCARDS.filter(f => f.d === d);
      const answered = qs.filter(q => progress.q[q.id]);
      const correct = answered.filter(q => progress.q[q.id].correct);
      const known = fs.filter(f => progress.f[f.id]?.status === 'known');
      byDomain[d] = {
        total: qs.length,
        answered: answered.length,
        correct: correct.length,
        flashTotal: fs.length,
        flashKnown: known.length,
      };
    });
    const totalAnswered = Object.values(byDomain).reduce((s, d) => s + d.answered, 0);
    const totalCorrect  = Object.values(byDomain).reduce((s, d) => s + d.correct, 0);
    const totalFlashKnown = Object.values(byDomain).reduce((s, d) => s + d.flashKnown, 0);
    return { byDomain, totalAnswered, totalCorrect, totalFlashKnown };
  }, [progress]);

  const overallAcc = stats.totalAnswered
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;

  return (
    <div className="anim-in">
      <Section subtitle="Where you stand" title="Snapshot">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Card>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: T.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Questions attempted
            </div>
            <div style={{ fontFamily: fontHead, fontSize: 40, fontWeight: 600, color: T.text, lineHeight: 1.1, marginTop: 8 }}>
              {stats.totalAnswered}
              <span style={{ color: T.textDim, fontSize: 22, fontWeight: 400 }}> / {QUESTIONS.length}</span>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: T.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Overall accuracy
            </div>
            <div style={{
              fontFamily: fontHead, fontSize: 40, fontWeight: 600,
              color: overallAcc >= PASS_MARK ? T.correct : overallAcc >= 50 ? T.accent : T.text,
              lineHeight: 1.1, marginTop: 8,
            }}>
              {overallAcc}<span style={{ fontSize: 24, color: T.textDim }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, fontFamily: fontMono }}>
              pass mark: {PASS_MARK}%
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: T.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Cards marked known
            </div>
            <div style={{ fontFamily: fontHead, fontSize: 40, fontWeight: 600, color: T.text, lineHeight: 1.1, marginTop: 8 }}>
              {stats.totalFlashKnown}
              <span style={{ color: T.textDim, fontSize: 22, fontWeight: 400 }}> / {FLASHCARDS.length}</span>
            </div>
          </Card>
        </div>
      </Section>

      {runs.length > 0 && (
        <Section subtitle="Timed simulations" title="Exam run history">
          <div className="flex flex-col gap-2">
            {[...runs].reverse().slice(0, 12).map((r, i) => {
              const pct = Math.round((r.score / r.total) * 100);
              const color = pct >= PASS_MARK ? T.correct : pct >= 50 ? T.accent : T.wrong;
              return (
                <div
                  key={`${r.setId}-${r.finishedAt}-${i}`}
                  style={{
                    background: T.bgCard, border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${color}`,
                    padding: 14, borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, flexWrap: 'wrap',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{ color: T.textMuted }} strokeWidth={1.8} />
                    <div>
                      <div style={{ fontFamily: fontHead, fontSize: 15, fontWeight: 500 }}>
                        {r.setName}
                      </div>
                      <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim, letterSpacing: '0.05em' }}>
                        {formatRunDate(r.finishedAt)} · {formatDurationShort(r.durationMs)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontFamily: fontHead, fontSize: 22, fontWeight: 600, color, lineHeight: 1 }}>
                      {pct}%
                    </div>
                    <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim }}>
                      {r.score}/{r.total}
                    </div>
                  </div>
                </div>
              );
            })}
            {runs.length > 12 && (
              <div style={{
                textAlign: 'center', fontSize: 11, color: T.textDim,
                fontFamily: fontMono, letterSpacing: '0.1em', marginTop: 6,
              }}>
                SHOWING 12 MOST RECENT OF {runs.length}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section subtitle="Domain by domain" title="Accuracy by exam weight">
        <div className="flex flex-col gap-3">
          {Object.entries(DOMAINS).map(([key, dom]) => {
            const s = stats.byDomain[key];
            const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : null;
            return (
              <div key={key} style={{
                background: T.bgCard, border: `1px solid ${T.border}`, padding: 16, borderRadius: 2,
              }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 8, height: 36, background: dom.tone, borderRadius: 1 }}></div>
                    <div>
                      <div style={{ fontFamily: fontHead, fontSize: 17, fontWeight: 500 }}>{dom.name}</div>
                      <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim, letterSpacing: '0.1em' }}>
                        {dom.weight}% OF EXAM · {s.total} QUESTIONS · {s.flashTotal} CARDS
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {acc !== null ? (
                      <>
                        <div style={{
                          fontFamily: fontHead, fontSize: 24, fontWeight: 600,
                          color: acc >= PASS_MARK ? T.correct : acc >= 50 ? T.accent : T.wrong, lineHeight: 1,
                        }}>
                          {acc}%
                        </div>
                        <div style={{ fontSize: 11, color: T.textDim, fontFamily: fontMono }}>
                          {s.correct}/{s.answered} correct
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: T.textDim, fontStyle: 'italic' }}>Not started</div>
                    )}
                  </div>
                </div>
                <div style={{ height: 3, background: T.border, marginTop: 12, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(s.answered / s.total) * 100}%`, height: '100%',
                    background: dom.tone, transition: 'width 0.3s',
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section subtitle="The final stretch" title="Strategy">
        <Card>
          <ol style={{ fontSize: 14, lineHeight: 1.7, color: T.text, paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Days {days} to {Math.max(1, days - 1)}:</strong> Run the full deck of 410 questions.
              Don't grind — read explanations carefully. Note which domains fall below 75%.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Midweek:</strong> Flashcard sweep. Focus on Kubernetes Fundamentals (46% of exam)
              and the CNCF Landscape — that grid of "which project does what" is where most people lose points.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Day -2:</strong> Re-do weak domains. Use "Only previously wrong" to burn down
              your mistakes. Observability + Delivery (16% combined) are high-yield because the concepts are small.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Day before:</strong> Light review only. No cramming. Review the Landscape grid
              once, eat well, sleep properly. 60 questions, 90 minutes — time is not the issue if you know the material.
            </li>
            <li>
              <strong style={{ color: T.primary }}>Exam day:</strong> Read every option. KCNA trades on subtle distinctions
              (DaemonSet vs Deployment, ClusterIP vs NodePort, HPA vs VPA vs CA). Flag uncertain ones and come back.
            </li>
          </ol>
        </Card>
      </Section>

      <Section subtitle="Weak areas" title="Where to spend your next study hour">
        {stats.totalAnswered < MIN_ANSWERS_FOR_WEAK_AREAS ? (
          <Card style={{ padding: 24, textAlign: 'center' }}>
            <div style={{
              fontFamily: fontHead, fontSize: 17, fontWeight: 500, color: T.textMuted, marginBottom: 6,
            }}>
              Answer {MIN_ANSWERS_FOR_WEAK_AREAS - stats.totalAnswered} more
              question{MIN_ANSWERS_FOR_WEAK_AREAS - stats.totalAnswered === 1 ? '' : 's'} to unlock this.
            </div>
            <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.55 }}>
              This card surfaces your three lowest-accuracy domains based on actual quiz results — not generic advice.
            </div>
          </Card>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {Object.entries(stats.byDomain)
              .filter(([, s]) => s.answered >= 5)
              .map(([key, s]) => ({ key, s, acc: (s.correct / s.answered) * 100 }))
              .sort((a, b) => a.acc - b.acc)
              .slice(0, 3)
              .map(({ key, s, acc }) => {
                const dom = DOMAINS[key];
                const accRounded = Math.round(acc);
                const color = acc >= PASS_MARK ? T.correct : acc >= 50 ? T.accent : T.wrong;
                return (
                  <Card key={key} style={{ padding: 16, borderLeft: `3px solid ${color}` }}>
                    <div className="flex items-start gap-3">
                      <TrendingDown size={18} style={{ color, marginTop: 2, flexShrink: 0 }} strokeWidth={1.8} />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: fontMono, fontSize: 10, color: dom.tone,
                          letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4,
                        }}>
                          {dom.short} · {dom.weight}% of exam
                        </div>
                        <div style={{ fontFamily: fontHead, fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                          {dom.name}
                        </div>
                        <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>
                          <span style={{ color, fontWeight: 600 }}>{accRounded}%</span>
                          {' '}accuracy on {s.correct} / {s.answered} answered.
                          {' '}Revisit the concepts for this domain and redo wrong ones in free practice.
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </Section>

      <FlaggedSection flags={progress.flags} />

      <div className="flex justify-center mt-8" style={{ marginBottom: 16 }}>
        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: T.textDim,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontMono,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RotateCcw size={12} /> Reset all progress
        </button>
      </div>
    </div>
  );
}

function FlaggedSection({ flags }) {
  const [copied, setCopied] = useState(false);

  const entries = useMemo(() => {
    if (!flags) return [];
    return Object.entries(flags)
      .map(([id, f]) => ({ id, reason: f.reason || '', at: f.at || 0, q: QUESTION_BY_ID[id] }))
      .sort((a, b) => b.at - a.at);
  }, [flags]);

  if (entries.length === 0) return null;

  const copyToClipboard = async () => {
    const text = entries.map(e => {
      const correctOpt = e.q ? e.q.opts[e.q.correct] : '?';
      return [
        `## ${e.id}  [${e.q?.d || '?'} / ${e.q?.src || '?'}]`,
        `Q: ${e.q?.q || '(question not found)'}`,
        e.q ? e.q.opts.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}${i === e.q.correct ? '  <-- marked correct' : ''}`).join('\n') : '',
        `Currently marked correct: ${correctOpt}`,
        `Flag reason: ${e.reason || '(no reason)'}`,
      ].join('\n');
    }).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Section
      subtitle="Questions you flagged"
      title={`Flagged for review (${entries.length})`}
    >
      <div className="flex justify-end mb-3">
        <button
          onClick={copyToClipboard}
          style={{
            padding: '6px 12px',
            background: copied ? T.correct : 'transparent',
            color: copied ? T.bg : T.textMuted,
            border: `1px solid ${copied ? T.correct : T.border}`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontMono,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy all (for review)'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {entries.map(e => {
          const dom = e.q?.d ? DOMAINS[e.q.d] : null;
          return (
            <Card
              key={e.id}
              style={{
                padding: 14,
                borderLeft: `3px solid ${T.accent}`,
              }}
            >
              <div className="flex items-start gap-3">
                <Flag size={14} fill={T.accent} style={{ color: T.accent, marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{
                      fontFamily: fontMono, fontSize: 10, color: T.textDim,
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>
                      {e.id}
                    </span>
                    {dom && (
                      <span style={{
                        fontFamily: fontMono, fontSize: 10, color: dom.tone,
                        letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                      }}>
                        · {dom.short}
                      </span>
                    )}
                  </div>
                  {e.q ? (
                    <div style={{ fontFamily: fontHead, fontSize: 14, fontWeight: 500, color: T.text, lineHeight: 1.4, marginBottom: 6 }}>
                      {e.q.q}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.textDim, fontStyle: 'italic', marginBottom: 6 }}>
                      (Question {e.id} no longer in the bank — may have been removed)
                    </div>
                  )}
                  <div style={{
                    fontSize: 12, color: T.textMuted, lineHeight: 1.55,
                    background: T.bgRaised, padding: '6px 10px', borderRadius: 2,
                    border: `1px solid ${T.border}`, fontFamily: fontBody,
                  }}>
                    <strong style={{ color: T.accent, fontFamily: fontMono, fontSize: 10, letterSpacing: '0.1em' }}>FLAG: </strong>
                    {e.reason || <em style={{ color: T.textDim }}>(no reason given)</em>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
