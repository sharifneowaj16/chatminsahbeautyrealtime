import type { ReactNode } from 'react';

const HIGHLIGHT_TAG_PATTERN = /(<\/?(?:mark|em)>)/gi;
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};

type ActiveHighlightTag = 'mark' | 'em' | null;

export function decodeHighlightEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, body: string) => {
    const normalized = body.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(NAMED_HTML_ENTITIES, normalized)) {
      return NAMED_HTML_ENTITIES[normalized];
    }

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return entity;
  });
}

export function renderSafeHighlightParts(html: string): ReactNode[] {
  const parts = html.split(HIGHLIGHT_TAG_PATTERN).filter(Boolean);
  const nodes: ReactNode[] = [];
  let activeTag: ActiveHighlightTag = null;

  for (const part of parts) {
    const tag = part.toLowerCase();

    if (tag === '<mark>') {
      activeTag = 'mark';
      continue;
    }

    if (tag === '</mark>') {
      if (activeTag === 'mark') activeTag = null;
      continue;
    }

    if (tag === '<em>') {
      activeTag = 'em';
      continue;
    }

    if (tag === '</em>') {
      if (activeTag === 'em') activeTag = null;
      continue;
    }

    const text = decodeHighlightEntities(part);
    const key = `${nodes.length}-${part.length}`;

    if (activeTag === 'mark') {
      nodes.push(<mark key={key}>{text}</mark>);
    } else if (activeTag === 'em') {
      nodes.push(<em key={key}>{text}</em>);
    } else {
      nodes.push(text);
    }
  }

  return nodes;
}

export default function SearchHighlight({
  html,
  fallback,
}: {
  html?: string;
  fallback: string;
}) {
  const safeHtml = typeof html === 'string' ? html : '';

  return (
    <span className="[&_mark]:bg-yellow-100 [&_mark]:text-yellow-800 [&_mark]:rounded [&_em]:not-italic [&_em]:font-bold [&_em]:text-pink-600">
      {safeHtml ? renderSafeHighlightParts(safeHtml) : fallback}
    </span>
  );
}
