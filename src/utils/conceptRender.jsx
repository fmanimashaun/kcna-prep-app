import { T, fontMono } from './theme';

// Very lightweight inline markdown: **bold**, `code`.
export function renderInline(text) {
  if (!text) return null;
  const parts = [];
  let rest = text;
  let key = 0;

  const push = (node) => parts.push(<span key={key++}>{node}</span>);

  while (rest.length > 0) {
    const boldMatch = rest.match(/^(.*?)\*\*([^*]+)\*\*/s);
    const codeMatch = rest.match(/^(.*?)`([^`]+)`/s);

    let next = null;
    if (boldMatch && codeMatch) {
      next = boldMatch[1].length <= codeMatch[1].length ? { type: 'b', m: boldMatch } : { type: 'c', m: codeMatch };
    } else if (boldMatch) next = { type: 'b', m: boldMatch };
    else if (codeMatch) next = { type: 'c', m: codeMatch };

    if (!next) {
      push(rest);
      break;
    }

    const [full, before, inner] = next.m;
    if (before) push(before);
    if (next.type === 'b') {
      parts.push(<strong key={key++} style={{ color: T.text, fontWeight: 600 }}>{inner}</strong>);
    } else {
      parts.push(
        <code key={key++} style={{
          background: T.bgRaised, padding: '1px 6px', borderRadius: 2,
          fontFamily: fontMono, fontSize: '0.9em', color: T.accent,
        }}>{inner}</code>
      );
    }
    rest = rest.slice(full.length);
  }

  return parts;
}

// Paragraphs + bullet lists
export function renderBody(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*]\s+/, '');
      if (current?.type !== 'list') {
        if (current) blocks.push(current);
        current = { type: 'list', items: [] };
      }
      current.items.push(item);
    } else if (trimmed === '') {
      if (current) { blocks.push(current); current = null; }
    } else {
      if (current?.type !== 'p') {
        if (current) blocks.push(current);
        current = { type: 'p', text: '' };
      }
      current.text += (current.text ? ' ' : '') + trimmed;
    }
  }
  if (current) blocks.push(current);

  return blocks.map((b, i) => {
    if (b.type === 'p') {
      return (
        <p key={i} style={{ margin: '0 0 10px', color: T.text, fontSize: 14, lineHeight: 1.6 }}>
          {renderInline(b.text)}
        </p>
      );
    }
    return (
      <ul key={i} style={{ margin: '0 0 10px', paddingLeft: 20, color: T.text, fontSize: 14, lineHeight: 1.7 }}>
        {b.items.map((it, j) => (
          <li key={j} style={{ marginBottom: 4 }}>{renderInline(it)}</li>
        ))}
      </ul>
    );
  });
}

// Stop-words we don't want to weight
const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','of','to','in','on','for','and','or','but',
  'with','as','at','by','from','that','this','these','those','it','its','be','been',
  'which','what','how','when','where','who','why','can','could','should','would','will',
  'not','no','do','does','did','has','have','had','than','then','you','your','we','our',
  'one','two','three','four','if','so','more','most','less','least','also','about','into',
  'only','same','other','another','such','whose',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// Score a concept against a question: shared meaningful word count.
export function scoreConceptForQuestion(concept, question) {
  const qTokens = new Set([...tokenize(question.q), ...tokenize(question.expl)]);
  const cTokens = new Set([
    ...tokenize(concept.title),
    ...tokenize(concept.summary),
    ...(concept.points || []).flatMap(tokenize),
    ...(concept.related || []).flatMap(tokenize),
  ]);
  let score = 0;
  for (const t of qTokens) if (cTokens.has(t)) score += 1;
  // Weight title matches extra so concept title keywords matter most
  const titleTokens = new Set(tokenize(concept.title));
  for (const t of qTokens) if (titleTokens.has(t)) score += 2;
  return score;
}

// Pick the top N concepts in the same domain as the question.
export function findRelatedConcepts(question, concepts, n = 2) {
  const sameDomain = concepts.filter(c => c.d === question.d);
  const scored = sameDomain
    .map(c => ({ c, score: scoreConceptForQuestion(c, question) }))
    .sort((a, b) => b.score - a.score);
  // Only return concepts that share at least one meaningful token; otherwise fall
  // back to the first concept in the domain so the panel isn't empty.
  const withMatches = scored.filter(x => x.score > 0);
  const chosen = withMatches.length > 0 ? withMatches : scored;
  return chosen.slice(0, n).map(x => x.c);
}
