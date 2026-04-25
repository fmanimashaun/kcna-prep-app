// Per-user local storage.
// Schema (all under one key for easy export later):
// {
//   currentUser: "Fisayo",
//   users: {
//     "Fisayo": {
//       examDate: "2026-04-29",   // ISO date the user is sitting the exam
//       q: { [questionId]: { correct, attempts, last } },
//       f: { [cardId]:   { status, last } },
//       runs: [ { setId, startedAt, finishedAt, durationMs, score, total, byDomain, answers } ],
//     }
//   }
// }

const STORAGE_KEY = 'kcna-progress-v2';
const LEGACY_KEY = 'kcna-progress-v1';

function emptyUser() {
  return { examDate: null, q: {}, f: {}, runs: [], notes: [], reviewed: {}, flags: {} };
}

function emptyStore() {
  return { currentUser: null, users: {} };
}

export function readStoreRaw() {
  return readStore();
}

export function writeStoreRaw(store) {
  writeStore({
    currentUser: store.currentUser ?? null,
    users: store.users ?? {},
  });
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currentUser: parsed.currentUser ?? null,
        users: parsed.users ?? {},
      };
    }
    // One-shot migration from v1 (single anonymous user).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      return {
        currentUser: null,
        users: {
          __legacy: { examDate: null, q: old.q || {}, f: old.f || {}, runs: [], notes: [], reviewed: {}, flags: {} },
        },
      };
    }
  } catch (err) {
    console.error('Failed to read store:', err);
  }
  return emptyStore();
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to write store:', err);
  }
}

export function getCurrentUser() {
  return readStore().currentUser;
}

export function listUsers() {
  const store = readStore();
  return Object.keys(store.users).filter(n => n !== '__legacy');
}

export function setCurrentUser(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const store = readStore();
  if (!store.users[trimmed]) {
    // If switching from legacy anonymous progress, migrate it under this name
    if (store.users.__legacy && Object.keys(store.users).length === 1) {
      store.users[trimmed] = store.users.__legacy;
      delete store.users.__legacy;
    } else {
      store.users[trimmed] = emptyUser();
    }
  }
  store.currentUser = trimmed;
  writeStore(store);
}

export function loadProgress(name) {
  if (!name) return emptyUser();
  const store = readStore();
  const user = store.users[name];
  if (!user) return emptyUser();
  return {
    examDate: user.examDate || null,
    q: user.q || {},
    f: user.f || {},
    runs: user.runs || [],
    notes: user.notes || [],
    reviewed: user.reviewed || {},
    flags: user.flags || {},
  };
}

export function saveProgress(name, state) {
  if (!name) return;
  const store = readStore();
  store.users[name] = {
    examDate: state.examDate || null,
    q: state.q || {},
    f: state.f || {},
    runs: state.runs || [],
    notes: state.notes || [],
    reviewed: state.reviewed || {},
    flags: state.flags || {},
  };
  writeStore(store);
}

export function clearProgress(name) {
  if (!name) return;
  const store = readStore();
  if (store.users[name]) {
    store.users[name] = emptyUser();
    writeStore(store);
  }
}

export function deleteUser(name) {
  const store = readStore();
  delete store.users[name];
  if (store.currentUser === name) store.currentUser = null;
  writeStore(store);
}
