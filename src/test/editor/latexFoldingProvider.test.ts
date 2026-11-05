import * as assert from 'assert';
import { computeLatexSectionFoldingSpans } from '../../editor/latexFoldingProvider.js';

suite('LaTeX Section Folding Provider Test Suite', () => {
  test('computes nested folding ranges for section, subsection, and subsubsection', () => {
    const tex = [
      '\\documentclass{article}', // 0
      '\\begin{document}', // 1
      '\\section{Introduction}', // 2
      'Intro paragraph.', // 3
      '', // 4
      '\\subsection{Background}', // 5
      'Background text.', // 6
      '\\subsubsection{Details}', // 7
      'Detail line 1.', // 8
      'Detail line 2.', // 9
      '', // 10
      '\\subsection{Motivation}', // 11
      'Motivation text.', // 12
      '', // 13
      '\\section*{Acknowledgments}', // 14
      'Thanks to everyone.', // 15
      '\\end{document}', // 16
      '\\section{Draft After End Document}', // 17
      'Ignored draft content.', // 18
    ].join('\n');

    const spans = computeLatexSectionFoldingSpans(tex);
    assert.deepStrictEqual(spans, [
      { start: 2, end: 12, level: 'section' },
      { start: 5, end: 9, level: 'subsection' },
      { start: 7, end: 9, level: 'subsubsection' },
      { start: 11, end: 12, level: 'subsection' },
      { start: 14, end: 15, level: 'section' },
    ]);
  });

  test('ignores commented sections and closes at EOF when \\end{document} is absent', () => {
    const tex = [
      '\\section{First}', // 0
      '% \\section{Commented}', // 1
      'Body of first.', // 2
      '\\section{Second}', // 3
      'Body of second.', // 4
    ].join('\n');

    const spans = computeLatexSectionFoldingSpans(tex);
    assert.deepStrictEqual(spans, [
      { start: 0, end: 2, level: 'section' },
      { start: 3, end: 4, level: 'section' },
    ]);
  });
});
