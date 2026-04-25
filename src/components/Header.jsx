import { BookOpen, Brain, Layers, Gauge, User, Cloud, CloudOff, CloudDrizzle, AlertCircle, BookMarked } from 'lucide-react';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';

const TABS = [
  { id: 'dash',  label: 'Dashboard',  icon: Gauge },
  { id: 'prac',  label: 'Practice',   icon: Brain },
  { id: 'rev',   label: 'Revise',     icon: BookMarked },
  { id: 'flash', label: 'Flashcards', icon: Layers },
  { id: 'land',  label: 'Landscape',  icon: BookOpen },
];

function SyncIndicator({ syncConfig, syncStatus, onClick }) {
  let Icon = CloudOff;
  let color = T.textDim;
  let label = 'Sync off';

  if (syncConfig) {
    if (syncStatus === 'pulling' || syncStatus === 'pushing') {
      Icon = CloudDrizzle;
      color = T.primary;
      label = syncStatus === 'pulling' ? 'Pulling…' : 'Saving…';
    } else if (syncStatus === 'error') {
      Icon = AlertCircle;
      color = T.wrong;
      label = 'Sync error';
    } else {
      Icon = Cloud;
      color = T.correct;
      label = 'Synced';
    }
  }

  return (
    <button
      onClick={onClick}
      title={syncConfig ? `Cross-device sync · ${label}` : 'Set up cross-device sync'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: 'transparent', color,
        border: `1px solid ${T.border}`, borderRadius: 2,
        cursor: 'pointer',
        fontFamily: fontMono, fontSize: 11,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}

function formatExamDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  // Skip the time stamp for legacy date-only values (midnight in local tz).
  const hasTime = typeof iso === 'string' && iso.includes('T');
  if (!hasTime) return date;
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export default function Header({
  days, examDate, onEditExamDate,
  tab, onTab,
  user, onSwitchUser,
  syncConfig, syncStatus, onOpenSync,
}) {
  return (
    <div style={{
      borderBottom: `1px solid ${T.border}`,
      background: T.bg,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 0' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div style={{
              fontFamily: fontMono, fontSize: 11, letterSpacing: '0.2em',
              color: T.textDim, textTransform: 'uppercase',
            }}>
              Field Guide · v2
            </div>
            <div style={{
              fontFamily: fontHead, fontSize: 34, fontWeight: 600,
              lineHeight: 1.1, letterSpacing: '-0.02em',
            }}>
              KCNA{' '}
              <span style={{ fontStyle: 'italic', color: T.primary, fontWeight: 400 }}>
                prep
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SyncIndicator
              syncConfig={syncConfig}
              syncStatus={syncStatus}
              onClick={onOpenSync}
            />
            {user && (
              <button
                onClick={onSwitchUser}
                title="Switch user"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
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
                <User size={12} strokeWidth={1.8} />
                <span style={{ color: T.text, fontWeight: 600 }}>{user}</span>
                <span style={{ color: T.textDim }}>switch</span>
              </button>
            )}
            <button
              onClick={onEditExamDate}
              title={examDate ? `Exam date: ${formatExamDate(examDate)} · click to change` : 'Set exam date'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: onEditExamDate ? 'pointer' : 'default',
                textAlign: 'right',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em',
                color: T.textDim, textTransform: 'uppercase',
              }}>
                Days until exam
              </div>
              <div style={{
                fontFamily: fontHead, fontSize: 32, fontWeight: 700,
                color: days != null && days <= 3 ? T.accent : T.text, lineHeight: 1,
              }}>
                {days ?? '—'}
              </div>
              {examDate && (
                <div style={{
                  fontFamily: fontMono, fontSize: 9, letterSpacing: '0.15em',
                  color: T.textDim, textTransform: 'uppercase', marginTop: 2,
                }}>
                  {formatExamDate(examDate)}
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-1" style={{ marginTop: 20, marginBottom: -1, overflowX: 'auto' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => onTab(id)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: active ? T.text : T.textMuted,
                  border: 'none',
                  borderBottom: `2px solid ${active ? T.primary : 'transparent'}`,
                  cursor: 'pointer',
                  fontFamily: fontBody,
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
