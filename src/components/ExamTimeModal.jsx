import { Sparkles, X as XIcon } from 'lucide-react';
import Card from './Card';
import Modal from './Modal';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';

function formatExamMoment(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hasTime = typeof iso === 'string' && iso.includes('T');
  if (!hasTime) return date;
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

// Shown once when the countdown crosses zero (or when the user opens the
// app and the exam time has already passed), until they dismiss it.
export default function ExamTimeModal({ examDate, user, onClose }) {
  return (
    <Modal open onClose={onClose} dim="rgba(0,0,0,0.75)">
      <div style={{ width: '100%', maxWidth: 460 }}>
        <Card style={{ padding: 32, position: 'relative' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'transparent', border: 'none',
              color: T.textMuted, cursor: 'pointer', padding: 4,
            }}
          >
            <XIcon size={18} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: 'rgba(156, 175, 136, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={26} strokeWidth={1.6} style={{ color: T.correct }} />
            </div>
          </div>

          <div style={{
            fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: T.textDim, textAlign: 'center', marginBottom: 8,
          }}>
            It's time
          </div>
          <div style={{
            fontFamily: fontHead, fontSize: 26, fontWeight: 600,
            textAlign: 'center', lineHeight: 1.2, marginBottom: 10,
          }}>
            {user ? `Good luck, ${user}.` : 'Good luck.'}
          </div>
          <div style={{
            fontSize: 14, color: T.textMuted, lineHeight: 1.55,
            textAlign: 'center', marginBottom: 18,
          }}>
            Your KCNA exam window has started.
          </div>

          {examDate && (
            <div style={{
              padding: 12,
              background: T.bgRaised,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${T.primary}`,
              borderRadius: 2,
              marginBottom: 22,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em',
                color: T.textDim, textTransform: 'uppercase', marginBottom: 4,
              }}>
                Exam start
              </div>
              <div style={{ fontSize: 14, color: T.text }}>
                {formatExamMoment(examDate)}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: T.primary,
              color: T.bg,
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: fontBody,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            Got it
          </button>
        </Card>
      </div>
    </Modal>
  );
}
