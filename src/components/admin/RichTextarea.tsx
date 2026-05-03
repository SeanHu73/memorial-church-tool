'use client';

/**
 * Textarea with formatting toolbar: Bold, Italic, Color.
 * Wraps selected text in markers. If no text is selected,
 * inserts placeholder markers at the cursor.
 */

import { useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  label?: string;
  wordCount?: boolean;
}

const COLORS = [
  { hex: '#8B0000', name: 'Dark Red' },
  { hex: '#1B3A5C', name: 'Blue' },
  { hex: '#2A7B6F', name: 'Teal' },
  { hex: '#B8943E', name: 'Gold' },
  { hex: '#7A7A5E', name: 'Olive' },
  { hex: '#6B5D4F', name: 'Brown' },
  { hex: '#C4923A', name: 'Amber' },
  { hex: '#B8694A', name: 'Terracotta' },
];

export default function RichTextarea({
  value,
  onChange,
  rows = 3,
  placeholder,
  className = '',
  label,
  wordCount,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showColors, setShowColors] = useState(false);

  const wrapSelection = (before: string, after: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const wrapped = before + (selected || 'text') + after;
    const newValue = value.slice(0, start) + wrapped + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      if (selected) {
        ta.selectionStart = start;
        ta.selectionEnd = start + wrapped.length;
      } else {
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + 4; // select "text"
      }
      ta.focus();
    }, 0);
  };

  const applyColor = (hex: string) => {
    wrapSelection(`{{${hex}}}`, '{{/}}');
    setShowColors(false);
  };

  const wc = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-1">
      {label && <span className="text-xs text-stone-500">{label}</span>}

      {/* Toolbar */}
      <div className="flex items-center gap-1 relative">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-xs font-bold text-stone-700"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('*', '*')}
          className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-xs italic text-stone-700"
          title="Italic"
        >
          I
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColors(!showColors)}
            className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-xs text-stone-700 flex items-center gap-1"
            title="Text color"
          >
            <span className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #8B0000, #1B3A5C, #2A7B6F, #B8943E)' }} />
            A
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-stone-300 rounded shadow-lg p-1.5 flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => applyColor(c.hex)}
                  className="w-5 h-5 rounded-sm border border-stone-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-3 py-1.5 border border-stone-300 rounded text-sm ${className}`}
      />

      {wordCount && (
        <span className="text-[10px] text-stone-400">{wc} words</span>
      )}
    </div>
  );
}
