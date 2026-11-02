import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { LatexCompletionProvider } from '../../completion/latexCompletionProvider.js';
import {
  extractUsepackageContext,
  resolveLatexPackages,
} from '../../completion/latexPackageCompletion.js';

suite('LaTeX Package (\\usepackage) Completion Test Suite', () => {
  test('extractUsepackageContext detects single and multi-package contexts', () => {
    assert.deepStrictEqual(extractUsepackageContext('\\usepackage{'), {
      command: 'usepackage',
      packagePrefix: '',
      startCharacter: 12,
      existingPackages: [],
    });

    assert.deepStrictEqual(extractUsepackageContext('\\usepackage{ams'), {
      command: 'usepackage',
      packagePrefix: 'ams',
      startCharacter: 12,
      existingPackages: [],
    });

    assert.deepStrictEqual(extractUsepackageContext('\\usepackage[utf8]{amsmath, graph'), {
      command: 'usepackage',
      packagePrefix: 'graph',
      startCharacter: 27,
      existingPackages: ['amsmath'],
    });

    assert.deepStrictEqual(extractUsepackageContext('\\RequirePackage{tikz, '), {
      command: 'RequirePackage',
      packagePrefix: '',
      startCharacter: 22,
      existingPackages: ['tikz'],
    });

    assert.strictEqual(extractUsepackageContext('% \\usepackage{amsmath'), undefined);
    assert.strictEqual(extractUsepackageContext('\\usepackage{amsmath} text'), undefined);
    assert.strictEqual(extractUsepackageContext('\\\\usepackage{ams'), undefined);
  });

  test('resolveLatexPackages discovers local .sty files and merges built-in packages', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-sty-'));
    try {
      const styPath1 = path.join(tmpDir, 'mycustomstyle.sty');
      fs.writeFileSync(
        styPath1,
        [
          '\\NeedsTeXFormat{LaTeX2e}',
          '\\ProvidesPackage{mycustomstyle}[2026/11/02 v1.0 Custom Conference Macros]',
          '\\RequirePackage{amsmath}',
        ].join('\n'),
        'utf8'
      );

      const styPath2 = path.join(tmpDir, 'barestyle.sty');
      fs.writeFileSync(styPath2, '% simple style without ProvidesPackage\n', 'utf8');

      const packages = resolveLatexPackages(tmpDir, [], true);
      const customPkg = packages.find((p) => p.name === 'mycustomstyle');
      assert.ok(customPkg, 'Should include local mycustomstyle.sty');
      assert.strictEqual(customPkg.isLocal, true);
      assert.strictEqual(customPkg.sourceFile, 'mycustomstyle.sty');
      assert.ok(
        customPkg.detail.includes('2026/11/02 v1.0 Custom Conference Macros'),
        'Should extract description from \\ProvidesPackage'
      );

      const barePkg = packages.find((p) => p.name === 'barestyle');
      assert.ok(barePkg, 'Should include barestyle.sty');
      assert.strictEqual(barePkg.isLocal, true);

      const amsmathPkg = packages.find((p) => p.name === 'amsmath');
      assert.ok(amsmathPkg, 'Should also include built-in packages like amsmath');
      assert.strictEqual(amsmathPkg.isLocal, false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('LatexCompletionProvider suggests local .sty and built-in packages inside \\usepackage{...}', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-pkg-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'neurips_2026.sty'),
        '\\ProvidesPackage{neurips_2026}[2026/05/01 NeurIPS 2026 Style]\n',
        'utf8'
      );

      const texPath = path.join(tmpDir, 'main.tex');
      fs.writeFileSync(
        texPath,
        [
          '\\documentclass{article}',
          '\\usepackage{neu}',
          '\\usepackage{neurips_2026, }',
          '\\begin{document}',
          '\\end{document}',
        ].join('\n'),
        'utf8'
      );

      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(texPath));
      const provider = new LatexCompletionProvider();

      // 1. Inside \usepackage{neu|
      const items1 = provider.provideCompletionItems(doc, new vscode.Position(1, 15));
      assert.ok(items1 && items1.length > 0, 'Should return package completion items');
      const localItem = items1.find((item) => item.label === 'neurips_2026');
      assert.ok(localItem, 'Should include local neurips_2026.sty');
      assert.strictEqual(localItem.kind, vscode.CompletionItemKind.File);
      assert.ok(
        String(localItem.sortText).startsWith('0_'),
        'Local .sty files should be sorted before built-in packages'
      );

      // 2. Inside \usepackage{neurips_2026, | -> should exclude already listed neurips_2026
      const items2 = provider.provideCompletionItems(doc, new vscode.Position(2, 26));
      assert.ok(items2 && items2.length > 0);
      assert.ok(
        !items2.some((item) => item.label === 'neurips_2026'),
        'Should exclude already included package in the same \\usepackage command'
      );
      assert.ok(
        items2.some((item) => item.label === 'amsmath'),
        'Should still suggest other packages like amsmath'
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

