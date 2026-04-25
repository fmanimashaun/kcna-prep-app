import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Play, Check, X, Flag, ChevronLeft, ChevronRight, Shuffle, AlertTriangle } from 'lucide-react';
import Card from './Card';
import RelatedConcepts from './RelatedConcepts';
import FlagButton from './FlagButton';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
import { shuffleArray } from '../utils/helpers';
import config from '../data/config.json';
import QUESTIONS from '../data/questions.json';
import EXAM_SETS from '../data/exam-sets.json';

const DOMAINS = config.domains;
const PASS_MARK = config.passMark;
const EXAM_DURATION_MS = config.examDurationMinutes * 60 * 1000;

const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatShortDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ---------- Picker ----------
function SetPicker({ onStart, runs }) {
  const bestBySet = useMemo(() => {
    const best = {};
    for (const r of runs || []) {
      const pct = Math.round((r.score / r.total) * 100);
      if (!best[r.setId] || pct > best[r.setId].pct) {
        best[r.setId] = { pct, at: r.finishedAt };
      }
    }
    return best;
  }, [runs]);

  return (
    <div>
      <Card style={{ padding: 20, marginBottom: 20, background: T.bgRaised }}>
        <div className="flex items-start gap-3">
          <Clock size={18} style={{ color: T.primary, marginTop: 2, flexShrink: 0 }} strokeWidth={1.8} />
          <div>
            <div style={{ fontFamily: fontHead, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Timed exam simulation
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55 }}>
              Each set mirrors the real KCNA format: {config.examQuestionCount} questions, {config.examDurationMinutes} minutes,
              no feedback until you submit. The 410 questions are partitioned across 7 sets — retake the same set any time
              to compare scores. Shuffle is on by default.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {EXAM_SETS.sets.map(set => {
          const best = bestBySet[set.id];
          return (
            <Card key={set.id} style={{ padding: 18 }}>
              <div className="flex items-center justify-between mb-3">
                <div style={{
                  fontFamily: fontMono, fontSize: 11, color: T.textDim,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                }}>
                  {set.id}
                </div>
                {best && (
                  <div style={{
                    fontFamily: fontMono, fontSize: 11, fontWeight: 600,
                    color: best.pct >= PASS_MARK ? T.correct : best.pct >= 50 ? T.accent : T.wrong,
                  }}>
                    BEST {best.pct}%
                  </div>
                )}
              </div>
              <div style={{ fontFamily: fontHead, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
                {set.name}
              </div>
              <div style={{ fontSize: 12, color: T.textDim, fontFamily: fontMono, marginBottom: 16 }}>
                {set.size} questions · {config.examDurationMinutes} min
              </div>
              <button
                onClick={() => onStart(set.id)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: T.primary,
                  color: T.bg,
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: fontBody,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Play size={13} /> {best ? 'Retake' : 'Start'}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Active exam ----------
function ActiveExam({ set, questions, onFinish, onAbort }) {
  const startedAtRef = useRef(Date.now());
  const endsAt = startedAtRef.current + EXAM_DURATION_MS;

  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(EXAM_DURATION_MS);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const left = endsAt - Date.now();
      setRemaining(left);
      if (left <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        finish();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = questions[idx];

  const finish = () => {
    const finishedAt = Date.now();
    const durationMs = finishedAt - startedAtRef.current;

    let score = 0;
    const byDomain = {};
    const recordedAnswers = {};

    for (const q of questions) {
      const ans = answers[q.id];
      const isCorrect = ans !== undefined && ans === q.correct;
      if (isCorrect) score += 1;
      recordedAnswers[q.id] = { picked: ans ?? null, correct: isCorrect };
      const d = q.d;
      if (!byDomain[d]) byDomain[d] = { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (isCorrect) byDomain[d].correct += 1;
    }

    onFinish({
      setId: set.id,
      setName: set.name,
      startedAt: startedAtRef.current,
      finishedAt,
      durationMs,
      score,
      total: questions.length,
      byDomain,
      answers: recordedAnswers,
    });
  };

  const pick = (opt) => {
    setAnswers(a => ({ ...a, [current.id]: opt }));
  };
  const toggleFlag = () => {
    setFlagged(f => ({ ...f, [current.id]: !f[current.id] }));
  };

  const answeredCount = Object.keys(answers).length;
  const lowTime = remaining < 5 * 60 * 1000;
  const dom = DOMAINS[current.d];

  return (
    <div>
      {/* Exam bar */}
      <div style={{
        background: T.bgRaised,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        padding: '12px 16px',
        marginBottom: 16,
      }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div style={{ fontFamily: fontMono, fontSize: 12, color: T.textMuted, letterSpacing: '0.1em' }}>
            {set.name.toUpperCase()} · {idx + 1} / {questions.length} · {answeredCount} ANSWERED
          </div>
          <div className="flex items-center gap-3">
            <div style={{
              fontFamily: fontMono,
              fontSize: 18,
              fontWeight: 700,
              color: lowTime ? T.wrong : T.text,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Clock size={14} /> {formatDuration(remaining)}
            </div>
            <button
              onClick={() => setShowSubmitConfirm(true)}
              style={{
                padding: '6px 14px',
                background: T.accent,
                color: T.bg,
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: fontMono,
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Question nav strip */}
      <div
        className="flex flex-wrap gap-1 mb-4"
        style={{ maxHeight: 72, overflowY: 'auto' }}
      >
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined;
          const isFlag = flagged[q.id];
          const isCurrent = i === idx;
          let bg = 'transparent';
          let color = T.textDim;
          let border = T.border;
          if (answered) { bg = T.primaryDim; color = T.text; border = T.primaryDim; }
          if (isFlag) { border = T.accent; }
          if (isCurrent) { border = T.text; color = T.text; }
          return (
            <button
              key={q.id}
              onClick={() => setIdx(i)}
              style={{
                width: 28, height: 28,
                background: bg,
                color,
                border: `1px solid ${border}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: fontMono,
                fontSize: 10,
                fontWeight: 600,
                position: 'relative',
              }}
            >
              {i + 1}
              {isFlag && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 6, height: 6, background: T.accent, borderRadius: '50%',
                }} />
              )}
            </button>
          );
        })}
      </div>

      <Card style={{ padding: 28 }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontFamily: fontMono, fontSize: 11, color: dom.tone, letterSpacing: '0.1em' }}>
            {dom.short.toUpperCase()}
          </div>
          <button
            onClick={toggleFlag}
            style={{
              padding: '5px 10px',
              background: flagged[current.id] ? T.accent : 'transparent',
              color: flagged[current.id] ? T.bg : T.textMuted,
              border: `1px solid ${flagged[current.id] ? T.accent : T.border}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontMono,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Flag size={11} /> {flagged[current.id] ? 'Flagged' : 'Flag'}
          </button>
        </div>

        <div style={{
          fontFamily: fontHead, fontSize: 21, fontWeight: 500, lineHeight: 1.4,
          marginBottom: 24, letterSpacing: '-0.005em',
        }}>
          {current.q}
        </div>

        <div className="flex flex-col gap-2">
          {current.opts.map((opt, i) => {
            const isSelected = answers[current.id] === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                style={{
                  padding: '14px 16px',
                  background: isSelected ? 'rgba(122, 184, 178, 0.1)' : T.bgRaised,
                  border: `1px solid ${isSelected ? T.primary : T.border}`,
                  borderRadius: 2,
                  color: T.text,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: fontBody,
                  fontSize: 14,
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  fontFamily: fontMono, fontSize: 11,
                  color: isSelected ? T.primary : T.textDim,
                  fontWeight: 600, marginTop: 2, minWidth: 16,
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between gap-2 mt-5">
          <button
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: idx === 0 ? T.textDim : T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 2,
              cursor: idx === 0 ? 'not-allowed' : 'pointer',
              fontFamily: fontBody,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => setIdx(Math.min(questions.length - 1, idx + 1))}
            disabled={idx === questions.length - 1}
            style={{
              padding: '10px 16px',
              background: idx === questions.length - 1 ? T.border : T.primary,
              color: idx === questions.length - 1 ? T.textDim : T.bg,
              border: 'none',
              borderRadius: 2,
              cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer',
              fontFamily: fontBody,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </Card>

      <div className="flex justify-center mt-4">
        <button
          onClick={onAbort}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: T.textDim,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontMono,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Abandon exam
        </button>
      </div>

      {showSubmitConfirm && (
        <div
          onClick={() => setShowSubmitConfirm(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.bgCard, border: `1px solid ${T.border}`,
              borderRadius: 2, padding: 24, maxWidth: 420, width: '100%',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle size={20} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: fontHead, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                  Submit exam?
                </div>
                <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55 }}>
                  {answeredCount} of {questions.length} answered
                  {answeredCount < questions.length && ` — ${questions.length - answeredCount} left blank will be marked wrong`}.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  color: T.textMuted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: fontBody,
                  fontSize: 13,
                }}
              >
                Keep going
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); finish(); }}
                style={{
                  padding: '8px 14px',
                  background: T.primary,
                  color: T.bg,
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: fontBody,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Submit now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Results ----------
function ResultsView({ run, questions, onRetake, onBackToPicker, flags, onFlag, onUnflag }) {
  const [review, setReview] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  const pct = Math.round((run.score / run.total) * 100);
  const passed = pct >= PASS_MARK;
  const scoreColor = passed ? T.correct : pct >= 50 ? T.accent : T.wrong;

  if (review) {
    const q = questions[reviewIdx];
    const ans = run.answers[q.id];
    const dom = DOMAINS[q.d];
    return (
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div style={{ fontFamily: fontMono, fontSize: 12, color: T.textMuted, letterSpacing: '0.1em' }}>
            REVIEW · {reviewIdx + 1} / {questions.length} ·{' '}
            <span style={{ color: dom.tone }}>{dom.short.toUpperCase()}</span>
            <span style={{
              color: ans.correct ? T.correct : T.wrong, marginLeft: 10,
            }}>
              · {ans.correct ? 'correct' : ans.picked === null ? 'blank' : 'wrong'}
            </span>
          </div>
          <button
            onClick={() => setReview(false)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontMono,
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Back to results
          </button>
        </div>

        <Card style={{ padding: 28 }}>
          <div style={{
            fontFamily: fontHead, fontSize: 21, fontWeight: 500, lineHeight: 1.4,
            marginBottom: 24, letterSpacing: '-0.005em',
          }}>
            {q.q}
          </div>

          <div className="flex flex-col gap-2">
            {q.opts.map((opt, i) => {
              const isRight = i === q.correct;
              const isPick = i === ans.picked;
              let bg = T.bgRaised;
              let border = T.border;
              if (isRight) { bg = 'rgba(156, 175, 136, 0.1)'; border = T.correct; }
              else if (isPick) { bg = 'rgba(201, 104, 104, 0.1)'; border = T.wrong; }
              return (
                <div key={i} style={{
                  padding: '14px 16px', background: bg, border: `1px solid ${border}`,
                  borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <span style={{
                    fontFamily: fontMono, fontSize: 11,
                    color: isRight ? T.correct : isPick ? T.wrong : T.textDim,
                    fontWeight: 600, marginTop: 2, minWidth: 16,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1, color: T.text, fontSize: 14, lineHeight: 1.5 }}>{opt}</span>
                  {isRight && <Check size={16} style={{ color: T.correct, marginTop: 2 }} />}
                  {isPick && !isRight && <X size={16} style={{ color: T.wrong, marginTop: 2 }} />}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 20, padding: 16, background: T.bgRaised,
            border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${ans.correct ? T.correct : T.wrong}`,
            borderRadius: 2,
          }}>
            <div style={{
              fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: T.textDim, marginBottom: 8,
            }}>
              Explanation
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: T.text }}>
              {q.expl}
            </div>
            <FlagButton
              flag={flags?.[q.id]}
              onFlag={(reason) => onFlag(q.id, reason)}
              onUnflag={() => onUnflag(q.id)}
            />
            <RelatedConcepts question={q} />
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={() => setReviewIdx(Math.max(0, reviewIdx - 1))}
              disabled={reviewIdx === 0}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: reviewIdx === 0 ? T.textDim : T.textMuted,
                border: `1px solid ${T.border}`,
                borderRadius: 2,
                cursor: reviewIdx === 0 ? 'not-allowed' : 'pointer',
                fontFamily: fontBody, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setReviewIdx(Math.min(questions.length - 1, reviewIdx + 1))}
              disabled={reviewIdx === questions.length - 1}
              style={{
                padding: '10px 16px',
                background: reviewIdx === questions.length - 1 ? T.border : T.primary,
                color: reviewIdx === questions.length - 1 ? T.textDim : T.bg,
                border: 'none', borderRadius: 2,
                cursor: reviewIdx === questions.length - 1 ? 'not-allowed' : 'pointer',
                fontFamily: fontBody, fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          fontFamily: fontMono, fontSize: 11, letterSpacing: '0.2em',
          color: T.textDim, textTransform: 'uppercase', marginBottom: 10,
        }}>
          {run.setName} · {formatShortDate(run.finishedAt)}
        </div>
        <div style={{
          fontFamily: fontHead, fontSize: 72, fontWeight: 700,
          color: scoreColor, lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {pct}%
        </div>
        <div style={{
          fontFamily: fontMono, fontSize: 13, color: T.textMuted, marginTop: 8,
        }}>
          {run.score} / {run.total} correct · {formatDuration(run.durationMs)} elapsed
        </div>
        <div style={{
          fontFamily: fontMono, fontSize: 11, letterSpacing: '0.2em',
          color: passed ? T.correct : T.wrong, marginTop: 14, textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          {passed ? `✓ Above pass mark (${PASS_MARK}%)` : `Below pass mark (${PASS_MARK}%)`}
        </div>
      </Card>

      <div style={{
        fontFamily: fontMono, fontSize: 10, color: T.textDim,
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        By domain
      </div>
      <div className="flex flex-col gap-2 mb-6">
        {Object.entries(run.byDomain).map(([d, s]) => {
          const dp = Math.round((s.correct / s.total) * 100);
          const dom = DOMAINS[d];
          return (
            <div key={d} style={{
              background: T.bgCard, border: `1px solid ${T.border}`,
              padding: 14, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 4, height: 28, background: dom.tone, borderRadius: 1 }} />
                <div>
                  <div style={{ fontFamily: fontHead, fontSize: 15, fontWeight: 500 }}>{dom.name}</div>
                  <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim }}>
                    {s.correct} / {s.total}
                  </div>
                </div>
              </div>
              <div style={{
                fontFamily: fontHead, fontSize: 22, fontWeight: 600,
                color: dp >= PASS_MARK ? T.correct : dp >= 50 ? T.accent : T.wrong,
              }}>
                {dp}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setReview(true)}
          style={{
            padding: '10px 18px',
            background: T.bgRaised,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontBody,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Review answers
        </button>
        <button
          onClick={onRetake}
          style={{
            padding: '10px 18px',
            background: T.primary,
            color: T.bg,
            border: 'none',
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontBody,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Retake this set
        </button>
        <button
          onClick={onBackToPicker}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            color: T.textMuted,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontBody,
            fontSize: 13,
          }}
        >
          Back to sets
        </button>
      </div>
    </div>
  );
}

// ---------- Top-level ExamSets ----------
export default function ExamSets({ progress, addExamRun, updateQuestion, flagQuestion, unflagQuestion }) {
  // stage: 'picker' | 'active' | 'results'
  const [stage, setStage] = useState('picker');
  const [activeSet, setActiveSet] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [lastRun, setLastRun] = useState(null);

  const startSet = (setId) => {
    const set = EXAM_SETS.sets.find(s => s.id === setId);
    if (!set) return;
    const qs = set.questionIds.map(id => QUESTION_BY_ID[id]).filter(Boolean);
    setActiveSet(set);
    setActiveQuestions(shuffleArray(qs));
    setStage('active');
  };

  const handleFinish = (run) => {
    addExamRun(run);
    // Also fold correctness into per-question stats so Dashboard / "only wrong" stays coherent
    for (const q of activeQuestions) {
      const a = run.answers[q.id];
      if (a.picked === null) continue; // don't record blanks
      updateQuestion(q.id, {
        correct: a.correct,
        attempts: (progress.q[q.id]?.attempts || 0) + 1,
        last: run.finishedAt,
      });
    }
    setLastRun(run);
    setStage('results');
  };

  const handleAbort = () => {
    if (window.confirm('Abandon this exam? Your answers will be lost.')) {
      setActiveSet(null);
      setActiveQuestions([]);
      setStage('picker');
    }
  };

  const handleRetake = () => {
    if (!activeSet) return;
    const qs = activeSet.questionIds.map(id => QUESTION_BY_ID[id]).filter(Boolean);
    setActiveQuestions(shuffleArray(qs));
    setLastRun(null);
    setStage('active');
  };

  const backToPicker = () => {
    setActiveSet(null);
    setActiveQuestions([]);
    setLastRun(null);
    setStage('picker');
  };

  if (stage === 'active' && activeSet) {
    return (
      <ActiveExam
        set={activeSet}
        questions={activeQuestions}
        onFinish={handleFinish}
        onAbort={handleAbort}
      />
    );
  }

  if (stage === 'results' && lastRun) {
    return (
      <ResultsView
        run={lastRun}
        questions={activeQuestions}
        onRetake={handleRetake}
        onBackToPicker={backToPicker}
        flags={progress.flags}
        onFlag={flagQuestion}
        onUnflag={unflagQuestion}
      />
    );
  }

  return <SetPicker onStart={startSet} runs={progress.runs} />;
}
