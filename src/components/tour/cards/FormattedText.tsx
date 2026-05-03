'use client';

/**
 * Renders text with inline formatting markers:
 *   **bold**        → <strong>
 *   *italic*        → <em>
 *   {{#hex}}text{{/}} → <span style="color:#hex">
 *
 * Falls back to plain text if no markers are found.
 */

interface Props {
  text: string;
  className?: string;
}

export default function FormattedText({ text, className = '' }: Props) {
  const html = formatToHtml(text);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function formatToHtml(text: string): string {
  let result = escapeHtml(text);

  // Color: {{#hex}}text{{/}}
  result = result.replace(
    /\{\{(#[0-9a-fA-F]{3,8})\}\}([\s\S]*?)\{\{\/\}\}/g,
    '<span style="color:$1">$2</span>'
  );

  // Bold: **text**
  result = result.replace(
    /\*\*(.+?)\*\*/g,
    '<strong>$1</strong>'
  );

  // Italic: *text* (but not inside **)
  result = result.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    '<em>$1</em>'
  );

  // Newlines to <br>
  result = result.replace(/\n/g, '<br/>');

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
