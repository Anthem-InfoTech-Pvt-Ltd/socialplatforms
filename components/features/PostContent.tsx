'use client';

import { useState } from 'react';

// Collapses 3+ blank lines down to a single paragraph break, and
// trims leading/trailing whitespace so posts don't start/end with gaps.
function normalizeContent(content: string) {
  return content.trim().replace(/\n{3,}/g, '\n\n');
}

// Highlights #hashtags inline without touching the rest of the text.
function renderInline(text: string) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) =>
    /^#[\p{L}\p{N}_]+$/u.test(part) ? (
      <span key={i} className="text-primary font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function PostContent({
  content,
  className = '',
  clampLines = 4,
}: {
  content: string;
  className?: string;
  /** Lines to clamp to before showing "Show more". Pass 0 to disable clamping. */
  clampLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const normalized = normalizeContent(content);
  const isLong =
    clampLines > 0 &&
    (normalized.length > 200 || normalized.split('\n').length > clampLines);

  // Expanded / short post: real paragraph spacing via margin, not blank-line height
  if (expanded || !isLong) {
    const paragraphs = normalized.split(/\n\n+/);
    return (
      <div className={className}>
        <div className="space-y-2 break-words">
          {paragraphs.map((para, i) => (
            <p key={i} className="leading-normal">
              {para.split('\n').map((line, j, arr) => (
                <span key={j}>
                  {renderInline(line)}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-1.5 text-xs font-medium text-primary hover:underline"
          >
            Show less
          </button>
        )}
      </div>
    );
  }

  // Clamped preview: flat inline flow so line-clamp truncates cleanly
  return (
    <div className={className}>
      <p
        className="break-words leading-normal overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: clampLines,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {normalized.split('\n').map((line, j, arr) => (
          <span key={j}>
            {renderInline(line)}
            {j < arr.length - 1 && <br />}
          </span>
        ))}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-1.5 text-xs font-medium text-primary hover:underline"
      >
        Show more
      </button>
    </div>
  );
}