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

  test('Contains hierarchical sticky heading styles for level 2 and level 3', () => {
    const css = getStyles();

    // Level 2 should stick to top (0px) with z-index: 20
    assert.ok(
      css.includes('h2.sticky-heading') || css.includes('h2,'),
      'CSS should define h2 sticky heading'
    );
    assert.ok(css.includes('z-index: 20;'), 'H2 should have higher z-index (20)');

    // Level 3 should stick below level 2 using --sticky-top-h3 variable
    assert.ok(
      css.includes('h3.sticky-heading') || css.includes('h3,'),
      'CSS should define h3 sticky heading'
    );
    assert.ok(
      css.includes('--sticky-top-h3'),
      'H3 should reference --sticky-top-h3 offset variable'
    );
    assert.ok(
      css.includes('.markdown-section'),
      'CSS should define .markdown-section relative positioning'
    );
  });

  test('Contains base GitHub theme variables', () => {
    const css = getStyles();

    assert.ok(css.includes('--gh-bg:'), 'CSS should define --gh-bg variable');
    assert.ok(css.includes('--gh-fg:'), 'CSS should define --gh-fg variable');
    assert.ok(css.includes('.checklist-header'), 'CSS should include header styles');
  });
});
