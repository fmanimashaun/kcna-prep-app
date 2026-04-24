import { useState, useEffect } from 'react';
import { Check, X, Brain, Eye, EyeOff } from 'lucide-react';
import Card from './Card';
import { chipStyle, toggleStyle } from './Filters';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
import config from '../data/config.json';
import FLASHCARDS from '../data/flashcards.json';

const DOMAINS = config.domains;

function markBtn(color) {
  return {
    padding: '12px 14px',
    background: 'transparent',
    color,
    border: `1px solid ${color}`,
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: fontBody,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
}

export default function Flashcards({ progress, updateCard }) {
  const [domainFilter, setDomainFilter] = useState('all');
  const [showKnown, setShowKnown] = useState(false);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let filtered = FLASHCARDS;
    if (domainFilter !== 'all') filtered = filtered.filter(f => f.d === domainFilter);
    if (!showKnown) filtered = filtered.filter(f => progress.f[f.id]?.status !== 'known');
    setDeck(filtered);
    setIdx(0);
    setFlipped(false);
  }, [domainFilter, showKnown]);

  const current = deck[idx];

  const mark = (status) => {
    if (!current) return;
    updateCard(current.id, { status, last: Date.now() });
    setTimeout(() => {
      if (idx + 1 < deck.length) {
        setIdx(idx + 1);
      } else if (!showKnown && status === 'known') {
        setDeck(deck.filter((_, i) => i !== idx));
        setIdx(0);
      } else {
        setIdx(0);
      }
      setFlipped(false);
    }, 200);
  };

  const FilterBar = (
    <div className="flex flex-wrap gap-2 mb-4">
      <button onClick={() => setDomainFilter('all')} style={chipStyle(domainFilter === 'all', T.text)}>
        All
      </button>
      {Object.entries(DOMAINS).map(([k, d]) => (
        <button key={k} onClick={() => setDomainFilter(k)} style={chipStyle(domainFilter === k, d.tone)}>
          {d.short}
        </button>
      ))}
      <button onClick={() => setShowKnown(!showKnown)} style={toggleStyle(showKnown)}>
        {showKnown ? <Eye size={11} /> : <EyeOff size={11} />}{' '}
        {showKnown ? 'Including known' : 'Hiding known'}
      </button>
    </div>
  );

  if (deck.length === 0 || !current) {
    return (
      <div className="anim-in">
        {FilterBar}
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <Check size={36} style={{ color: T.correct, display: 'block', margin: '0 auto 12px' }} strokeWidth={1.5} />
          <div style={{ fontFamily: fontHead, fontSize: 22, fontWeight: 500 }}>
            All cards in this filter are marked known.
          </div>
          <div style={{ fontSize: 13, color: T.textDim, marginTop: 8 }}>
            Toggle "Including known" above to review them, or pick a different domain.
          </div>
        </Card>
      </div>
    );
  }

  const dom = DOMAINS[current.d];
  const status = progress.f[current.id]?.status;

  return (
    <div className="anim-in">
      {FilterBar}

      <div style={{
        fontFamily: fontMono, fontSize: 12, color: T.textMuted,
        letterSpacing: '0.1em', marginBottom: 12,
      }}>
        {idx + 1} / {deck.length} &nbsp;·&nbsp;{' '}
        <span style={{ color: dom.tone }}>{dom.short.toUpperCase()}</span>
        {status && (
          <span style={{
            marginLeft: 10,
            color: status === 'known' ? T.correct : status === 'learning' ? T.accent : T.wrong,
          }}>
            · {status}
          </span>
        )}
      </div>

      <div
        className={`flip-card ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped(!flipped)}
        style={{ height: 320, marginBottom: 20, cursor: 'pointer' }}
      >
        <div className="flip-card-inner">
          <div
            className="flip-face"
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${dom.tone}`,
              borderRadius: 2,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div style={{
              fontFamily: fontMono, fontSize: 10, color: T.textDim,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Term
            </div>
            <div style={{
              fontFamily: fontHead, fontSize: 32, fontWeight: 500,
              textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>
              {current.t}
            </div>
            <div style={{
              fontFamily: fontMono, fontSize: 10, color: T.textDim,
              letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 24,
            }}>
              tap to reveal
            </div>
          </div>
          <div
            className="flip-face flip-back"
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${dom.tone}`,
              borderRadius: 2,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{
              fontFamily: fontMono, fontSize: 10, color: T.textDim,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              {current.t}
            </div>
            <div style={{ fontSize: 17, lineHeight: 1.55, color: T.text }}>
              {current.def}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button onClick={() => mark('again')} style={markBtn(T.wrong)}>
          <X size={14} /> Again
        </button>
        <button onClick={() => mark('learning')} style={markBtn(T.accent)}>
          <Brain size={14} /> Learning
        </button>
        <button onClick={() => mark('known')} style={markBtn(T.correct)}>
          <Check size={14} /> Known
        </button>
      </div>
      <div style={{
        fontFamily: fontMono, fontSize: 10, color: T.textDim,
        textAlign: 'center', marginTop: 10, letterSpacing: '0.1em',
      }}>
        Cards marked "known" disappear from the deck until you toggle them back.
      </div>
    </div>
  );
}
