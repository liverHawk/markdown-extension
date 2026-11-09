import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { LatexCompletionProvider } from '../../completion/latexCompletionProvider.js';
import {
  extractIncludedTexPaths,
  extractRefContext,
  extractTexRootComment,
  loadLabelsForDocument,
  parseLatexLabels,
} from '../../completion/latexRefCompletion.js';

suite('LaTeX Reference (\\ref) Completion Test Suite', () => {
  test('extractRefContext detects single, multi-key, starred, and hyperref contexts', () => {
    assert.deepStrictEqual(extractRefContext('See Section~\\ref{'), {
      command: 'ref',
      keyPrefix: '',
      startCharacter: 17,
      existingKeys: [],
    });

    assert.deepStrictEqual(extractRefContext('Equation~\\eqref{eq:eul'), {
      command: 'eqref',
      keyPrefix: 'eq:eul',
      startCharacter: 16,
      existingKeys: [],
    });

    assert.deepStrictEqual(extractRefContext('\\autoref*{fig:arch'), {
      command: 'autoref*',
      keyPrefix: 'fig:arch',
      startCharacter: 10,
      existingKeys: [],
    });

    assert.deepStrictEqual(extractRefContext('\\cref{sec:intro, fig:model'), {
      command: 'cref',
      keyPrefix: 'fig:model',
      startCharacter: 17,
      existingKeys: ['sec:intro'],
    });

    assert.deepStrictEqual(extractRefContext('\\Cref{tab:one, tab:two, '), {
      command: 'Cref',
      keyPrefix: '',
      startCharacter: 24,
      existingKeys: ['tab:one', 'tab:two'],
    });

    assert.deepStrictEqual(extractRefContext('\\hyperref[sec:method'), {
      command: 'hyperref',
      keyPrefix: 'sec:method',
      startCharacter: 10,
      existingKeys: [],
    });

    assert.strictEqual(extractRefContext('% \\ref{sec:ignored'), undefined);
    assert.strictEqual(extractRefContext('\\ref{sec:closed} text'), undefined);
    assert.strictEqual(extractRefContext('\\\\ref{sec:linebreak'), undefined);
  });

  test('parseLatexLabels extracts labels with section, caption, and equation context', () => {
    const tex = [
      '% \\label{sec:commented}',
      '\\section{Introduction}',
      '\\label{sec:intro}',
      '',
      '\\begin{figure}[t]',
      '  \\centering',
      '  \\includegraphics{arch.pdf}',
      '  \\caption{Overall architecture of \\textbf{PaperFlow}.}',
      '  \\label{fig:arch}',
      '\\end{figure}',
      '',
      '\\begin{equation}',
      '  \\mathcal{L} = \\sum_{i=1}^N (y_i - \\hat{y}_i)^2 \\label[equation]{eq:loss}',
      '\\end{equation}',
    ].join('\n');

    const labels = parseLatexLabels(tex, 'main.tex');
    assert.strictEqual(labels.length, 3);

    assert.deepStrictEqual(labels[0], {
      key: 'sec:intro',
      line: 3,
      context: 'section: Introduction',
      sourceFile: 'main.tex',
    });

    assert.deepStrictEqual(labels[1], {
      key: 'fig:arch',
      line: 9,
      context: 'Caption: Overall architecture of \\textbf{PaperFlow}.',
      sourceFile: 'main.tex',
    });

    assert.strictEqual(labels[2].key, 'eq:loss');
    assert.strictEqual(labels[2].line, 13);
    assert.ok(labels[2].context?.includes('\\mathcal{L}'));
  });

  test('extractIncludedTexPaths and extractTexRootComment parse multi-file directives', () => {
    const tex = [
      '% !TEX root = ../main.tex',
      '\\input{sections/intro}',
      '% \\input{sections/commented}',
      '\\include{sections/method.tex}',
      '\\subfile{chapters/exp}',
      '\\import{chapters/}{conclusion.tex}',
    ].join('\n');

    assert.strictEqual(extractTexRootComment(tex), '../main.tex');
    assert.deepStrictEqual(extractIncludedTexPaths(tex), [
      'sections/intro',
      'sections/method.tex',
      'chapters/exp',
      'chapters/conclusion.tex',
    ]);
  });

  test('loadLabelsForDocument and LatexCompletionProvider suggest labels across split .tex files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-ref-'));
    try {
      const sectionsDir = path.join(tmpDir, 'sections');
      fs.mkdirSync(sectionsDir, { recursive: true });

      const mainTexPath = path.join(tmpDir, 'main.tex');
      const introTexPath = path.join(sectionsDir, 'intro.tex');
      const methodTexPath = path.join(sectionsDir, 'method.tex');
      const appendixTexPath = path.join(sectionsDir, 'appendix.tex');

      fs.writeFileSync(
        mainTexPath,
        [
          '\\documentclass{article}',
          '\\begin{document}',
          '\\section{Overview}\\label{sec:overview}',
          '\\input{sections/intro}',
          '\\include{sections/method}',
          '\\end{document}',
        ].join('\n'),
        'utf8'
      );

      fs.writeFileSync(
        introTexPath,
        [
          '\\subsection{Background}',
          '\\label{sec:background}',
          '\\begin{figure}',
          '  \\caption{Motivation diagram}',
          '  \\label{fig:motivation}',
          '\\end{figure}',
          '\\input{sections/appendix}',
        ].join('\n'),
        'utf8'
      );

      fs.writeFileSync(
        appendixTexPath,
        [
          '\\section{Appendix}',
          '\\label{sec:appendix}',
          '\\begin{equation}',
          '  E = mc^2 \\label{eq:einstein}',
          '\\end{equation}',
        ].join('\n'),
        'utf8'
      );

      fs.writeFileSync(
        methodTexPath,
        [
          '\\section{Proposed Method}',
          '\\label{sec:method}',
          'As discussed in Section~\\ref{sec:',
          'And shown in \\cref{sec:overview, ',
        ].join('\n'),
        'utf8'
      );

      // 1. Test from subfile (sections/method.tex) referencing labels in main.tex, intro.tex, and appendix.tex
      const methodDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(methodTexPath));
      const provider = new LatexCompletionProvider();

      const items1 = provider.provideCompletionItems(methodDoc, new vscode.Position(2, 33));
      assert.ok(items1 && items1.length >= 6, 'Should collect labels across all split .tex files');

      const keys1 = items1.map((item) => item.label);
      assert.ok(keys1.includes('sec:method'), 'Should include label from current file');
      assert.ok(keys1.includes('sec:overview'), 'Should include label from parent main.tex');
      assert.ok(keys1.includes('sec:background'), 'Should include label from sibling intro.tex');
      assert.ok(keys1.includes('fig:motivation'), 'Should include figure label from intro.tex');
      assert.ok(
        keys1.includes('sec:appendix'),
        'Should include label from nested input appendix.tex'
      );
      assert.ok(keys1.includes('eq:einstein'), 'Should include equation label from appendix.tex');

      const motivationItem = items1.find((item) => item.label === 'fig:motivation');
      assert.ok(motivationItem);
      assert.strictEqual(motivationItem.kind, vscode.CompletionItemKind.Reference);
      assert.ok(
        motivationItem.detail?.includes('Motivation diagram'),
        'Detail should show figure caption context'
      );

      // 2. Test multi-key \cref{sec:overview, | -> should filter out already-referenced sec:overview
      const items2 = provider.provideCompletionItems(methodDoc, new vscode.Position(3, 33));
      assert.ok(items2);
      assert.ok(
        !items2.some((item) => item.label === 'sec:overview'),
        'Should exclude already listed label in same \\cref command'
      );
      assert.ok(
        items2.some((item) => item.label === 'sec:background'),
        'Should still suggest other labels'
      );

      // 3. Test direct loadLabelsForDocument from main.tex
      const mainLabels = loadLabelsForDocument(
        fs.readFileSync(mainTexPath, 'utf8'),
        tmpDir,
        [tmpDir],
        mainTexPath
      );
      assert.strictEqual(mainLabels.length, 6);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
