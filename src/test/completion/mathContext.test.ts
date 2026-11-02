import * as assert from 'assert';
import { isInsideMathContext } from '../../completion/mathContext.js';

suite('Math Context Test Suite', () => {
  test('Returns true inside inline math $...$', () => {
    const text = 'The formula is $\\alpha + \\beta$ in text.';
    const offsetInside = text.indexOf('\\alpha') + 2;
    assert.strictEqual(isInsideMathContext(text, offsetInside), true);
  });

  test('Returns true inside unclosed inline math on the same line', () => {
    const text = 'Typing inline math $\\fr';
    assert.strictEqual(isInsideMathContext(text, text.length), true);
  });

  test('Returns false outside inline math', () => {
    const text = 'The formula is $x + y$ and here is \\text';
    assert.strictEqual(isInsideMathContext(text, text.length), false);
  });

  test('Returns false when inline math was not closed on previous line', () => {
    const text = 'Price is $100\nNext line \\alpha';
    assert.strictEqual(isInsideMathContext(text, text.length), false);
  });

  test('Returns true inside multiline block math $$...$$', () => {
    const text = '# Heading\n$$\n\\frac{1}{2}\n$$';
    const offsetInside = text.indexOf('\\frac') + 3;
    assert.strictEqual(isInsideMathContext(text, offsetInside), true);
  });

  test('Returns false after closed block math $$...$$', () => {
    const text = '$$\n\\frac{1}{2}\n$$\nOutside \\alpha';
    assert.strictEqual(isInsideMathContext(text, text.length), false);
  });

  test('Ignores escaped dollar signs \\$', () => {
    const text = 'This costs \\$100 and \\alpha';
    assert.strictEqual(isInsideMathContext(text, text.length), false);
  });

  test('Returns false inside inline code and fenced code blocks', () => {
    const inlineCode = 'Use `$\\alpha$` in markdown';
    const offsetInline = inlineCode.indexOf('\\alpha') + 2;
    assert.strictEqual(isInsideMathContext(inlineCode, offsetInline), false);

    const fencedCode = '```tex\n$\\alpha$\n```';
    const offsetFenced = fencedCode.indexOf('\\alpha') + 2;
    assert.strictEqual(isInsideMathContext(fencedCode, offsetFenced), false);
  });
});
