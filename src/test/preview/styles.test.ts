import * as assert from 'assert';
import { getStyles } from '../../preview/styles.js';

suite('Styles Test Suite', () => {
  test('Contains sticky heading styling and background color', () => {
    const css = getStyles();

    // Verify sticky heading styles
    assert.ok(css.includes('position: sticky;'), 'Headings should have position: sticky');
    assert.ok(css.includes('top: 0;'), 'Headings should stick to top: 0');
    assert.ok(
      css.includes('background-color: var(--gh-bg);'),
      'Headings should have background color to prevent text bleed'
    );
    assert.ok(css.includes('z-index: 10;'), 'Headings should have z-index: 10');
  });

  test('Contains base GitHub theme variables', () => {
    const css = getStyles();

    assert.ok(css.includes('--gh-bg:'), 'CSS should define --gh-bg variable');
    assert.ok(css.includes('--gh-fg:'), 'CSS should define --gh-fg variable');
    assert.ok(css.includes('.checklist-header'), 'CSS should include header styles');
  });
});
