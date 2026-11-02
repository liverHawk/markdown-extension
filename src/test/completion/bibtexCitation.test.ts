import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  extractBibliographyPaths,
  extractCitationContext,
  loadBibtexEntriesForDocument,
  parseBibtex,
} from '../../completion/bibtexCitation.js';
import { LatexCompletionProvider } from '../../completion/latexCompletionProvider.js';

suite('BibTeX Citation Completion Test Suite', () => {
  test('extractCitationContext detects single and multi-key citation contexts', () => {
    assert.deepStrictEqual(extractCitationContext('See \\cite{'), {
      command: 'cite',
      keyPrefix: '',
      startCharacter: 10,
      existingKeys: [],
    });

    assert.deepStrictEqual(extractCitationContext('See \\cite{vasw'), {
      command: 'cite',
      keyPrefix: 'vasw',
      startCharacter: 10,
      existingKeys: [],
    });

    assert.deepStrictEqual(extractCitationContext('\\citep[p.~12]{smith2020, '), {
      command: 'citep',
      keyPrefix: '',
      startCharacter: 25,
      existingKeys: ['smith2020'],
    });

    assert.deepStrictEqual(
      extractCitationContext('\\parencite[see][p.~5]{smith2020, jones2021, do'),
      {
        command: 'parencite',
        keyPrefix: 'do',
        startCharacter: 44,
        existingKeys: ['smith2020', 'jones2021'],
      }
    );

    assert.deepStrictEqual(extractCitationContext('\\textcite*{key1'), {
      command: 'textcite*',
      keyPrefix: 'key1',
      startCharacter: 11,
      existingKeys: [],
    });

    // Should return undefined outside citation braces or in comments
    assert.strictEqual(extractCitationContext('\\cite{closed} and text'), undefined);
    assert.strictEqual(extractCitationContext('% \\cite{commented'), undefined);
    assert.strictEqual(extractCitationContext('\\section{title'), undefined);
  });

  test('extractBibliographyPaths extracts paths from \\bibliography and \\addbibresource', () => {
    const tex = [
      '\\documentclass{article}',
      '% \\bibliography{ignored}',
      '\\bibliography{refs, ./bib/extra.bib}',
      '\\addbibresource[location=remote]{https_refs.bib}',
      '\\addbibresource{refs.bib}', // duplicate of refs -> refs.bib
    ].join('\n');

    const paths = extractBibliographyPaths(tex);
    assert.deepStrictEqual(paths, ['refs.bib', './bib/extra.bib', 'https_refs.bib']);
  });

  test('parseBibtex parses entries with nested braces, quotes, and numbers', () => {
    const bib = `
@comment{This is a comment}
@string{cvpr = "IEEE CVPR"}
% @article{commented_out2020, title = {Should Be Ignored}, year = 2020}

@article{vaswani2017attention,
  title = {Attention Is All You Need},
  author = {Vaswani, Ashish and Shazeer, Noam},
  journal = {Advances in {Neural} Information Processing Systems},
  year = 2017
}

@inproceedings{he2016deep,
  author = "He, Kaiming and Zhang, Xiangyu",
  title = "Deep Residual Learning for Image Recognition",
  booktitle = "Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition",
  date = {2016-06-27}
}
`;

    const entries = parseBibtex(bib, 'refs.bib');
    assert.strictEqual(entries.length, 2);

    assert.deepStrictEqual(entries[0], {
      key: 'vaswani2017attention',
      entryType: 'article',
      title: 'Attention Is All You Need',
      author: 'Vaswani, Ashish and Shazeer, Noam',
      venue: 'Advances in Neural Information Processing Systems',
      year: '2017',
      sourceFile: 'refs.bib',
    });

    assert.deepStrictEqual(entries[1], {
      key: 'he2016deep',
      entryType: 'inproceedings',
      title: 'Deep Residual Learning for Image Recognition',
      author: 'He, Kaiming and Zhang, Xiangyu',
      venue: 'Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition',
      year: '2016',
      sourceFile: 'refs.bib',
    });
  });

  test('loadBibtexEntriesForDocument and LatexCompletionProvider return BibTeX citation items', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-md-bib-'));
    try {
      const bibPath = path.join(tmpDir, 'references.bib');
      fs.writeFileSync(
        bibPath,
        [
          '@article{einstein1905,',
          '  author = {Albert Einstein},',
          '  title = {On the Electrodynamics of Moving Bodies},',
          '  journal = {Annalen der Physik},',
          '  year = {1905}',
          '}',
          '@book{knuth1984,',
          '  author = {Donald E. Knuth},',
          '  title = {The TeXbook},',
          '  publisher = {Addison-Wesley},',
          '  year = 1984',
          '}',
        ].join('\n'),
        'utf8'
      );

      const texPath = path.join(tmpDir, 'paper.tex');
      fs.writeFileSync(
        texPath,
        [
          '\\documentclass{article}',
          '\\bibliography{references}',
          '\\begin{document}',
          'As shown in \\cite{ein}',
          'Multiple \\citep{einstein1905, }',
          '\\end{document}',
        ].join('\n'),
        'utf8'
      );

      const loaded = loadBibtexEntriesForDocument(fs.readFileSync(texPath, 'utf8'), tmpDir);
      assert.strictEqual(loaded.length, 2);

      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(texPath));
      const provider = new LatexCompletionProvider();

      // 1. Inside \cite{ein|
      const items1 = provider.provideCompletionItems(doc, new vscode.Position(3, 21));
      assert.ok(items1 && items1.length === 2, 'Should suggest both BibTeX keys on first argument');
      const einsteinItem = items1.find((item) => item.label === 'einstein1905');
      assert.ok(einsteinItem, 'Should include einstein1905');
      assert.strictEqual(einsteinItem.kind, vscode.CompletionItemKind.Reference);
      assert.ok(
        einsteinItem.detail?.includes('Albert Einstein') &&
          einsteinItem.detail?.includes('On the Electrodynamics of Moving Bodies'),
        'Detail should include author and title'
      );

      // 2. Inside \citep{einstein1905, | -> should filter out already cited einstein1905
      const items2 = provider.provideCompletionItems(doc, new vscode.Position(4, 30));
      assert.ok(items2 && items2.length === 1, 'Should exclude already cited key in same command');
      assert.strictEqual(items2[0].label, 'knuth1984');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
