/**
 * Determines whether the given cursor offset in a Markdown document
 * is inside a math context (inline `$...$` or display `$$...$$`).
 */
export function isInsideMathContext(text: string, offset: number): boolean {
  const safeOffset = Math.min(Math.max(0, offset), text.length);

  let inFencedCode = false;
  let inInlineCode = false;
  let inBlockMath = false;
  let inInlineMath = false;
  let atLineStart = true;

  let i = 0;
  while (i < safeOffset) {
    const ch = text[i];

    // Handle line breaks
    if (ch === '\n') {
      inInlineMath = false;
      inInlineCode = false;
      atLineStart = true;
      i++;
      continue;
    }

    if (ch === '\r') {
      i++;
      continue;
    }

    // Check for fenced code block at line start (allowing up to 3 leading spaces or tabs)
    if (atLineStart) {
      if (ch === ' ' || ch === '\t') {
        i++;
        continue;
      }
      if (text.startsWith('```', i) || text.startsWith('~~~', i)) {
        if (!inBlockMath && !inInlineMath) {
          inFencedCode = !inFencedCode;
        }
        // Advance to end of fence marker
        i += 3;
        atLineStart = false;
        continue;
      }
      atLineStart = false;
    }

    // Ignore everything inside fenced code blocks
    if (inFencedCode) {
      i++;
      continue;
    }

    // Handle inline code backticks when not in math mode
    if (!inBlockMath && !inInlineMath && ch === '`') {
      inInlineCode = !inInlineCode;
      i++;
      continue;
    }

    if (inInlineCode) {
      i++;
      continue;
    }

    // Handle backslash escapes (e.g. \$, \\, \`)
    if (ch === '\\') {
      if (i + 1 < safeOffset && text[i + 1] !== '\n' && text[i + 1] !== '\r') {
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Handle display math $$
    if (ch === '$' && i + 1 < safeOffset && text[i + 1] === '$') {
      if (!inInlineMath) {
        inBlockMath = !inBlockMath;
      }
      i += 2;
      continue;
    }

    // Handle single $ when at the very end before cursor:
    // If the user typed `$$` and cursor is right after the second `$`, the loop condition
    // `i + 1 < safeOffset` handles both `$`.
    if (ch === '$') {
      if (!inBlockMath) {
        inInlineMath = !inInlineMath;
      }
      i++;
      continue;
    }

    i++;
  }

  return inBlockMath || inInlineMath;
}

