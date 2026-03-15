function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseInlineMarkdown(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-200/80 px-1.5 py-0.5 text-xs dark:bg-zinc-800">$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-coral underline underline-offset-2">$1</a>'
    );
}

export function markdownToSafeHtml(source: string): string {
  const escaped = escapeHtml(source);
  const lines = escaped.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        closeLists();
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        html.push(
          `<pre class="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100"><code>${codeBuffer.join("\n")}</code></pre>`
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
      html.push("");
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
      const title = parseInlineMarkdown(hMatch[2]);
      const classMap: Record<number, string> = {
        1: "text-2xl font-bold",
        2: "text-xl font-bold",
        3: "text-lg font-semibold",
        4: "text-base font-semibold",
        5: "text-sm font-semibold",
        6: "text-sm font-medium",
      };
      html.push(`<h${level} class="mt-5 mb-2 ${classMap[level]}">${title}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      closeLists();
      html.push(
        `<blockquote class="my-3 border-s-4 border-zinc-300 ps-3 italic text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">${parseInlineMarkdown(quoteMatch[1])}</blockquote>`
      );
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul class="my-2 list-disc space-y-1 ps-6">');
        inUl = true;
      }
      html.push(`<li>${parseInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol class="my-2 list-decimal space-y-1 ps-6">');
        inOl = true;
      }
      html.push(`<li>${parseInlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p class="my-2 leading-7 text-zinc-700 dark:text-zinc-300">${parseInlineMarkdown(line)}</p>`);
  }

  closeLists();

  if (inCodeBlock && codeBuffer.length > 0) {
    html.push(
      `<pre class="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100"><code>${codeBuffer.join("\n")}</code></pre>`
    );
  }

  return html.join("\n");
}
