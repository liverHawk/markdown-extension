import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  extractCommandPrefix,
  LatexCompletionProvider,
  resolveLatexCommands,
} from '../../completion/latexCompletionProvider.js';

suite('LaTeX Completion Provider Test Suite', () => {
  test('extractCommandPrefix detects backslash command before cursor', () => {
    assert.deepStrictEqual(extractCommandPrefix('Hello \\'), {
      prefix: '\\',
      startCharacter: 6,
    });
    assert.deepStrictEqual(extractCommandPrefix('$x + \\fra'), {
      prefix: '\\fra',
      startCharacter: 5,
    });
    assert.deepStrictEqual(extractCommandPrefix('\\begin{eq'), {
      prefix: '\\begin{eq',
      startCharacter: 0,
    });
    assert.strictEqual(extractCommandPrefix('plain text without backslash'), undefined);
    assert.strictEqual(extractCommandPrefix('\\command with space'), undefined);
    // Double backslash `\\` (line break) without trailing command chars should not trigger
    assert.strictEqual(extractCommandPrefix('x + y \\\\'), undefined);
    // Double backslash followed by command letters should match the command part
    assert.deepStrictEqual(extractCommandPrefix('x + y \\\\fra'), {
      prefix: '\\fra',
      startCharacter: 7,
    });
  });

  test('resolveLatexCommands includes built-in commands and merges custom commands', () => {
    const commands = resolveLatexCommands(true, {
      myvec: '\\mathbf{${1:v}}',
      '\\dudt': '\\frac{\\partial ${1:u}}{\\partial ${2:t}}',
      frac: 'dfrac{${1:a}}{${2:b}}',
    });

    const myvec = commands.find((c) => c.command === 'myvec');
    assert.ok(myvec, 'Should contain custom command without leading backslash');
    assert.strictEqual(myvec.snippet, 'mathbf{${1:v}}');

    const dudt = commands.find((c) => c.command === 'dudt');
    assert.ok(dudt, 'Should normalize custom command with leading backslash');
    assert.strictEqual(dudt.snippet, 'frac{\\partial ${1:u}}{\\partial ${2:t}}');

    const frac = commands.find((c) => c.command === 'frac');
    assert.ok(frac, 'Should override built-in command when key matches');
    assert.strictEqual(frac.snippet, 'dfrac{${1:a}}{${2:b}}');

    const alpha = commands.find((c) => c.command === 'alpha');
    assert.ok(alpha, 'Should still include built-in commands');
  });

  test('resolveLatexCommands can exclude built-in commands', () => {
    const commands = resolveLatexCommands(false, {
      customOnly: 'customOnly{${1:x}}',
    });
    assert.strictEqual(commands.length, 1);
    assert.strictEqual(commands[0].command, 'customOnly');
  });

  test('resolveLatexCommands filters out latexOnly commands in Markdown mode', () => {
    const latexCommands = resolveLatexCommands(true, {}, { isMarkdown: false });
    const markdownCommands = resolveLatexCommands(true, {}, { isMarkdown: true });

    assert.ok(
      latexCommands.some((c) => c.command === 'documentclass'),
      'LaTeX mode should include documentclass'
    );
    assert.ok(
      !markdownCommands.some((c) => c.command === 'documentclass'),
      'Markdown mode should exclude documentclass'
    );
    assert.ok(
      markdownCommands.some((c) => c.command === 'frac'),
      'Markdown mode should still include math commands like frac'
    );
  });

  test('LatexCompletionProvider provides completions in LaTeX document and Markdown math context', async () => {
    const provider = new LatexCompletionProvider();

    // 1. LaTeX document: always provides completions after `\`
    const latexDoc = await vscode.workspace.openTextDocument({
      language: 'latex',
      content: 'Here is \\fr',
    });
    const latexItems = provider.provideCompletionItems(latexDoc, new vscode.Position(0, 11));
    assert.ok(latexItems && latexItems.length > 0, 'Should return completion items in LaTeX file');
    const fracItem = latexItems.find((item) => item.label === '\\frac');
    assert.ok(fracItem, 'Should include \\frac in completion items');

    // 2. Markdown document outside math: returns undefined
    const mdOutsideDoc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: 'Normal text \\fr',
    });
    const mdOutsideItems = provider.provideCompletionItems(
      mdOutsideDoc,
      new vscode.Position(0, 15)
    );
    assert.strictEqual(
      mdOutsideItems,
      undefined,
      'Should not provide completions outside math in Markdown'
    );

    // 3. Markdown document inside math: returns completion items
    const mdInsideDoc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: 'Inline math $\\fr$',
    });
    const mdInsideItems = provider.provideCompletionItems(mdInsideDoc, new vscode.Position(0, 16));
    assert.ok(
      mdInsideItems && mdInsideItems.length > 0,
      'Should return completion items inside Markdown math'
    );
  });
});
