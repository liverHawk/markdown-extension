import * as assert from 'assert';
import {
  computeLatexSectionNumbers,
  stripLatexComment,
} from '../../editor/sectionNumberDecorator.js';

suite('LaTeX Section Number Decorator Test Suite', () => {
  test('stripLatexComment strips unescaped % comments and preserves \\%', () => {
    assert.strictEqual(stripLatexComment('\\section{Intro} % comment'), '\\section{Intro} ');
    assert.strictEqual(stripLatexComment('% \\section{Commented}'), '');
    assert.strictEqual(
      stripLatexComment('\\section{100\\% Pure} % trailing'),
      '\\section{100\\% Pure} '
    );
    assert.strictEqual(stripLatexComment('Line break \\\\% comment'), 'Line break \\\\');
  });

  test('computeLatexSectionNumbers numbers hierarchical sections sequentially', () => {
    const tex = [
      '\\documentclass{article}',
      '\\begin{document}',
      '\\section{Introduction}',
      'Some text here.',
      '\\subsection{Background}',
      '\\subsubsection{Prior Work}',
      '\\subsubsection{Motivation}',
      '\\subsection{Contributions}',
      '\\section[Short]{Methodology}',
      '\\subsection{Architecture}',
      '\\end{document}',
    ].join('\n');

    const entries = computeLatexSectionNumbers(tex);
    assert.deepStrictEqual(entries, [
      { line: 2, level: 'section', numberText: '1' },
      { line: 4, level: 'subsection', numberText: '1.1' },
      { line: 5, level: 'subsubsection', numberText: '1.1.1' },
      { line: 6, level: 'subsubsection', numberText: '1.1.2' },
      { line: 7, level: 'subsection', numberText: '1.2' },
      { line: 8, level: 'section', numberText: '2' },
      { line: 9, level: 'subsection', numberText: '2.1' },
    ]);
  });

  test('computeLatexSectionNumbers ignores starred sections, comments, and macro redefinitions', () => {
    const tex = [
      '\\renewcommand{\\section}{\\@startsection}',
      '\\section*{Preface}',
      '% \\section{Commented Out}',
      '\\section{First Real Section}',
      '\\subsection*{Unnumbered Subsection}',
      '\\subsection{Numbered Subsection}',
      '\\subsubsection*{Unnumbered Subsubsection}',
      '\\subsubsection{Numbered Subsubsection}',
      '\\\\section{Escaped Backslash}',
    ].join('\n');

    const entries = computeLatexSectionNumbers(tex);
    assert.deepStrictEqual(entries, [
      { line: 3, level: 'section', numberText: '1' },
      { line: 5, level: 'subsection', numberText: '1.1' },
      { line: 7, level: 'subsubsection', numberText: '1.1.1' },
    ]);
  });
});
