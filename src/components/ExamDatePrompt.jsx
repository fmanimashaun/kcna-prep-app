import { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import Card from './Card';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
// `toISOString` is UTC, so derive the local-formatted string ourselves.
function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Old data may be a bare date string ("2026-04-29"). Pad with a 09:00 default
// so the datetime-local input pre-fills cleanly.
function normalizeForInput(value) {
  if (!value) return '';
  if (value.includes('T')) return value.slice(0, 16);
  return `${value}T09:00`;
}

// Captures (or edits) the user's KCNA exam date and time.
// Used as a blocking screen after sign-in when no date is set,
// and via Header → click countdown to edit later.
export default function ExamDatePrompt({
  user,
  initialDate,
  onSubmit,
  onCancel,
  title = 'When is your exam?',
  subtitle = 'Pick the date and start time. We use this for your countdown and study strategy.',
  submitLabel = 'Save',
  embedded = false,
}) {
  const [date, setDate] = useState(normalizeForInput(initialDate));

  const minValue = toLocalInputValue(new Date());

  const submit = (e) => {
    e?.preventDefault();
    if (!date) return;
    onSubmit(date);
  };

  const card = (
    <Card style={{ padding: 28, borderRadius: embedded ? 12 : 2 }}>
      <div style={{
        fontFamily: fontMono, fontSize: 10, color: T.textDim,
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        {user ? `Hi, ${user}` : 'Exam date'}
      </div>
      <div style={{
        fontFamily: fontHead, fontSize: 20, fontWeight: 500, color: T.text,
        marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55, marginBottom: 20 }}>
        {subtitle}
      </div>

      <form onSubmit={submit}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Calendar
            size={16}
            style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: T.textDim,
              pointerEvents: 'none',
            }}
            strokeWidth={1.8}
          />
          <input
            autoFocus
            type="datetime-local"
            value={date}
            min={minValue}
            onChange={(e) => setDate(e.target.value)}
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
              colorScheme: 'dark',
            }}
            onFocus={(e) => (e.target.style.borderColor = T.primary)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: '0 0 auto',
                padding: '11px 16px',
                background: 'transparent',
                color: T.textMuted,
                border: `1px solid ${T.border}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: fontBody,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!date}
            style={{
              flex: 1,
              padding: '11px 16px',
              background: date ? T.primary : T.border,
              color: date ? T.bg : T.textDim,
              border: 'none',
              borderRadius: 2,
              cursor: date ? 'pointer' : 'not-allowed',
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
            {submitLabel} <ChevronRight size={14} />
          </button>
        </div>
      </form>
    </Card>
  );

  if (embedded) return card;

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
        {card}
      </div>
    </div>
  );
}
