import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Check, Plus, Edit2, Trash2, AlertTriangle, Link2, BookMarked,
} from 'lucide-react';
import Card from './Card';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
import { chipStyle, toggleStyle } from './Filters';
import config from '../data/config.json';
import CONCEPTS from '../data/concepts.json';

const DOMAINS = config.domains;

// Very lightweight inline markdown: **bold**, `code`, links stay as-is.
// Safe because we only handle these three and escape everything else.
function renderInline(text) {
  const parts = [];
  let rest = text;
  let key = 0;

  const push = (node) => parts.push(<span key={key++}>{node}</span>);

  while (rest.length > 0) {
    const boldMatch = rest.match(/^(.*?)\*\*([^*]+)\*\*/s);
    const codeMatch = rest.match(/^(.*?)`([^`]+)`/s);

    // Choose the earlier match
    let next = null;
    if (boldMatch && codeMatch) {
      next = boldMatch[1].length <= codeMatch[1].length ? { type: 'b', m: boldMatch } : { type: 'c', m: codeMatch };
    } else if (boldMatch) next = { type: 'b', m: boldMatch };
    else if (codeMatch) next = { type: 'c', m: codeMatch };

    if (!next) {
      push(rest);
      break;
    }

    const [full, before, inner] = next.m;
    if (before) push(before);
    if (next.type === 'b') {
      parts.push(<strong key={key++} style={{ color: T.text, fontWeight: 600 }}>{inner}</strong>);
    } else {
      parts.push(
        <code key={key++} style={{
          background: T.bgRaised, padding: '1px 6px', borderRadius: 2,
          fontFamily: fontMono, fontSize: '0.9em', color: T.accent,
        }}>{inner}</code>
      );
    }
    rest = rest.slice(full.length);
  }

  return parts;
}

function renderBody(text) {
  // Split into paragraphs and bullet lists (- or *)
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*]\s+/, '');
      if (current?.type !== 'list') {
        if (current) blocks.push(current);
        current = { type: 'list', items: [] };
      }
      current.items.push(item);
    } else if (trimmed === '') {
      if (current) { blocks.push(current); current = null; }
    } else {
      if (current?.type !== 'p') {
        if (current) blocks.push(current);
        current = { type: 'p', text: '' };
      }
      current.text += (current.text ? ' ' : '') + trimmed;
    }
  }
  if (current) blocks.push(current);

  return blocks.map((b, i) => {
    if (b.type === 'p') {
      return <p key={i} style={{ margin: '0 0 10px', color: T.text, fontSize: 14, lineHeight: 1.6 }}>
        {renderInline(b.text)}
      </p>;
    }
    return (
      <ul key={i} style={{ margin: '0 0 10px', paddingLeft: 20, color: T.text, fontSize: 14, lineHeight: 1.7 }}>
        {b.items.map((it, j) => (
          <li key={j} style={{ marginBottom: 4 }}>{renderInline(it)}</li>
        ))}
      </ul>
    );
  });
}

function NoteEditor({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [domain, setDomain] = useState(initial?.d || 'k8s');
  const [body, setBody] = useState(initial?.body || '');

  const canSave = title.trim() && body.trim();

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: T.bgRaised,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 2,
    fontFamily: fontBody,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 10,
  };

  return (
    <Card style={{ padding: 20, marginBottom: 12, borderLeft: `3px solid ${T.accent}` }}>
      <div style={{
        fontFamily: fontMono, fontSize: 10, color: T.accent,
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600,
      }}>
        {initial ? 'Edit note' : 'New note'}
      </div>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — what's this about?"
        style={inputStyle}
      />

      <div style={{
        fontFamily: fontMono, fontSize: 10, color: T.textDim,
        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6,
      }}>
        Domain
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(DOMAINS).map(([k, d]) => (
          <button key={k} onClick={() => setDomain(k)} style={chipStyle(domain === k, d.tone)}>
            {d.short}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={'Your notes. Supports **bold**, `code`, and - bullet lists.\n\nUse blank lines between paragraphs.'}
        rows={8}
        style={{ ...inputStyle, fontFamily: fontMono, fontSize: 13, lineHeight: 1.55, resize: 'vertical' }}
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          style={{
            padding: '8px 14px', background: 'transparent', color: T.textMuted,
            border: `1px solid ${T.border}`, borderRadius: 2, cursor: 'pointer',
            fontFamily: fontBody, fontSize: 13,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ title: title.trim(), d: domain, body: body.trim() })}
          disabled={!canSave}
          style={{
            padding: '8px 14px',
            background: canSave ? T.primary : T.border,
            color: canSave ? T.bg : T.textDim,
            border: 'none', borderRadius: 2,
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: fontBody, fontSize: 13, fontWeight: 600,
          }}
        >
          {initial ? 'Save changes' : 'Add note'}
        </button>
      </div>
    </Card>
  );
}

function ConceptCard({ concept, isOwn, reviewed, expanded, onToggle, onToggleReviewed, onEdit, onDelete }) {
  const dom = DOMAINS[concept.d];

  return (
    <Card
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `3px solid ${isOwn ? T.accent : dom.tone}`,
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '16px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div className="flex items-start gap-3" style={{ flex: 1, minWidth: 0 }}>
          {expanded ? (
            <ChevronDown size={16} style={{ color: T.textMuted, marginTop: 4, flexShrink: 0 }} />
          ) : (
            <ChevronRight size={16} style={{ color: T.textMuted, marginTop: 4, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span style={{
                fontFamily: fontMono, fontSize: 10,
                color: dom.tone, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
              }}>
                {dom.short}
              </span>
              <span style={{
                fontFamily: fontMono, fontSize: 9,
                color: isOwn ? T.accent : T.textDim,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                border: `1px solid ${isOwn ? T.accent : T.border}`,
                padding: '1px 6px', borderRadius: 2,
              }}>
                {isOwn ? 'Yours' : 'Curated'}
              </span>
              {reviewed && (
                <span style={{
                  fontFamily: fontMono, fontSize: 9, color: T.correct,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Check size={10} /> Reviewed
                </span>
              )}
            </div>
            <div style={{
              fontFamily: fontHead, fontSize: 17, fontWeight: 500, color: T.text,
              lineHeight: 1.35, letterSpacing: '-0.005em',
            }}>
              {concept.title}
            </div>
            {!expanded && concept.summary && (
              <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                {concept.summary}
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="anim-in"
          style={{
            padding: '4px 18px 18px 40px',
            borderTop: `1px solid ${T.border}`,
            background: T.bgRaised,
          }}
        >
          {concept.summary && (
            <div style={{
              fontSize: 14, color: T.textMuted, lineHeight: 1.6,
              marginTop: 14, marginBottom: 14, fontStyle: 'italic',
            }}>
              {renderInline(concept.summary)}
            </div>
          )}

          {isOwn ? (
            <div style={{ marginTop: 4 }}>
              {renderBody(concept.body)}
            </div>
          ) : (
            <>
              {concept.points && concept.points.length > 0 && (
                <>
                  <div style={{
                    fontFamily: fontMono, fontSize: 10, color: T.textDim,
                    letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6, marginTop: 6,
                  }}>
                    Key points
                  </div>
                  <ul style={{
                    margin: '0 0 14px', paddingLeft: 18,
                    color: T.text, fontSize: 14, lineHeight: 1.7,
                  }}>
                    {concept.points.map((p, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{renderInline(p)}</li>
                    ))}
                  </ul>
                </>
              )}

              {concept.traps && concept.traps.length > 0 && (
                <div style={{
                  background: 'rgba(232, 168, 124, 0.05)',
                  border: `1px solid rgba(232, 168, 124, 0.3)`,
                  borderLeft: `3px solid ${T.accent}`,
                  borderRadius: 2, padding: 12, marginBottom: 14,
                }}>
                  <div style={{
                    fontFamily: fontMono, fontSize: 10, color: T.accent,
                    letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
                  }}>
                    <AlertTriangle size={11} /> Watch out
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: T.text, fontSize: 13, lineHeight: 1.65 }}>
                    {concept.traps.map((t, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{renderInline(t)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {concept.related && concept.related.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  fontSize: 12, color: T.textDim, marginBottom: 4,
                }}>
                  <Link2 size={12} />
                  <span style={{ fontFamily: fontMono, letterSpacing: '0.1em' }}>RELATED</span>
                  {concept.related.map((r, i) => (
                    <span key={i} style={{
                      fontFamily: fontMono, fontSize: 11, color: T.textMuted,
                      border: `1px solid ${T.border}`, padding: '2px 8px', borderRadius: 2,
                    }}>
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleReviewed(); }}
              style={toggleStyle(reviewed)}
            >
              <Check size={11} /> {reviewed ? 'Reviewed' : 'Mark reviewed'}
            </button>
            {isOwn && (
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  style={{
                    padding: '5px 10px',
                    background: 'transparent', color: T.textMuted,
                    border: `1px solid ${T.border}`, borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: fontMono, fontSize: 11,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Edit2 size={11} /> Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  style={{
                    padding: '5px 10px',
                    background: 'transparent', color: T.wrong,
                    border: `1px solid ${T.wrong}`, borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: fontMono, fontSize: 11,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Revise({ progress, updateNotes, updateReviewed }) {
  const [domainFilter, setDomainFilter] = useState('all');
  const [onlyYours, setOnlyYours] = useState(false);
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null); // 'new' | noteId | null

  const notes = progress.notes || [];
  const reviewed = progress.reviewed || {};

  const allConcepts = useMemo(() => {
    const curated = CONCEPTS.map(c => ({ ...c, _own: false }));
    const own = notes.map(n => ({ ...n, _own: true }));
    return [...own, ...curated];
  }, [notes]);

  const filtered = useMemo(() => {
    return allConcepts.filter(c => {
      if (domainFilter !== 'all' && c.d !== domainFilter) return false;
      if (onlyYours && !c._own) return false;
      if (onlyUnreviewed && reviewed[c.id]) return false;
      return true;
    });
  }, [allConcepts, domainFilter, onlyYours, onlyUnreviewed, reviewed]);

  const reviewedCount = Object.keys(reviewed).length;
  const totalConcepts = allConcepts.length;

  const toggleExpand = (id) => {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  };
  const expandAll = () => {
    const next = {};
    filtered.forEach(c => { next[c.id] = true; });
    setExpanded(next);
  };
  const collapseAll = () => setExpanded({});

  const saveNote = (data) => {
    if (editing === 'new') {
      const id = `n${Date.now()}`;
      updateNotes([...notes, { id, ...data, created: Date.now(), updated: Date.now() }]);
      // Auto-expand the new note
      setExpanded(e => ({ ...e, [id]: true }));
    } else {
      updateNotes(notes.map(n => n.id === editing ? { ...n, ...data, updated: Date.now() } : n));
    }
    setEditing(null);
  };

  const deleteNote = (id) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    updateNotes(notes.filter(n => n.id !== id));
    const { [id]: _, ...rest } = reviewed;
    updateReviewed(rest);
  };

  const toggleReviewed = (id) => {
    if (reviewed[id]) {
      const { [id]: _, ...rest } = reviewed;
      updateReviewed(rest);
    } else {
      updateReviewed({ ...reviewed, [id]: Date.now() });
    }
  };

  const editingNote = editing && editing !== 'new' ? notes.find(n => n.id === editing) : null;

  return (
    <div className="anim-in">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div style={{
            fontFamily: fontMono, fontSize: 11, letterSpacing: '0.2em',
            color: T.textDim, textTransform: 'uppercase',
          }}>
            Revise · concept review
          </div>
          <div style={{
            fontFamily: fontHead, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em',
          }}>
            {reviewedCount} / {totalConcepts} reviewed
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            style={{
              padding: '6px 12px',
              background: 'transparent', color: T.textMuted,
              border: `1px solid ${T.border}`, borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontMono, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '6px 12px',
              background: 'transparent', color: T.textMuted,
              border: `1px solid ${T.border}`, borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontMono, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Collapse
          </button>
          <button
            onClick={() => setEditing('new')}
            style={{
              padding: '6px 14px',
              background: T.primary, color: T.bg,
              border: 'none', borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontBody, fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Plus size={13} /> Add note
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setDomainFilter('all')} style={chipStyle(domainFilter === 'all', T.text)}>
            All domains
          </button>
          {Object.entries(DOMAINS).map(([k, d]) => (
            <button key={k} onClick={() => setDomainFilter(k)} style={chipStyle(domainFilter === k, d.tone)}>
              {d.short}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOnlyYours(!onlyYours)} style={toggleStyle(onlyYours)}>
            <BookMarked size={11} /> Only your notes
          </button>
          <button onClick={() => setOnlyUnreviewed(!onlyUnreviewed)} style={toggleStyle(onlyUnreviewed)}>
            <Check size={11} /> Only unreviewed
          </button>
        </div>
      </div>

      {editing && (
        <NoteEditor
          initial={editingNote}
          onSave={saveNote}
          onCancel={() => setEditing(null)}
        />
      )}

      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontFamily: fontHead, fontSize: 18, fontWeight: 500, color: T.textMuted }}>
            No concepts match these filters.
          </div>
          <div style={{ fontSize: 13, color: T.textDim, marginTop: 6 }}>
            Loosen the filters or add your own note.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(c => (
            <ConceptCard
              key={c.id}
              concept={c}
              isOwn={c._own}
              reviewed={!!reviewed[c.id]}
              expanded={!!expanded[c.id]}
              onToggle={() => toggleExpand(c.id)}
              onToggleReviewed={() => toggleReviewed(c.id)}
              onEdit={() => setEditing(c.id)}
              onDelete={() => deleteNote(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
