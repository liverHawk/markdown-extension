import MarkdownIt from 'markdown-it';

/**
 * Creates and configures a MarkdownIt instance that renders GitHub-like HTML
 * with interactive checkboxes containing the source line numbers.
 */
export function createMarkdownRenderer(rawMarkdown: string): InstanceType<typeof MarkdownIt> {
  const lines = rawMarkdown.split(/\r?\n/);

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
  });

  md.core.ruler.after('inline', 'checklist-markdown-task-lists', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'inline') {
        continue;
      }

      // Check if previous token is paragraph_open (even if hidden in tight lists)
      if (i < 1 || tokens[i - 1].type !== 'paragraph_open') {
        continue;
      }

      // Find the corresponding list_item_open
      let listItemIndex = -1;
      for (let j = i - 2; j >= 0; j--) {
        if (tokens[j].type === 'list_item_open') {
          listItemIndex = j;
          break;
        }
        if (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open') {
          break;
        }
      }

      if (listItemIndex === -1) {
        continue;
      }

      const listItem = tokens[listItemIndex];
      const inlineToken = tokens[i];
      const content = inlineToken.content;

      // Matches [ ] or [x] or [X] at the beginning of the inline text
      const taskMatch = /^\[([ xX])\][ \t]+(.*)/s.exec(content);
      if (!taskMatch) {
        continue;
      }

      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const remainingText = taskMatch[2];

      // Determine accurate line number in original markdown
      let sourceLine = listItem.map ? listItem.map[0] : 0;
      if (listItem.map) {
        const start = listItem.map[0];
        const end = listItem.map[1];
        for (let l = start; l < end && l < lines.length; l++) {
          if (/^\s*(?:[-*+]|\d+\.)\s+\[[ xX]\]/.test(lines[l])) {
            sourceLine = l;
            break;
          }
        }
      }

      // Add task-list-item class to <li>
      const currentLiClass = String(listItem.attrGet('class') || '');
      listItem.attrSet(
        'class',
        (
          currentLiClass +
          (isChecked ? ' task-list-item task-list-item-checked' : ' task-list-item')
        ).trim()
      );

      // Find parent list (bullet_list_open or ordered_list_open) and add contains-task-list class
      for (let j = listItemIndex - 1; j >= 0; j--) {
        if (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open') {
          const listClass = String(tokens[j].attrGet('class') || '');
          if (!listClass.includes('contains-task-list')) {
            tokens[j].attrSet('class', (listClass + ' contains-task-list').trim());
          }
          break;
        }
      }

      // Update inline token content: remove the [ ] / [x] marker
      inlineToken.content = remainingText;
      if (inlineToken.children && inlineToken.children.length > 0) {
        const firstChild = inlineToken.children[0];
        if (firstChild.type === 'text') {
          firstChild.content = firstChild.content.replace(/^\[([ xX])\][ \t]*/, '');
        }
      }

      // Prepend an interactive checkbox token
      const checkboxToken = new state.Token('html_inline', '', 0);
      checkboxToken.content = `<input class="task-list-item-checkbox" type="checkbox" data-line="${sourceLine}" ${
        isChecked ? 'checked' : ''
      } aria-label="Task status" />`;

      inlineToken.children = [checkboxToken, ...(inlineToken.children || [])];
    }
  });

  return md;
}

/**
 * Renders the markdown string into GitHub-flavored HTML with interactive task list checkboxes.
 */
export function renderMarkdown(markdown: string): string {
  const md = createMarkdownRenderer(markdown);
  return md.render(markdown);
}
