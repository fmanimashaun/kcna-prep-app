import { Filter, Flame } from 'lucide-react';
import { T, fontMono } from '../utils/theme';
import config from '../data/config.json';

const DOMAINS = config.domains;
const SOURCES = config.sources;

export function chipStyle(active, color) {
  return {
    padding: '6px 12px',
    background: active ? color : 'transparent',
    color: active ? T.bg : color,
    border: `1px solid ${color}`,
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: fontMono,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  };
}

export function toggleStyle(active) {
  return {
    padding: '5px 10px',
    background: active ? T.accent : 'transparent',
    color: active ? T.bg : T.textMuted,
    border: `1px solid ${active ? T.accent : T.border}`,
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: fontMono,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

export default function Filters({
  domainFilter, setDomainFilter,
  sourceFilter, setSourceFilter,
  onlyUnanswered, setOnlyUnanswered,
  onlyWrong, setOnlyWrong,
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Domain chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setDomainFilter('all')} style={chipStyle(domainFilter === 'all', T.text)}>
          All domains
        </button>
        {Object.entries(DOMAINS).map(([k, d]) => (
          <button key={k} onClick={() => setDomainFilter(k)} style={chipStyle(domainFilter === k, d.tone)}>
            {d.short} · {d.weight}%
          </button>
        ))}
      </div>

      {/* Source chips */}
      {setSourceFilter && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setSourceFilter('all')} style={chipStyle(sourceFilter === 'all', T.textMuted)}>
            All sources
          </button>
          {Object.entries(SOURCES).map(([k, s]) => (
            <button key={k} onClick={() => setSourceFilter(k)} style={chipStyle(sourceFilter === k, T.primaryDim)}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Toggles */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setOnlyUnanswered(!onlyUnanswered); setOnlyWrong(false); }}
          style={toggleStyle(onlyUnanswered)}
        >
          <Filter size={11} /> Only unanswered
        </button>
        <button
          onClick={() => { setOnlyWrong(!onlyWrong); setOnlyUnanswered(false); }}
          style={toggleStyle(onlyWrong)}
        >
          <Flame size={11} /> Only previously wrong
        </button>
      </div>
    </div>
  );
}
