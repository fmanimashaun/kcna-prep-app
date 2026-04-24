import { useState } from 'react';
import { User, ChevronRight } from 'lucide-react';
import Card from './Card';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';

export default function UserPrompt({ existingUsers, onSubmit }) {
  const [name, setName] = useState('');

  const submit = (n) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="grain anim-in"
      style={{
        minHeight: '100vh',
        background: T.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: fontMono, fontSize: 11, letterSpacing: '0.2em',
            color: T.textDim, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Field Guide · v2
          </div>
          <div style={{
            fontFamily: fontHead, fontSize: 40, fontWeight: 600,
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            KCNA{' '}
            <span style={{ fontStyle: 'italic', color: T.primary, fontWeight: 400 }}>
              prep
            </span>
          </div>
        </div>

        <Card style={{ padding: 28 }}>
          <div style={{
            fontFamily: fontMono, fontSize: 10, color: T.textDim,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            Who's studying?
          </div>
          <div style={{
            fontFamily: fontHead, fontSize: 20, fontWeight: 500, color: T.text,
            marginBottom: 6,
          }}>
            Enter your name to start
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55, marginBottom: 20 }}>
            Progress and exam runs are saved locally under this name. Multiple people can share this browser.
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit(name); }}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <User
                size={16}
                style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: T.textDim,
                }}
                strokeWidth={1.8}
              />
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fisayo"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  background: T.bgRaised,
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: 2,
                  fontFamily: fontBody,
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = T.primary)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                width: '100%',
                padding: '11px 16px',
                background: name.trim() ? T.primary : T.border,
                color: name.trim() ? T.bg : T.textDim,
                border: 'none',
                borderRadius: 2,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                fontFamily: fontBody,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Continue <ChevronRight size={14} />
            </button>
          </form>

          {existingUsers.length > 0 && (
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
              <div style={{
                fontFamily: fontMono, fontSize: 10, color: T.textDim,
                letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Recent
              </div>
              <div className="flex flex-wrap gap-2">
                {existingUsers.map(u => (
                  <button
                    key={u}
                    onClick={() => submit(u)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: T.text,
                      border: `1px solid ${T.border}`,
                      borderRadius: 2,
                      cursor: 'pointer',
                      fontFamily: fontBody,
                      fontSize: 13,
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
