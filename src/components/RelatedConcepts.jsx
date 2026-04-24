import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Link2, BookMarked } from 'lucide-react';
import { T, fontHead, fontMono } from '../utils/theme';
import { renderInline, findRelatedConcepts } from '../utils/conceptRender';
import config from '../data/config.json';
import CONCEPTS from '../data/concepts.json';

const DOMAINS = config.domains;

function ConceptRow({ concept, expanded, onToggle }) {
  const dom = DOMAINS[concept.d];
  return (
    <div style={{
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${dom.tone}`,
      borderRadius: 2,
      background: T.bgCard,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          color: T.text,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        {expanded ? (
          <ChevronDown size={14} style={{ color: T.textMuted, marginTop: 4, flexShrink: 0 }} />
        ) : (
          <ChevronRight size={14} style={{ color: T.textMuted, marginTop: 4, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: fontHead, fontSize: 14, fontWeight: 600, lineHeight: 1.3,
            color: T.text, marginBottom: 2,
          }}>
            {concept.title}
          </div>
          {!expanded && (
            <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
              {concept.summary}
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div
          className="anim-in"
          style={{
            padding: '0 14px 14px 38px',
            fontSize: 13,
            color: T.text,
          }}
        >
          <div style={{
            fontSize: 13, color: T.textMuted, lineHeight: 1.55,
            fontStyle: 'italic', marginBottom: 10,
          }}>
            {renderInline(concept.summary)}
          </div>

          {concept.points && concept.points.length > 0 && (
            <>
              <div style={{
                fontFamily: fontMono, fontSize: 9, color: T.textDim,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 4, fontWeight: 600,
              }}>
                Key points
              </div>
              <ul style={{
                margin: '0 0 10px', paddingLeft: 16,
                color: T.text, fontSize: 13, lineHeight: 1.6,
              }}>
                {concept.points.map((p, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{renderInline(p)}</li>
                ))}
              </ul>
            </>
          )}

          {concept.traps && concept.traps.length > 0 && (
            <div style={{
              background: 'rgba(232, 168, 124, 0.05)',
              border: `1px solid rgba(232, 168, 124, 0.3)`,
              borderLeft: `2px solid ${T.accent}`,
              borderRadius: 2, padding: 10, marginBottom: 8,
            }}>
              <div style={{
                fontFamily: fontMono, fontSize: 9, color: T.accent,
                letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 5,
                display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600,
              }}>
                <AlertTriangle size={10} /> Watch out
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, color: T.text, fontSize: 12, lineHeight: 1.55 }}>
                {concept.traps.map((t, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{renderInline(t)}</li>
                ))}
              </ul>
            </div>
          )}

          {concept.related && concept.related.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              fontSize: 11, color: T.textDim,
            }}>
              <Link2 size={11} />
              {concept.related.map((r, i) => (
                <span key={i} style={{
                  fontFamily: fontMono, fontSize: 10, color: T.textMuted,
                  border: `1px solid ${T.border}`, padding: '1px 6px', borderRadius: 2,
                }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RelatedConcepts({ question }) {
  const [expanded, setExpanded] = useState({});

  const related = useMemo(
    () => findRelatedConcepts(question, CONCEPTS, 2),
    [question]
  );

  if (related.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: fontMono, fontSize: 10, color: T.textDim,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        marginBottom: 8, fontWeight: 600,
      }}>
        <BookMarked size={11} /> Learn more
      </div>
      <div className="flex flex-col gap-2">
        {related.map(c => (
          <ConceptRow
            key={c.id}
            concept={c}
            expanded={!!expanded[c.id]}
            onToggle={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))}
          />
        ))}
      </div>
    </div>
  );
}
