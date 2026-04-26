import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronUp, List, X as XIcon } from 'lucide-react';
import Section from './Section';
import { T, fontBody, fontHead, fontMono } from '../utils/theme';
// Single source of truth for the cram sheet. Vite inlines it into the bundle
// at build time via `?raw`, so editing this file is the only step needed to
// update the in-app cram sheet.
import notes from '../data/study-notes.md?raw';

// Drop the leading H1 + intro blockquote — those duplicate the page header below.
function trimFrontMatter(md) {
  const lines = md.split('\n');
  // Skip the first H1 and any blank lines after it.
  let start = 0;
  if (lines[0]?.startsWith('# ')) {
    start = 1;
    while (start < lines.length && lines[start].trim() === '') start += 1;
  }
  return lines.slice(start).join('\n');
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Pull the H2 headings to build a sticky table of contents.
function extractToc(md) {
  const toc = [];
  for (const line of md.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      const title = m[1].replace(/[*_`]/g, '');
      toc.push({ id: slugify(title), title });
    }
  }
  return toc;
}

const components = {
  h2: ({ node, children, ...props }) => {
    const id = slugify(typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : ''));
    return (
      <h2
        id={id}
        style={{
          fontFamily: fontHead, fontSize: 24, fontWeight: 600,
          marginTop: 36, marginBottom: 12,
          paddingTop: 16, borderTop: `1px solid ${T.border}`,
          letterSpacing: '-0.01em', scrollMarginTop: 96,
        }}
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => (
    <h3 style={{
      fontFamily: fontHead, fontSize: 18, fontWeight: 600,
      marginTop: 22, marginBottom: 10, color: T.text,
    }} {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 style={{
      fontFamily: fontMono, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.15em', textTransform: 'uppercase',
      color: T.textDim, marginTop: 18, marginBottom: 8,
    }} {...props}>{children}</h4>
  ),
  p: ({ children, ...props }) => (
    <p style={{ fontSize: 14, lineHeight: 1.7, color: T.text, marginBottom: 12 }} {...props}>{children}</p>
  ),
  ul: ({ children, ...props }) => (
    <ul style={{ paddingLeft: 22, marginBottom: 14, color: T.text, fontSize: 14, lineHeight: 1.7 }} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol style={{ paddingLeft: 22, marginBottom: 14, color: T.text, fontSize: 14, lineHeight: 1.7 }} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li style={{ marginBottom: 4 }} {...props}>{children}</li>
  ),
  strong: ({ children, ...props }) => (
    <strong style={{ color: T.text, fontWeight: 600 }} {...props}>{children}</strong>
  ),
  em: ({ children, ...props }) => (
    <em style={{ color: T.textMuted, fontStyle: 'italic' }} {...props}>{children}</em>
  ),
  code: ({ inline, children, ...props }) => {
    if (inline === false) {
      return (
        <pre style={{
          background: T.bgRaised, border: `1px solid ${T.border}`,
          padding: 12, borderRadius: 4, overflowX: 'auto',
          fontFamily: fontMono, fontSize: 12, lineHeight: 1.5,
          marginBottom: 14,
        }}>
          <code {...props}>{children}</code>
        </pre>
      );
    }
    return (
      <code style={{
        fontFamily: fontMono, fontSize: 12,
        background: T.bgRaised, color: T.accent,
        padding: '1px 6px', borderRadius: 3,
      }} {...props}>{children}</code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children, ...props }) => (
    <blockquote style={{
      borderLeft: `3px solid ${T.primary}`,
      background: T.bgRaised,
      padding: '10px 14px',
      margin: '14px 0',
      color: T.textMuted, fontSize: 13, lineHeight: 1.6,
      borderRadius: 2,
    }} {...props}>{children}</blockquote>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '28px 0' }} />
  ),
  table: ({ children, ...props }) => (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        background: T.bgRaised, border: `1px solid ${T.border}`,
        borderRadius: 4, overflow: 'hidden',
        fontSize: 13,
      }} {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}` }} {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th style={{
      textAlign: 'left', padding: '10px 12px',
      fontFamily: fontMono, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.15em', textTransform: 'uppercase',
      color: T.textDim, borderBottom: `1px solid ${T.border}`,
    }} {...props}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td style={{
      padding: '10px 12px', verticalAlign: 'top',
      color: T.text, lineHeight: 1.55,
      borderBottom: `1px solid ${T.border}`,
    }} {...props}>{children}</td>
  ),
  a: ({ children, href, ...props }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
       style={{ color: T.primary, textDecoration: 'underline' }} {...props}>{children}</a>
  ),
};

export default function CramSheet() {
  const [showToc, setShowToc] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const cleanedMd = useMemo(() => trimFrontMatter(notes), []);
  const toc = useMemo(() => extractToc(cleanedMd), [cleanedMd]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowToc(false);
  };

  return (
    <div className="anim-in" style={{ position: 'relative' }}>
      <Section
        subtitle="Last-mile cheat sheet"
        title="Cram sheet"
      >
        <div style={{ fontSize: 14, lineHeight: 1.6, color: T.textMuted, marginBottom: 8 }}>
          Dense, exam-focused notes. Read once the night before, again the morning of.
          Trap callouts mark the places people lose points. Tap the menu icon for a section jump.
        </div>
      </Section>

      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '8px 24px 28px',
      }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {cleanedMd}
        </ReactMarkdown>
      </div>

      {/* Floating TOC trigger (always visible) */}
      <button
        onClick={() => setShowToc(true)}
        title="Jump to section"
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 5,
          width: 44, height: 44, borderRadius: '50%',
          background: T.primary, color: T.bg, border: 'none',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <List size={20} strokeWidth={2} />
      </button>

      {/* Back-to-top (only after scrolling) */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
          style={{
            position: 'fixed', right: 20, bottom: 76, zIndex: 5,
            width: 44, height: 44, borderRadius: '50%',
            background: T.bgRaised, color: T.text, border: `1px solid ${T.border}`,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronUp size={20} strokeWidth={2} />
        </button>
      )}

      {/* TOC drawer */}
      {showToc && (
        <div
          onClick={() => setShowToc(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 320, height: '100%', overflowY: 'auto',
              background: T.bgCard, borderLeft: `1px solid ${T.border}`,
              padding: 22,
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: fontMono, fontSize: 10, color: T.textDim,
                letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>
                Sections
              </div>
              <button
                onClick={() => setShowToc(false)}
                style={{
                  background: 'transparent', border: 'none', color: T.textMuted,
                  cursor: 'pointer', padding: 4,
                }}
              >
                <XIcon size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {toc.map(({ id, title }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: 'transparent',
                    color: T.text, border: 'none', borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: fontBody, fontSize: 13, lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.bgRaised)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
