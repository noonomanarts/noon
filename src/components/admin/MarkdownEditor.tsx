'use client';

import { useMemo, useRef, useState } from 'react';

interface MarkdownEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const markdownToHtml = (source: string): string => {
  const escaped = escapeHtml(source);
  const lines = escaped.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const parseInline = (line: string): string => {
    return line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline dark:text-blue-400">$1</a>');
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        closeLists();
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        html.push(
          `<pre class="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100"><code>${codeBuffer.join('\n')}</code></pre>`
        );
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeLists();
      html.push('');
      continue;
    }

    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      closeLists();
      html.push('<hr class="my-4 border-zinc-200 dark:border-zinc-700" />');
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      closeLists();
      const level = hMatch[1].length;
      const title = parseInline(hMatch[2]);
      const classMap: Record<number, string> = {
        1: 'text-2xl font-bold',
        2: 'text-xl font-bold',
        3: 'text-lg font-semibold',
        4: 'text-base font-semibold',
        5: 'text-sm font-semibold',
        6: 'text-sm font-medium',
      };
      html.push(`<h${level} class="mt-5 mb-2 ${classMap[level]}">${title}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      closeLists();
      html.push(
        `<blockquote class="my-3 border-s-4 border-zinc-300 ps-3 italic text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">${parseInline(quoteMatch[1])}</blockquote>`
      );
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul class="my-2 list-disc space-y-1 ps-6">');
        inUl = true;
      }
      html.push(`<li>${parseInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol class="my-2 list-decimal space-y-1 ps-6">');
        inOl = true;
      }
      html.push(`<li>${parseInline(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p class="my-2 leading-7 text-zinc-800 dark:text-zinc-200">${parseInline(line)}</p>`);
  }

  closeLists();

  if (inCodeBlock && codeBuffer.length > 0) {
    html.push(
      `<pre class="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100"><code>${codeBuffer.join('\n')}</code></pre>`
    );
  }

  return html.join('\n');
};

export default function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder = 'Write using Markdown...',
  rows = 10,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previewHtml = useMemo(() => markdownToHtml(value), [value]);

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    });
  };

  const insertPrefixPerLine = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    const text = selected.length > 0 ? selected : 'text';
    const updated = text
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');

    const nextValue = `${before}${updated}${after}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = start + updated.length;
    });
  };

  return (
    <div>
      {label.trim().length > 0 && (
        <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      )}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setTab('write')}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                tab === 'write'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                tab === 'preview'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
              }`}
            >
              Preview
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => wrapSelection('**')} className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">B</button>
            <button type="button" onClick={() => wrapSelection('*')} className="rounded px-2 py-1 text-xs italic text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">I</button>
            <button type="button" onClick={() => wrapSelection('`')} className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">Code</button>
            <button type="button" onClick={() => insertPrefixPerLine('- ')} className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">• List</button>
            <button type="button" onClick={() => insertPrefixPerLine('> ')} className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">Quote</button>
            <button type="button" onClick={() => wrapSelection('[', '](https://)')} className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">Link</button>
          </div>
        </div>

        {tab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full resize-y border-0 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-0 dark:bg-zinc-900 dark:text-white"
          />
        ) : (
          <div className="min-h-[240px] bg-white px-4 py-3 text-sm dark:bg-zinc-900">
            {value.trim().length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">Nothing to preview.</p>
            ) : (
              <article
                className="break-words text-zinc-900 dark:text-zinc-100"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Supports GitHub-style Markdown: headings, lists, code, links, quotes, bold, italic, and strike.
      </p>
    </div>
  );
}
