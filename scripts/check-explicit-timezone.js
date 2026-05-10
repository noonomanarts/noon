const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_SUFFIXES = ['.backup'];
const IGNORE_FILES = new Set([path.join('src', 'lib', 'dateTime.ts')]);
const CALL_PATTERNS = ['Intl.DateTimeFormat(', '.toLocaleDateString(', '.toLocaleTimeString(', '.toLocaleString('];

function walk(dirPath, results = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, results);
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (IGNORE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;

    results.push(entryPath);
  }

  return results;
}

function getLineNumber(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === '\n') line += 1;
  }
  return line;
}

function extractCall(text, openParenIndex) {
  let depth = 0;
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openParenIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    const previous = text[index - 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (previous === '*' && char === '/') inBlockComment = false;
      continue;
    }

    if (quote) {
      if (char === quote && previous !== '\\') quote = null;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openParenIndex, index + 1);
      }
    }
  }

  return null;
}

function isAllowedFormatter(callText) {
  if (!callText) return true;
  if (/^\(\s*\)$/.test(callText)) return true;

  return /timeZone\s*:\s*(?:['"]Asia\/Muscat['"]|NOON_TIME_ZONE\b|DISPLAY_TIMEZONE\b|tz\b|TZ\b|process\.env\.[A-Z_]+)/.test(callText);
}

function findViolations(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  if (IGNORE_FILES.has(relativePath)) return [];

  const text = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  for (const pattern of CALL_PATTERNS) {
    let index = text.indexOf(pattern);
    while (index !== -1) {
      const openParenIndex = index + pattern.length - 1;
      const callText = extractCall(text, openParenIndex);
      if (callText && !isAllowedFormatter(callText)) {
        violations.push({
          filePath: relativePath,
          line: getLineNumber(text, index),
          snippet: `${pattern.slice(0, -1)}...`,
        });
      }
      index = text.indexOf(pattern, index + pattern.length);
    }
  }

  return violations;
}

const violations = walk(SRC_DIR).flatMap(findViolations);

if (violations.length > 0) {
  console.error('Explicit Muscat timezone is required for all date/time formatters.');
  for (const violation of violations) {
    console.error(`- ${violation.filePath}:${violation.line} ${violation.snippet}`);
  }
  process.exit(1);
}

console.log('Timezone guard passed.');