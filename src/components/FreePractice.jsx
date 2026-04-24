import { useState, useEffect } from 'react';
import { Check, X, ChevronRight, Shuffle } from 'lucide-react';
import Card from './Card';
import Filters from './Filters';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
import { shuffleArray } from '../utils/helpers';
import config from '../data/config.json';
import QUESTIONS from '../data/questions.json';

const DOMAINS = config.domains;

export default function FreePractice({ progress, updateQuestion }) {
  const [domainFilter, setDomainFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let filtered = QUESTIONS;
    if (domainFilter !== 'all') filtered = filtered.filter(q => q.d === domainFilter);
    if (sourceFilter !== 'all') filtered = filtered.filter(q => q.src === sourceFilter);
    if (onlyUnanswered) filtered = filtered.filter(q => !progress.q[q.id]);
    if (onlyWrong) filtered = filtered.filter(q => progress.q[q.id] && !progress.q[q.id].correct);
    setDeck(filtered);
    setIdx(0);
    setSelected(null);
    setSubmitted(false);
  }, [domainFilter, sourceFilter, onlyUnanswered, onlyWrong]);

  const current = deck[idx];

  const submit = () => {
    if (selected === null || !current) return;
    const isCorrect = selected === current.correct;
    updateQuestion(current.id, {
      correct: isCorrect,
      attempts: (progress.q[current.id]?.attempts || 0) + 1,
      last: Date.now(),
    });
    setSubmitted(true);
  };

  const next = () => {
    if (idx + 1 < deck.length) {
      setIdx(idx + 1);
    } else {
      setIdx(0);
    }
    setSelected(null);
    setSubmitted(false);
  };

  const shuffle = () => {
    setDeck(shuffleArray(deck));
    setIdx(0);
    setSelected(null);
    setSubmitted(false);
  };

  if (deck.length === 0) {
    return (
      <div>
        <Filters
          domainFilter={domainFilter} setDomainFilter={setDomainFilter}
          sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
          onlyUnanswered={onlyUnanswered} setOnlyUnanswered={setOnlyUnanswered}
          onlyWrong={onlyWrong} setOnlyWrong={setOnlyWrong}
        />
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontFamily: fontHead, fontSize: 22, fontWeight: 500, color: T.textMuted }}>
            No questions match these filters.
          </div>
          <div style={{ fontSize: 13, color: T.textDim, marginTop: 8 }}>
            Try "All domains" / "All sources", or clear the unanswered/wrong toggles.
          </div>
        </Card>
      </div>
    );
  }

  const dom = DOMAINS[current.d];
  const priorStatus = progress.q[current.id];

  return (
    <div>
      <Filters
        domainFilter={domainFilter} setDomainFilter={setDomainFilter}
        sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
        onlyUnanswered={onlyUnanswered} setOnlyUnanswered={setOnlyUnanswered}
        onlyWrong={onlyWrong} setOnlyWrong={setOnlyWrong}
      />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div style={{ fontFamily: fontMono, fontSize: 12, color: T.textMuted, letterSpacing: '0.1em' }}>
          {idx + 1} / {deck.length} &nbsp;·&nbsp;{' '}
          <span style={{ color: dom.tone }}>{dom.short.toUpperCase()}</span>
          <span style={{ color: T.textDim, marginLeft: 8 }}>· {current.src}</span>
          {priorStatus && (
            <span style={{ color: priorStatus.correct ? T.correct : T.wrong, marginLeft: 10 }}>
              · previously {priorStatus.correct ? 'correct' : 'wrong'}
            </span>
          )}
        </div>
        <button
          onClick={shuffle}
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Shuffle size={12} /> Shuffle
        </button>
      </div>

      <Card style={{ padding: 28 }}>
        <div style={{
          fontFamily: fontHead, fontSize: 21, fontWeight: 500, lineHeight: 1.4,
          marginBottom: 24, letterSpacing: '-0.005em',
        }}>
          {current.q}
        </div>

        <div className="flex flex-col gap-2">
          {current.opts.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = submitted && i === current.correct;
            const isWrong = submitted && isSelected && i !== current.correct;
            let bg = T.bgRaised;
            let border = T.border;
            if (submitted) {
              if (isCorrect) { bg = 'rgba(156, 175, 136, 0.1)'; border = T.correct; }
              else if (isWrong) { bg = 'rgba(201, 104, 104, 0.1)'; border = T.wrong; }
            } else if (isSelected) {
              bg = 'rgba(122, 184, 178, 0.1)';
              border = T.primary;
            }

            return (
              <button
                key={i}
                onClick={() => !submitted && setSelected(i)}
                disabled={submitted}
                style={{
                  padding: '14px 16px',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 2,
                  color: T.text,
                  textAlign: 'left',
                  cursor: submitted ? 'default' : 'pointer',
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
                  fontFamily: fontMono,
                  fontSize: 11,
                  color: isCorrect ? T.correct : isWrong ? T.wrong : T.textDim,
                  fontWeight: 600,
                  marginTop: 2,
                  minWidth: 16,
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
                {isCorrect && <Check size={16} style={{ color: T.correct, marginTop: 2 }} />}
                {isWrong && <X size={16} style={{ color: T.wrong, marginTop: 2 }} />}
              </button>
            );
          })}
        </div>

        {submitted && (
          <div
            className="anim-in"
            style={{
              marginTop: 20,
              padding: 16,
              background: T.bgRaised,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${selected === current.correct ? T.correct : T.wrong}`,
              borderRadius: 2,
            }}
          >
            <div style={{
              fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: selected === current.correct ? T.correct : T.wrong, marginBottom: 8,
            }}>
              {selected === current.correct ? 'Correct' : 'Not quite'}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: T.text }}>
              {current.expl}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          {!submitted ? (
            <button
              onClick={submit}
              disabled={selected === null}
              style={{
                padding: '10px 20px',
                background: selected === null ? T.border : T.primary,
                color: selected === null ? T.textDim : T.bg,
                border: 'none',
                borderRadius: 2,
                cursor: selected === null ? 'not-allowed' : 'pointer',
                fontFamily: fontBody,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              Submit
            </button>
          ) : (
            <button
              onClick={next}
              style={{
                padding: '10px 20px',
                background: T.primary,
                color: T.bg,
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: fontBody,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {idx + 1 < deck.length ? 'Next' : 'Restart deck'} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
