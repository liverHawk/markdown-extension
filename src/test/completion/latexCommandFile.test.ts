import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  loadCommandsFromFiles,
  parseLatexCommandDefinitions,
  resolveCommandFilePaths,
} from '../../completion/latexCommandFile.js';
import {
  LatexCompletionProvider,
  resolveLatexCommands,
} from '../../completion/latexCompletionProvider.js';
import {
  buildPackageIndex,
  detectTexliveRoot,
  extractDocumentTexlivePackages,
  resolveTexlivePackageFiles,
} from '../../completion/texliveLocator.js';

suite('LaTeX Command File & TeX Live Completion Test Suite', () => {
  test('parseLatexCommandDefinitions parses newcommand, DeclareMathOperator, DeclarePairedDelimiter, and def', () => {
    const content = [
      '% \\newcommand{\\ignored}{should not be parsed}',
      '\\newcommand{\\R}{\\mathbb{R}}',
      '\\newcommand\\Z{\\mathbb{Z}}',
      '\\newcommand*\\norm[1]{\\left\\lVert #1 \\right\\rVert}',
      '\\renewcommand{\\inner}[2]{\\langle #1, #2 \\rangle}',
      '\\providecommand{\\deriv}[2][x]{\\frac{d #2}{d #1}}',
      '\\newcommand{\\interval}[2][{[0,1]}]{#1 \\to #2}',
      '\\DeclareRobustCommand{\\robustcmd}[1]{\\textbf{#1}}',
      '\\DeclareMathOperator{\\argmin}{arg\\,min}',
      '\\DeclareMathOperator*{\\argmax}{arg\\,max}',
      '\\DeclarePairedDelimiter{\\abs}{\\lvert}{\\rvert}',
      '\\def\\myvec#1#2{\\mathbf{#1}_{#2}}',
      '\\newcommand{\\@internal}[1]{#1}',
      '\\def\\foo@bar{secret}',
    ].join('\n');

    const defs = parseLatexCommandDefinitions(content, 'macros.sty');
    const byName = new Map(defs.map((d) => [d.command, d]));

    assert.strictEqual(byName.has('ignored'), false, 'Should ignore commented definitions');
    assert.strictEqual(byName.has('@internal'), false, 'Should ignore @ internal commands');
    assert.strictEqual(byName.has('foo@bar'), false, 'Should ignore @ internal def');

    const rCmd = byName.get('R');
    assert.ok(rCmd);
    assert.strictEqual(rCmd.snippet, 'R');
    assert.ok(rCmd.detail.includes('macros.sty'));
    assert.ok(rCmd.detail.includes('\\mathbb{R}'));

    const zCmd = byName.get('Z');
    assert.ok(zCmd);
    assert.strictEqual(zCmd.snippet, 'Z');

    const normCmd = byName.get('norm');
    assert.ok(normCmd);
    assert.strictEqual(normCmd.snippet, 'norm{${1:arg1}}');

    const innerCmd = byName.get('inner');
    assert.ok(innerCmd);
    assert.strictEqual(innerCmd.snippet, 'inner{${1:arg1}}{${2:arg2}}');

    const derivCmd = byName.get('deriv');
    assert.ok(derivCmd);
    assert.strictEqual(derivCmd.snippet, 'deriv[${1:x}]{${2:arg2}}');

    const intervalCmd = byName.get('interval');
    assert.ok(intervalCmd);
    assert.strictEqual(intervalCmd.snippet, 'interval[${1:{[0,1]\\}}]{${2:arg2}}');

    const robustCmd = byName.get('robustcmd');
    assert.ok(robustCmd);
    assert.strictEqual(robustCmd.snippet, 'robustcmd{${1:arg1}}');

    const argminCmd = byName.get('argmin');
    assert.ok(argminCmd);
    assert.strictEqual(argminCmd.snippet, 'argmin');
    assert.ok(argminCmd.detail.includes('Math operator'));

    const argmaxCmd = byName.get('argmax');
    assert.ok(argmaxCmd);
    assert.strictEqual(argmaxCmd.snippet, 'argmax');

    const absCmd = byName.get('abs');
    assert.ok(absCmd);
    assert.strictEqual(absCmd.snippet, 'abs{${1:arg1}}');
    assert.ok(absCmd.detail.includes('Paired delimiter'));

    const myvecCmd = byName.get('myvec');
    assert.ok(myvecCmd);
    assert.strictEqual(myvecCmd.snippet, 'myvec{${1:arg1}}{${2:arg2}}');
  });

  test('loadCommandsFromFiles caches by mtime and reloads when file changes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-cmdfile-'));
    try {
      const styPath = path.join(tmpDir, 'custom.sty');
      fs.writeFileSync(styPath, '\\newcommand{\\firstcmd}{\\alpha}\n', 'utf8');

      const firstLoad = loadCommandsFromFiles([styPath]);
      assert.strictEqual(firstLoad.length, 1);
      assert.strictEqual(firstLoad[0].command, 'firstcmd');

      // Update file content and bump mtime
      fs.writeFileSync(
        styPath,
        '\\newcommand{\\firstcmd}{\\beta}\n\\newcommand{\\secondcmd}[1]{#1}\n',
        'utf8'
      );
      const futureTime = new Date(Date.now() + 5000);
      fs.utimesSync(styPath, futureTime, futureTime);

      const secondLoad = loadCommandsFromFiles([styPath]);
      assert.strictEqual(secondLoad.length, 2);
      assert.ok(secondLoad.some((c) => c.command === 'secondcmd'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('resolveCommandFilePaths discovers workspace, document dir, referenced, and configured files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-resolve-'));
    try {
      const subDir = path.join(tmpDir, 'sub');
      const extraDir = path.join(tmpDir, 'extra');
      fs.mkdirSync(subDir);
      fs.mkdirSync(extraDir);

      const rootSty = path.join(tmpDir, 'rootmacros.sty');
      const subTex = path.join(subDir, ' defs.tex');
      const extraSty = path.join(extraDir, 'extramacros.sty');
      fs.writeFileSync(rootSty, '\\newcommand{\\rootcmd}{1}\n', 'utf8');
      fs.writeFileSync(subTex, '\\newcommand{\\subcmd}{2}\n', 'utf8');
      fs.writeFileSync(extraSty, '\\newcommand{\\extracmd}{3}\n', 'utf8');

      const docText = '\\input{sub/ defs}\n';
      const resolved = resolveCommandFilePaths(docText, tmpDir, [tmpDir], ['extra']);

      assert.ok(resolved.includes(path.resolve(rootSty)));
      assert.ok(resolved.includes(path.resolve(subTex)));
      assert.ok(resolved.includes(path.resolve(extraSty)));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('TeX Live locator detects latest year and resolves packages from texmf-dist/tex/latex', () => {
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-texlive-'));
    try {
      const tl2025 = path.join(tmpBase, '2025');
      const tl2026 = path.join(tmpBase, '2026');
      const pkgDir = path.join(tl2026, 'texmf-dist', 'tex', 'latex', 'mypkg');
      const clsDir = path.join(tl2026, 'texmf-dist', 'tex', 'latex', 'base');
      fs.mkdirSync(tl2025, { recursive: true });
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.mkdirSync(clsDir, { recursive: true });

      const styFile = path.join(pkgDir, 'mypkg.sty');
      const clsFile = path.join(clsDir, 'mycls.cls');
      fs.writeFileSync(styFile, '\\newcommand{\\tlpkgcmd}[1]{\\mathcal{#1}}\n', 'utf8');
      fs.writeFileSync(clsFile, '\\newcommand{\\tlclscmd}{\\textbf{Class}}\n', 'utf8');

      const detected = detectTexliveRoot('', '', [tmpBase]);
      assert.strictEqual(detected, tl2026, 'Should auto-detect the latest year (2026)');

      const index = buildPackageIndex(tl2026);
      assert.ok(index.has('mypkg'));
      assert.ok(index.has('mycls.cls'));

      const docText = [
        '\\documentclass[11pt]{mycls}',
        '\\usepackage{amsmath, mypkg}',
        '% \\usepackage{commentedpkg}',
      ].join('\n');

      const extracted = extractDocumentTexlivePackages(docText);
      assert.deepStrictEqual(extracted, ['mycls.cls', 'amsmath', 'mypkg']);

      const resolvedFiles = resolveTexlivePackageFiles(extracted, tl2026);
      assert.strictEqual(resolvedFiles.length, 2);
      assert.ok(resolvedFiles.includes(styFile));
      assert.ok(resolvedFiles.includes(clsFile));

      const commands = loadCommandsFromFiles(resolvedFiles);
      assert.ok(commands.some((c) => c.command === 'tlpkgcmd'));
      assert.ok(commands.some((c) => c.command === 'tlclscmd'));
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });

  test('resolveLatexCommands enforces priority: built-in < TeX Live < local file < customCommands', () => {
    const merged = resolveLatexCommands(
      true,
      { cmdA: 'customA' },
      {
        texliveCommands: [
          { command: 'cmdA', snippet: 'texliveA', detail: 'from texlive' },
          { command: 'cmdB', snippet: 'texliveB', detail: 'from texlive' },
          { command: 'frac', snippet: 'texliveFrac', detail: 'override builtin' },
        ],
        fileCommands: [
          { command: 'cmdA', snippet: 'fileA', detail: 'from file' },
          { command: 'cmdB', snippet: 'fileB', detail: 'from file' },
        ],
      }
    );

    const byName = new Map(merged.map((c) => [c.command, c]));
    assert.strictEqual(byName.get('cmdA')?.snippet, 'customA');
    assert.strictEqual(byName.get('cmdB')?.snippet, 'fileB');
    assert.strictEqual(byName.get('frac')?.snippet, 'texliveFrac');
  });

  test('LatexCompletionProvider suggests commands from local .sty and current document', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-provider-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'macros.sty'),
        '\\newcommand{\\Expect}[1]{\\mathbb{E}\\left[#1\\right]}\n',
        'utf8'
      );

      const texPath = path.join(tmpDir, 'paper.tex');
      fs.writeFileSync(
        texPath,
        [
          '\\documentclass{article}',
          '\\usepackage{macros}',
          '\\newcommand{\\LocalMacro}{\\mathcal{L}}',
          '\\begin{document}',
          '\\Ex',
          '\\end{document}',
        ].join('\n'),
        'utf8'
      );

      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(texPath));
      const provider = new LatexCompletionProvider();
      const items = provider.provideCompletionItems(doc, new vscode.Position(4, 3));

      assert.ok(items && items.length > 0);
      const expectItem = items.find((i) => i.label === '\\Expect');
      assert.ok(expectItem, 'Should suggest \\Expect from macros.sty');
      assert.strictEqual(
        (expectItem.insertText as vscode.SnippetString).value,
        '\\Expect{${1:arg1}}'
      );

      const localItem = items.find((i) => i.label === '\\LocalMacro');
      assert.ok(localItem, 'Should suggest \\LocalMacro defined in the current document');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
