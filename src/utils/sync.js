// Cross-device sync via a private GitHub Gist.
// - Token (PAT with `gist` scope) is kept in localStorage on this device.
// - The Gist is identified by a well-known filename, so a second device only
//   needs the same token — we find the gist by scanning the user's gists.
// - All state lives in one file inside the gist (the full store from storage.js).

const SYNC_KEY = 'kcna-sync-v1';
export const GIST_FILENAME = 'kcna-prep-data.json';
const GIST_DESCRIPTION = 'KCNA Prep — progress data (private)';

function readConfig() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConfig(cfg) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
}

export function getSyncConfig() {
  return readConfig();
}

export function isSyncConfigured() {
  return !!readConfig();
}

export function clearSyncConfig() {
  localStorage.removeItem(SYNC_KEY);
}

function authHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(url, token, init = {}) {
  const res = await fetch(`https://api.github.com${url}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Verify token works and return login (for display / friendly errors)
export async function verifyToken(token) {
  const me = await apiFetch('/user', token);
  return me.login;
}

// Find an existing sync gist by our well-known filename (first match wins)
export async function findExistingGist(token) {
  const gists = await apiFetch('/gists?per_page=100', token);
  for (const g of gists) {
    if (g.files && g.files[GIST_FILENAME]) {
      return { id: g.id, updatedAt: g.updated_at };
    }
  }
  return null;
}

export async function createGist(token, store) {
  const body = {
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILENAME]: { content: JSON.stringify(store, null, 2) },
    },
  };
  const g = await apiFetch('/gists', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return g.id;
}

export async function pullStore(token, gistId) {
  const g = await apiFetch(`/gists/${gistId}`, token);
  const file = g.files?.[GIST_FILENAME];
  if (!file) throw new Error(`Gist is missing file ${GIST_FILENAME}`);
  // If the file was truncated (>1MB), fetch raw_url
  let content = file.content;
  if (file.truncated && file.raw_url) {
    const raw = await fetch(file.raw_url);
    content = await raw.text();
  }
  try {
    return JSON.parse(content || '{}');
  } catch {
    throw new Error('Remote store is not valid JSON');
  }
}

export async function pushStore(token, gistId, store) {
  const body = {
    files: {
      [GIST_FILENAME]: { content: JSON.stringify(store, null, 2) },
    },
  };
  await apiFetch(`/gists/${gistId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Full setup: verify token, find or create the gist, seed with current local store
export async function setupSync(token, localStore) {
  const login = await verifyToken(token);
  let found = await findExistingGist(token);
  let gistId;
  if (found) {
    gistId = found.id;
  } else {
    gistId = await createGist(token, localStore);
  }
  writeConfig({ token, gistId, login, configuredAt: Date.now() });
  return { gistId, login, existed: !!found };
}
