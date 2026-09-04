'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FiCode,
  FiEye,
  FiHash,
  FiLink,
  FiList,
  FiMinus,
  FiEdit3,
} from 'react-icons/fi';

interface MarkdownEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  dir?: 'ltr' | 'rtl';
  hint?: string;
}

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const parseInline = (line: string): string =>
  line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code class="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[color:var(--noon-teal)] underline underline-offset-2 hover:text-[color:var(--noon-teal-strong)]">$1</a>'
    );

export const markdownToHtml = (source: string): string => {
  const escaped = escapeHtml(source);
  const lines = escaped.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
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
        html.push(`<pre class="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100 my-3"><code>${codeBuffer.join('\n')}</code></pre>`);
        codeBuffer = [];
      }
      continue;
    }
    if (inCodeBlock) { codeBuffer.push(line); continue; }
    if (/^\s*$/.test(line)) { closeLists(); html.push(''); continue; }
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      closeLists();
      html.push('<hr class="my-4 border-zinc-200 dark:border-zinc-700" />');
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      closeLists();
      const level = hMatch[1].length;
      const sizeMap: Record<number, string> = { 1: 'text-2xl font-bold mt-5 mb-2', 2: 'text-xl font-bold mt-4 mb-2', 3: 'text-lg font-semibold mt-3 mb-1', 4: 'text-base font-semibold mt-2 mb-1', 5: 'text-sm font-semibold', 6: 'text-sm font-medium' };
      html.push(`<h${level} class="${sizeMap[level]}">${parseInline(hMatch[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      closeLists();
      html.push(`<blockquote class="my-2 border-s-4 border-zinc-300 ps-3 italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">${parseInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { html.push('</ol>'); inOl = false; }
      if (!inUl) { html.push('<ul class="my-2 list-disc space-y-1 ps-5 text-zinc-700 dark:text-zinc-300">'); inUl = true; }
      html.push(`<li>${parseInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (!inOl) { html.push('<ol class="my-2 list-decimal space-y-1 ps-5 text-zinc-700 dark:text-zinc-300">'); inOl = true; }
      html.push(`<li>${parseInline(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p class="my-2 leading-7 text-zinc-800 dark:text-zinc-200">${parseInline(line)}</p>`);
  }

  closeLists();
  if (inCodeBlock && codeBuffer.length > 0) {
    html.push(`<pre class="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100 my-3"><code>${codeBuffer.join('\n')}</code></pre>`);
  }

  return html.join('\n');
};

type ToolbarAction = {
  label: string;
  icon?: React.ReactNode;
  text?: string;
  title: string;
  command: 'heading' | 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'bullet' | 'numbered' | 'quote' | 'divider';
};

const toolbarGroups: ToolbarAction[][] = [
  [
    { label: 'H', text: 'H', title: 'Heading', command: 'heading' },
    { label: 'Bold', icon: <span className="font-black text-[13px]">B</span>, title: 'Bold (Ctrl+B)', command: 'bold' },
    { label: 'Italic', icon: <span className="italic text-[13px]">I</span>, title: 'Italic (Ctrl+I)', command: 'italic' },
    { label: 'Strike', icon: <span className="line-through text-[13px]">S</span>, title: 'Strikethrough', command: 'strike' },
  ],
  [
    { label: 'Code', icon: <FiCode className="size-3.5" />, title: 'Inline code', command: 'code' },
    { label: 'Link', icon: <FiLink className="size-3.5" />, title: 'Link', command: 'link' },
  ],
  [
    { label: 'Bullet list', icon: <FiList className="size-3.5" />, title: 'Bullet list', command: 'bullet' },
    { label: 'Numbered list', icon: <span className="text-[11px] font-semibold">1.</span>, title: 'Numbered list', command: 'numbered' },
    { label: 'Quote', icon: <FiHash className="size-3.5" />, title: 'Blockquote', command: 'quote' },
  ],
  [
    { label: 'Divider', icon: <FiMinus className="size-3.5" />, title: 'Horizontal rule', command: 'divider' },
  ],
];

export default function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder = 'Write using Markdown…',
  rows = 10,
  required,
  error,
  dir = 'ltr',
  hint,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewHtml = useMemo(() => markdownToHtml(value), [value]);
  const charCount = value.length;

  const wrapSelection = useCallback((prefix: string, suffix = prefix, defaultText = 'text') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || defaultText;
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = start + prefix.length + selected.length;
    });
  }, [value, onChange]);

  const insertPrefixPerLine = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || 'item';
    const updated = selected.split('\n').map((l) => `${prefix}${l}`).join('\n');
    const next = `${value.slice(0, start)}${updated}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start;
      ta.selectionEnd = start + updated.length;
    });
  }, [value, onChange]);

  const insertAtLineStart = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = pos + prefix.length;
      ta.selectionEnd = ta.selectionStart;
    });
  }, [value, onChange]);

  const handleToolbarAction = (command: ToolbarAction['command']) => {
    switch (command) {
      case 'heading': insertAtLineStart('## '); break;
      case 'bold': wrapSelection('**'); break;
      case 'italic': wrapSelection('*'); break;
      case 'strike': wrapSelection('~~'); break;
      case 'code': wrapSelection('`'); break;
      case 'link': wrapSelection('[', '](https://)'); break;
      case 'bullet': insertPrefixPerLine('- '); break;
      case 'numbered': insertPrefixPerLine('1. '); break;
      case 'quote': insertPrefixPerLine('> '); break;
      case 'divider': onChange(`${value}\n---\n`); break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b') { e.preventDefault(); wrapSelection('**'); }
      if (e.key === 'i') { e.preventDefault(); wrapSelection('*'); }
      if (e.key === 'k') { e.preventDefault(); wrapSelection('[', '](https://)'); }
    }
  };

  const borderCls = error
    ? 'border-rose-400 dark:border-rose-500'
    : 'border-zinc-200 dark:border-zinc-700 focus-within:border-[color:var(--noon-teal)] focus-within:ring-2 focus-within:ring-[color:var(--noon-teal)]/20';

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}

      <div className={`overflow-hidden rounded-xl border transition-all ${borderCls}`}>
        {/* Tab bar + toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/60">
          {/* Write / Preview tabs */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setTab('write')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                tab === 'write'
                  ? 'bg-[color:var(--noon-teal)] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <FiEdit3 className="size-3" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                tab === 'preview'
                  ? 'bg-[color:var(--noon-teal)] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <FiEye className="size-3" />
              Preview
            </button>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Toolbar buttons */}
          {tab === 'write' && toolbarGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {group.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  title={action.title}
                  onClick={() => handleToolbarAction(action.command)}
                  className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                >
                  {action.icon ?? <span className="text-[12px] font-semibold">{action.text}</span>}
                </button>
              ))}
              {gi < toolbarGroups.length - 1 && (
                <div className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
              )}
            </div>
          ))}
        </div>

        {/* Editor area */}
        {tab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder={placeholder}
            dir={dir}
            className="block w-full resize-y border-0 bg-white px-4 py-3 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
          />
        ) : (
          <div className="min-h-[160px] bg-white px-4 py-3 dark:bg-zinc-900" dir={dir}>
            {value.trim() ? (
              <article
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm italic text-zinc-400 dark:text-zinc-500">Nothing to preview.</p>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Markdown · <span className="font-medium">**bold**</span> · <span className="italic">*italic*</span> · <span className="font-mono">`code`</span> · <span>- list</span> · <span>## heading</span>
          </p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{charCount.toLocaleString()} chars</span>
        </div>
      </div>

      {(error || hint) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
