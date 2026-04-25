import { useState } from 'react';
import { Flag, X, Check } from 'lucide-react';
import { T, fontBody, fontMono } from '../utils/theme';

export default function FlagButton({ flag, onFlag, onUnflag }) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(flag?.reason || '');

  const flagged = !!flag;

  const startEditing = () => {
    setReason(flag?.reason || '');
    setEditing(true);
  };

  const save = () => {
    onFlag(reason);
    setEditing(false);
  };

  const cancel = () => {
    setReason(flag?.reason || '');
    setEditing(false);
  };

  const remove = () => {
    onUnflag();
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{
        marginTop: 14,
        padding: 12,
        background: T.bgRaised,
        border: `1px solid ${T.accent}`,
        borderRadius: 2,
      }}>
        <div style={{
          fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: T.accent, marginBottom: 8, fontWeight: 600,
        }}>
          {flagged ? 'Edit flag' : 'Flag this question'}
        </div>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What's wrong? (e.g. 'C is marked correct but B is the right declarative answer')"
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: T.bg,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            fontFamily: fontBody,
            fontSize: 13,
            lineHeight: 1.5,
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = T.primary)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
        />
        <div className="flex justify-between gap-2 mt-2">
          {flagged ? (
            <button
              onClick={remove}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: T.wrong,
                border: `1px solid ${T.wrong}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: fontMono,
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Remove flag
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={cancel}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: T.textMuted,
                border: `1px solid ${T.border}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: fontBody,
                fontSize: 12,
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!reason.trim()}
              style={{
                padding: '6px 12px',
                background: reason.trim() ? T.accent : T.border,
                color: reason.trim() ? T.bg : T.textDim,
                border: 'none',
                borderRadius: 2,
                cursor: reason.trim() ? 'pointer' : 'not-allowed',
                fontFamily: fontBody,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {flagged ? 'Update' : 'Save flag'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (flagged) {
    return (
      <div style={{
        marginTop: 14,
        padding: 10,
        background: 'rgba(232, 168, 124, 0.06)',
        border: `1px solid rgba(232, 168, 124, 0.4)`,
        borderLeft: `3px solid ${T.accent}`,
        borderRadius: 2,
      }}>
        <div className="flex items-start justify-between gap-3">
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: T.accent, marginBottom: 4, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Flag size={11} fill={T.accent} /> Flagged
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>
              {flag.reason || <span style={{ color: T.textDim, fontStyle: 'italic' }}>(no reason)</span>}
            </div>
          </div>
          <button
            onClick={startEditing}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontMono,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      title="Flag this question for review"
      style={{
        marginTop: 12,
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Flag size={11} /> Flag this question
    </button>
  );
}
