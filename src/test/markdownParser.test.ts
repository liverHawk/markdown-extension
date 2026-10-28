import * as assert from 'assert';
import { renderMarkdown } from '../markdownParser.js';

suite('Markdown Parser Test Suite', () => {
  test('Renders unchecked and checked task items with correct line numbers', () => {
    const md = `# Title
- [ ] First task
- [x] Second task
- Normal item
1. [ ] Ordered task`;

    const html = renderMarkdown(md);

    // Should contain task list classes
    assert.ok(html.includes('contains-task-list'), 'Should have contains-task-list class');
    assert.ok(html.includes('task-list-item'), 'Should have task-list-item class');

    // Check line 1 for first task
    assert.ok(html.includes('data-line="1"'), 'First task should map to line 1');
    // Check line 2 for second task
    assert.ok(
      html.includes('data-line="2" checked'),
      'Second task should map to line 2 and be checked'
    );
    // Check line 4 for ordered task
    assert.ok(html.includes('data-line="4"'), 'Ordered task should map to line 4');
  });

  test('Preserves markdown formatting inside task list item', () => {
    const md = `- [ ] Task with **bold** and \`inline code\``;
    const html = renderMarkdown(md);

    assert.ok(html.includes('<strong>bold</strong>'), 'Should format bold text');
    assert.ok(html.includes('<code>inline code</code>'), 'Should format inline code');
  });
});
