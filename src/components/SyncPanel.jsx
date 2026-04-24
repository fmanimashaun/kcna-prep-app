import { useState } from 'react';
import { Cloud, CloudOff, ExternalLink, LogOut, Check, X as XIcon } from 'lucide-react';
import Card from './Card';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';

const TOKEN_URL = 'https://github.com/settings/tokens/new?description=KCNA+Prep+Sync&scopes=gist';

export default function SyncPanel({
  open,
  onClose,
  syncConfig,
  onSetup,
  onDisconnect,
  onPullNow,
  lastSync,
  syncError,
}) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    setSubmitting(true);
    setLocalError(null);
    setResult(null);
    try {
      const out = await onSetup(token.trim());
      setResult(out);
      setToken('');
    } catch (err) {
      setLocalError(err.message || 'Could not connect');
    } finally {
      setSubmitting(false);
    }
  };

  const connected = !!syncConfig;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 30,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520 }}
      >
        <Card style={{ padding: 28 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {connected ? (
                <Cloud size={22} style={{ color: T.primary }} strokeWidth={1.8} />
              ) : (
                <CloudOff size={22} style={{ color: T.textDim }} strokeWidth={1.8} />
              )}
              <div>
                <div style={{ fontFamily: fontHead, fontSize: 20, fontWeight: 600 }}>
                  Cross-device sync
                </div>
                <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim, letterSpacing: '0.1em' }}>
                  via GitHub Gist
                </div>
              </div>
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

          {connected ? (
            <>
              <div style={{
                background: T.bgRaised, border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${T.correct}`,
                padding: 14, borderRadius: 2, marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: fontMono, fontSize: 10, color: T.correct,
                  letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600,
                }}>
                  ✓ Connected
                </div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>
                  Signed in as <strong>{syncConfig.login}</strong>. Progress is mirrored to a private gist and
                  pulled in when you reopen the app on any device.
                </div>
                <div style={{
                  fontFamily: fontMono, fontSize: 11, color: T.textDim, marginTop: 8,
                }}>
                  Gist: <a
                    href={`https://gist.github.com/${syncConfig.login}/${syncConfig.gistId}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: T.textMuted, textDecoration: 'underline' }}
                  >
                    {syncConfig.gistId.slice(0, 10)}…
                  </a>
                  {lastSync && <span> · last synced {formatAgo(lastSync)}</span>}
                </div>
              </div>

              {syncError && (
                <div style={{
                  background: 'rgba(201, 104, 104, 0.08)',
                  border: `1px solid ${T.wrong}`,
                  borderRadius: 2, padding: 12, marginBottom: 14,
                  fontSize: 12, color: T.wrong,
                }}>
                  {syncError}
                </div>
              )}

              <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55, marginBottom: 16 }}>
                To connect another device, open the app there, enter your name, then come here
                and paste the same token. The gist will be found automatically.
              </div>

              <div className="flex justify-between gap-2">
                <button
                  onClick={onDisconnect}
                  style={{
                    padding: '8px 14px',
                    background: 'transparent', color: T.wrong,
                    border: `1px solid ${T.wrong}`, borderRadius: 2,
                    cursor: 'pointer', fontFamily: fontBody, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <LogOut size={13} /> Disconnect this device
                </button>
                <button
                  onClick={onPullNow}
                  style={{
                    padding: '8px 14px',
                    background: T.primary, color: T.bg,
                    border: 'none', borderRadius: 2,
                    cursor: 'pointer', fontFamily: fontBody, fontSize: 13, fontWeight: 600,
                  }}
                >
                  Pull latest
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
                Progress syncs through a private Gist on your GitHub account. You need a personal
                access token with the <code style={{
                  background: T.bgRaised, padding: '1px 5px', borderRadius: 2,
                  fontSize: 12, color: T.accent,
                }}>gist</code> scope only.
              </div>

              <a
                href={TOKEN_URL}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: fontMono, fontSize: 12, color: T.primary,
                  marginBottom: 16, textDecoration: 'none',
                  letterSpacing: '0.05em',
                }}
              >
                Generate a token <ExternalLink size={12} />
              </a>

              <form onSubmit={handleSubmit}>
                <div style={{
                  fontFamily: fontMono, fontSize: 10, color: T.textDim,
                  letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6,
                }}>
                  Paste token
                </div>
                <input
                  type="password"
                  autoFocus
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    background: T.bgRaised,
                    color: T.text,
                    border: `1px solid ${T.border}`,
                    borderRadius: 2,
                    fontFamily: fontMono,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: 12,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.primary)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                />

                {localError && (
                  <div style={{
                    background: 'rgba(201, 104, 104, 0.08)',
                    border: `1px solid ${T.wrong}`,
                    borderRadius: 2, padding: 10, marginBottom: 12,
                    fontSize: 12, color: T.wrong,
                  }}>
                    {localError}
                  </div>
                )}

                {result && (
                  <div style={{
                    background: 'rgba(156, 175, 136, 0.08)',
                    border: `1px solid ${T.correct}`,
                    borderRadius: 2, padding: 10, marginBottom: 12,
                    fontSize: 12, color: T.correct,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Check size={13} />
                    Connected as <strong>{result.login}</strong>
                    {result.existed ? ' — found existing gist' : ' — created a new gist'}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!token.trim() || submitting}
                    style={{
                      padding: '10px 18px',
                      background: token.trim() && !submitting ? T.primary : T.border,
                      color: token.trim() && !submitting ? T.bg : T.textDim,
                      border: 'none', borderRadius: 2,
                      cursor: token.trim() && !submitting ? 'pointer' : 'not-allowed',
                      fontFamily: fontBody, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {submitting ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </form>

              <div style={{
                marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`,
                fontSize: 11, color: T.textDim, lineHeight: 1.55, fontFamily: fontMono,
              }}>
                The token is stored only in this browser's localStorage. It's never sent anywhere
                except api.github.com.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
