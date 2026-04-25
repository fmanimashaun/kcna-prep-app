import { Check, X as XIcon } from 'lucide-react';
import Card from './Card';
import Modal from './Modal';
import RelatedConcepts from './RelatedConcepts';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
import config from '../data/config.json';

const DOMAINS = config.domains;

// Read-only review of a single previously-answered question.
// Used by Dashboard's "Recent answers" list so a question can be revisited
// at any time without restarting practice.
export default function QuestionReviewModal({ question, status, onClose }) {
  const dom = question ? DOMAINS[question.d] : null;

  // status: { correct, attempts, last } from progress.q[id]
  // We don't know which option was picked (per-question stats only track right/wrong),
  // so the review highlights only the correct option and notes whether the user
  // got it right last time.
  const lastWasCorrect = status?.correct;

  return (
    <Modal open={!!question} onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <Card style={{ padding: 28, borderRadius: 12 }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{
                fontFamily: fontMono, fontSize: 10, color: T.textDim,
                letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                {question.id}
              </span>
              {dom && (
                <span style={{
                  fontFamily: fontMono, fontSize: 10, color: dom.tone,
                  letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                }}>
                  · {dom.short}
                </span>
              )}
              {status && (
                <span style={{
                  fontFamily: fontMono, fontSize: 10,
                  color: lastWasCorrect ? T.correct : T.wrong,
                  letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                }}>
                  · last attempt: {lastWasCorrect ? 'correct' : 'wrong'}
                </span>
              )}
              {status?.attempts > 0 && (
                <span style={{
                  fontFamily: fontMono, fontSize: 10, color: T.textDim,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                }}>
                  · {status.attempts} attempt{status.attempts === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: T.textMuted,
                cursor: 'pointer', padding: 4,
              }}
            >
              <XIcon size={18} />
            </button>
          </div>

          <div style={{
            fontFamily: fontHead, fontSize: 21, fontWeight: 500, lineHeight: 1.4,
            marginBottom: 22, letterSpacing: '-0.005em',
          }}>
            {question.q}
          </div>

          <div className="flex flex-col gap-2">
            {question.opts.map((opt, i) => {
              const isCorrect = i === question.correct;
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    background: isCorrect ? 'rgba(156, 175, 136, 0.1)' : T.bgRaised,
                    border: `1px solid ${isCorrect ? T.correct : T.border}`,
                    borderRadius: 2,
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}
                >
                  <span style={{
                    fontFamily: fontMono, fontSize: 11,
                    color: isCorrect ? T.correct : T.textDim,
                    fontWeight: 600, marginTop: 2, minWidth: 16,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1, color: T.text, fontSize: 14, lineHeight: 1.5 }}>{opt}</span>
                  {isCorrect && <Check size={16} style={{ color: T.correct, marginTop: 2 }} />}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              background: T.bgRaised,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${T.primary}`,
              borderRadius: 2,
            }}
          >
            <div style={{
              fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: T.textDim, marginBottom: 8, fontWeight: 600,
            }}>
              Explanation
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: T.text }}>
              {question.expl}
            </div>
          </div>

          <RelatedConcepts question={question} />

          <div className="flex justify-end mt-5">
            <button
              onClick={onClose}
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
              Close
            </button>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
