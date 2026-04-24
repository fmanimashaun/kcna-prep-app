import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Practice from './components/Practice';
import Flashcards from './components/Flashcards';
import Revise from './components/Revise';
import Landscape from './components/Landscape';
import UserPrompt from './components/UserPrompt';
import SyncPanel from './components/SyncPanel';
import {
  loadProgress, saveProgress, clearProgress,
  getCurrentUser, setCurrentUser, listUsers,
  readStoreRaw, writeStoreRaw,
} from './utils/storage';
import {
  getSyncConfig, setupSync as setupSyncRemote, clearSyncConfig,
  pullStore, pushStore,
} from './utils/sync';
import { daysUntilExam } from './utils/helpers';
import { T, fontMono } from './utils/theme';
import QUESTIONS from './data/questions.json';
import FLASHCARDS from './data/flashcards.json';

const PUSH_DEBOUNCE_MS = 2000;

export default function App() {
  const [tab, setTab] = useState('dash');
  const [user, setUser] = useState(null);
  const [knownUsers, setKnownUsers] = useState([]);
  const [progress, setProgress] = useState({ q: {}, f: {}, runs: [], notes: [], reviewed: {} });
  const [loaded, setLoaded] = useState(false);
  const [days, setDays] = useState(daysUntilExam());

  // Sync state
  const [syncConfig, setSyncConfigState] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'pulling' | 'pushing' | 'error' | 'offline'
  const [syncError, setSyncError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  const pushTimerRef = useRef(null);
  const suppressNextPushRef = useRef(false);

  // Initial boot: load local, then (if configured) pull remote
  useEffect(() => {
    const current = getCurrentUser();
    setKnownUsers(listUsers());
    const cfg = getSyncConfig();
    setSyncConfigState(cfg);

    if (current) {
      setUser(current);
      setProgress(loadProgress(current));
    }
    setLoaded(true);

    if (cfg) {
      pullFromRemote(cfg, { updateCurrentUser: current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh countdown every minute
  useEffect(() => {
    const timer = setInterval(() => setDays(daysUntilExam()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Persist locally on every progress change + debounced push to remote
  useEffect(() => {
    if (!loaded || !user) return;
    saveProgress(user, progress);

    if (!syncConfig) return;
    if (suppressNextPushRef.current) {
      suppressNextPushRef.current = false;
      return;
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushToRemote(syncConfig);
    }, PUSH_DEBOUNCE_MS);
  }, [progress, loaded, user, syncConfig]);

  async function pullFromRemote(cfg, { updateCurrentUser } = {}) {
    setSyncStatus('pulling');
    setSyncError(null);
    try {
      const remote = await pullStore(cfg.token, cfg.gistId);
      if (remote && typeof remote === 'object' && remote.users) {
        // Remote wins on pull. Write to local, then reflect in UI state.
        suppressNextPushRef.current = true;
        writeStoreRaw(remote);

        // If a current user was set locally or remotely, pick the best one
        const nextUser =
          updateCurrentUser && remote.users[updateCurrentUser]
            ? updateCurrentUser
            : remote.currentUser || updateCurrentUser || null;

        setKnownUsers(Object.keys(remote.users).filter(n => n !== '__legacy'));
        if (nextUser) {
          setCurrentUser(nextUser);
          setUser(nextUser);
          setProgress(loadProgress(nextUser));
        }
      }
      setSyncStatus('idle');
      setLastSync(Date.now());
    } catch (err) {
      console.error('Pull failed:', err);
      setSyncStatus('error');
      setSyncError(friendlyError(err));
    }
  }

  async function pushToRemote(cfg) {
    setSyncStatus('pushing');
    setSyncError(null);
    try {
      const store = readStoreRaw();
      await pushStore(cfg.token, cfg.gistId, store);
      setSyncStatus('idle');
      setLastSync(Date.now());
    } catch (err) {
      console.error('Push failed:', err);
      setSyncStatus('error');
      setSyncError(friendlyError(err));
    }
  }

  const handleUserSubmit = (name) => {
    setCurrentUser(name);
    setUser(name);
    setProgress(loadProgress(name));
    setKnownUsers(listUsers());
  };

  const switchUser = () => {
    setUser(null);
    setKnownUsers(listUsers());
  };

  const updateQuestion = (id, data) => {
    setProgress(p => ({ ...p, q: { ...p.q, [id]: data } }));
  };

  const updateCard = (id, data) => {
    setProgress(p => ({ ...p, f: { ...p.f, [id]: data } }));
  };

  const addExamRun = (run) => {
    setProgress(p => ({ ...p, runs: [...(p.runs || []), run] }));
  };

  const updateNotes = (notes) => {
    setProgress(p => ({ ...p, notes }));
  };

  const updateReviewed = (reviewed) => {
    setProgress(p => ({ ...p, reviewed }));
  };

  const onReset = () => {
    if (!user) return;
    if (window.confirm(`Reset all progress for "${user}"? This cannot be undone.`)) {
      clearProgress(user);
      setProgress({ q: {}, f: {}, runs: [], notes: [], reviewed: {} });
    }
  };

  const handleSyncSetup = useCallback(async (token) => {
    const store = readStoreRaw();
    const out = await setupSyncRemote(token, store);
    const cfg = getSyncConfig();
    setSyncConfigState(cfg);
    if (out.existed) {
      // Remote had a gist already → pull it, remote wins
      await pullFromRemote(cfg, { updateCurrentUser: user });
    } else {
      // Fresh gist, just push current local store (already seeded during create)
      setLastSync(Date.now());
      setSyncStatus('idle');
    }
    return out;
  }, [user]);

  const handleSyncDisconnect = () => {
    if (!window.confirm('Disconnect sync from this device? Your local data stays here, but changes will no longer sync.')) return;
    clearSyncConfig();
    setSyncConfigState(null);
    setSyncStatus('idle');
    setSyncError(null);
    setLastSync(null);
  };

  const handlePullNow = async () => {
    if (!syncConfig) return;
    await pullFromRemote(syncConfig, { updateCurrentUser: user });
  };

  if (!loaded) return null;

  if (!user) {
    return <UserPrompt existingUsers={knownUsers} onSubmit={handleUserSubmit} />;
  }

  return (
    <div className="grain" style={{ minHeight: '100vh', background: T.bg }}>
      <Header
        days={days}
        tab={tab}
        onTab={setTab}
        user={user}
        onSwitchUser={switchUser}
        syncConfig={syncConfig}
        syncStatus={syncStatus}
        onOpenSync={() => setSyncPanelOpen(true)}
      />
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '32px 24px 60px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {tab === 'dash'  && <Dashboard progress={progress} onReset={onReset} user={user} />}
        {tab === 'prac'  && (
          <Practice
            progress={progress}
            updateQuestion={updateQuestion}
            addExamRun={addExamRun}
          />
        )}
        {tab === 'flash' && <Flashcards progress={progress} updateCard={updateCard} />}
        {tab === 'rev'   && (
          <Revise
            progress={progress}
            updateNotes={updateNotes}
            updateReviewed={updateReviewed}
          />
        )}
        {tab === 'land'  && <Landscape />}
      </div>
      <div
        style={{
          textAlign: 'center',
          padding: '0 24px 40px',
          fontFamily: fontMono,
          fontSize: 10,
          letterSpacing: '0.2em',
          color: T.textDim,
          textTransform: 'uppercase',
        }}
      >
        {QUESTIONS.length} questions · {FLASHCARDS.length} cards · weighted to real exam distribution · Good luck.
      </div>

      <SyncPanel
        open={syncPanelOpen}
        onClose={() => setSyncPanelOpen(false)}
        syncConfig={syncConfig}
        onSetup={handleSyncSetup}
        onDisconnect={handleSyncDisconnect}
        onPullNow={handlePullNow}
        lastSync={lastSync}
        syncError={syncError}
      />
    </div>
  );
}

function friendlyError(err) {
  if (err?.status === 401) return 'Token was rejected. Check scope (needs `gist`) and that the token is still active.';
  if (err?.status === 404) return 'Gist not found. It may have been deleted — disconnect and reconnect to create a new one.';
  if (err?.status === 403) return 'GitHub rate limit reached. Wait a minute and try again.';
  if (err?.message?.includes('Failed to fetch')) return 'Offline or network error.';
  return err?.message || 'Sync failed.';
}
