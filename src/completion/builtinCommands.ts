export interface LatexCommandDefinition {
  /** Command name without leading backslash (e.g. "frac", "alpha") */
  command: string;
  /** Snippet text without leading backslash (e.g. "frac{${1:num}}{${2:den}}") */
  snippet: string;
  /** Short description or symbol preview */
  detail: string;
  /** Category or documentation */
  documentation?: string;
}

export const BUILTIN_LATEX_COMMANDS: readonly LatexCommandDefinition[] = [
  // Greek letters (lowercase)
  { command: 'alpha', snippet: 'alpha', detail: 'α (Greek lowercase alpha)' },
  { command: 'beta', snippet: 'beta', detail: 'β (Greek lowercase beta)' },
  { command: 'gamma', snippet: 'gamma', detail: 'γ (Greek lowercase gamma)' },
  { command: 'delta', snippet: 'delta', detail: 'δ (Greek lowercase delta)' },
  { command: 'epsilon', snippet: 'epsilon', detail: 'ϵ (Greek lowercase epsilon)' },
  { command: 'varepsilon', snippet: 'varepsilon', detail: 'ε (Greek lowercase varepsilon)' },
  { command: 'zeta', snippet: 'zeta', detail: 'ζ (Greek lowercase zeta)' },
  { command: 'eta', snippet: 'eta', detail: 'η (Greek lowercase eta)' },
  { command: 'theta', snippet: 'theta', detail: 'θ (Greek lowercase theta)' },
  { command: 'vartheta', snippet: 'vartheta', detail: 'ϑ (Greek lowercase vartheta)' },
  { command: 'iota', snippet: 'iota', detail: 'ι (Greek lowercase iota)' },
  { command: 'kappa', snippet: 'kappa', detail: 'κ (Greek lowercase kappa)' },
  { command: 'lambda', snippet: 'lambda', detail: 'λ (Greek lowercase lambda)' },
  { command: 'mu', snippet: 'mu', detail: 'μ (Greek lowercase mu)' },
  { command: 'nu', snippet: 'nu', detail: 'ν (Greek lowercase nu)' },
  { command: 'xi', snippet: 'xi', detail: 'ξ (Greek lowercase xi)' },
  { command: 'pi', snippet: 'pi', detail: 'π (Greek lowercase pi)' },
  { command: 'rho', snippet: 'rho', detail: 'ρ (Greek lowercase rho)' },
  { command: 'sigma', snippet: 'sigma', detail: 'σ (Greek lowercase sigma)' },
  { command: 'tau', snippet: 'tau', detail: 'τ (Greek lowercase tau)' },
  { command: 'upsilon', snippet: 'upsilon', detail: 'υ (Greek lowercase upsilon)' },
  { command: 'phi', snippet: 'phi', detail: 'ϕ (Greek lowercase phi)' },
  { command: 'varphi', snippet: 'varphi', detail: 'φ (Greek lowercase varphi)' },
  { command: 'chi', snippet: 'chi', detail: 'χ (Greek lowercase chi)' },
  { command: 'psi', snippet: 'psi', detail: 'ψ (Greek lowercase psi)' },
  { command: 'omega', snippet: 'omega', detail: 'ω (Greek lowercase omega)' },

  // Greek letters (uppercase)
  { command: 'Gamma', snippet: 'Gamma', detail: 'Γ (Greek uppercase Gamma)' },
  { command: 'Delta', snippet: 'Delta', detail: 'Δ (Greek uppercase Delta)' },
  { command: 'Theta', snippet: 'Theta', detail: 'Θ (Greek uppercase Theta)' },
  { command: 'Lambda', snippet: 'Lambda', detail: 'Λ (Greek uppercase Lambda)' },
  { command: 'Xi', snippet: 'Xi', detail: 'Ξ (Greek uppercase Xi)' },
  { command: 'Pi', snippet: 'Pi', detail: 'Π (Greek uppercase Pi)' },
  { command: 'Sigma', snippet: 'Sigma', detail: 'Σ (Greek uppercase Sigma)' },
  { command: 'Upsilon', snippet: 'Upsilon', detail: 'Υ (Greek uppercase Upsilon)' },
  { command: 'Phi', snippet: 'Phi', detail: 'Φ (Greek uppercase Phi)' },
  { command: 'Psi', snippet: 'Psi', detail: 'Ψ (Greek uppercase Psi)' },
  { command: 'Omega', snippet: 'Omega', detail: 'Ω (Greek uppercase Omega)' },

  // Fractions, roots, superscripts/subscripts
  {
    command: 'frac',
    snippet: 'frac{${1:num}}{${2:den}}',
    detail: 'Fraction \\frac{num}{den}',
  },
  {
    command: 'dfrac',
    snippet: 'dfrac{${1:num}}{${2:den}}',
    detail: 'Display-style fraction \\dfrac{num}{den}',
  },
  {
    command: 'tfrac',
    snippet: 'tfrac{${1:num}}{${2:den}}',
    detail: 'Text-style fraction \\tfrac{num}{den}',
  },
  { command: 'sqrt', snippet: 'sqrt{${1:x}}', detail: 'Square root \\sqrt{x}' },
  { command: 'sqrtn', snippet: 'sqrt[${1:n}]{${2:x}}', detail: 'n-th root \\sqrt[n]{x}' },
  {
    command: 'binom',
    snippet: 'binom{${1:n}}{${2:k}}',
    detail: 'Binomial coefficient \\binom{n}{k}',
  },

  // Big operators & Calculus
  { command: 'sum', snippet: 'sum_{${1:i=1}}^{${2:n}}', detail: '∑ Summation with limits' },
  { command: 'prod', snippet: 'prod_{${1:i=1}}^{${2:n}}', detail: '∏ Product with limits' },
  { command: 'int', snippet: 'int_{${1:a}}^{${2:b}}', detail: '∫ Definite integral' },
  { command: 'oint', snippet: 'oint_{${1:C}}', detail: '∮ Contour integral' },
  { command: 'lim', snippet: 'lim_{${1:x \\to \\infty}}', detail: 'Limit \\lim_{x \\to \\infty}' },
  { command: 'partial', snippet: 'partial', detail: '∂ Partial derivative symbol' },
  { command: 'nabla', snippet: 'nabla', detail: '∇ Nabla / gradient operator' },
  { command: 'infty', snippet: 'infty', detail: '∞ Infinity symbol' },

  // Binary operators & Relations
  { command: 'times', snippet: 'times', detail: '× Multiplication cross' },
  { command: 'div', snippet: 'div', detail: '÷ Division sign' },
  { command: 'cdot', snippet: 'cdot', detail: '· Centered dot' },
  { command: 'pm', snippet: 'pm', detail: '± Plus-minus' },
  { command: 'mp', snippet: 'mp', detail: '∓ Minus-plus' },
  { command: 'leq', snippet: 'leq', detail: '≤ Less than or equal to' },
  { command: 'geq', snippet: 'geq', detail: '≥ Greater than or equal to' },
  { command: 'neq', snippet: 'neq', detail: '≠ Not equal to' },
  { command: 'approx', snippet: 'approx', detail: '≈ Approximately equal to' },
  { command: 'equiv', snippet: 'equiv', detail: '≡ Equivalent to' },
  { command: 'sim', snippet: 'sim', detail: '∼ Similar to' },
  { command: 'propto', snippet: 'propto', detail: '∝ Proportional to' },
  { command: 'll', snippet: 'll', detail: '≪ Much less than' },
  { command: 'gg', snippet: 'gg', detail: '≫ Much greater than' },

  // Sets & Logic
  { command: 'in', snippet: 'in', detail: '∈ Element of' },
  { command: 'notin', snippet: 'notin', detail: '∉ Not an element of' },
  { command: 'subset', snippet: 'subset', detail: '⊂ Proper subset' },
  { command: 'subseteq', snippet: 'subseteq', detail: '⊆ Subset or equal' },
  { command: 'supset', snippet: 'supset', detail: '⊃ Proper superset' },
  { command: 'supseteq', snippet: 'supseteq', detail: '⊇ Superset or equal' },
  { command: 'cup', snippet: 'cup', detail: '∪ Set union' },
  { command: 'cap', snippet: 'cap', detail: '∩ Set intersection' },
  { command: 'emptyset', snippet: 'emptyset', detail: '∅ Empty set' },
  { command: 'forall', snippet: 'forall', detail: '∀ Universal quantifier' },
  { command: 'exists', snippet: 'exists', detail: '∃ Existential quantifier' },
  { command: 'neg', snippet: 'neg', detail: '¬ Logical negation' },
  { command: 'land', snippet: 'land', detail: '∧ Logical AND' },
  { command: 'lor', snippet: 'lor', detail: '∨ Logical OR' },

  // Arrows
  { command: 'to', snippet: 'to', detail: '→ Right arrow' },
  { command: 'rightarrow', snippet: 'rightarrow', detail: '→ Right arrow' },
  { command: 'leftarrow', snippet: 'leftarrow', detail: '← Left arrow' },
  { command: 'leftrightarrow', snippet: 'leftrightarrow', detail: '↔ Left-right arrow' },
  { command: 'Rightarrow', snippet: 'Rightarrow', detail: '⇒ Double right arrow (Implies)' },
  { command: 'Leftarrow', snippet: 'Leftarrow', detail: '⇐ Double left arrow' },
  {
    command: 'Leftrightarrow',
    snippet: 'Leftrightarrow',
    detail: '⇔ Double left-right arrow (Iff)',
  },
  { command: 'implies', snippet: 'implies', detail: '⟹ Implies' },
  { command: 'iff', snippet: 'iff', detail: '⟺ If and only if' },
  { command: 'mapsto', snippet: 'mapsto', detail: '↦ Maps to' },

  // Dots
  { command: 'dots', snippet: 'dots', detail: '… Ellipsis' },
  { command: 'cdots', snippet: 'cdots', detail: '⋯ Centered ellipsis' },
  { command: 'ldots', snippet: 'ldots', detail: '… Lower ellipsis' },
  { command: 'vdots', snippet: 'vdots', detail: '⋮ Vertical ellipsis' },
  { command: 'ddots', snippet: 'ddots', detail: '⋱ Diagonal ellipsis' },

  // Fonts & Styles (Math & Text)
  { command: 'text', snippet: 'text{${1:text}}', detail: 'Plain text inside math' },
  { command: 'textbf', snippet: 'textbf{${1:text}}', detail: 'Bold text' },
  { command: 'textit', snippet: 'textit{${1:text}}', detail: 'Italic text' },
  { command: 'textrm', snippet: 'textrm{${1:text}}', detail: 'Roman text' },
  { command: 'texttt', snippet: 'texttt{${1:text}}', detail: 'Monospace text' },
  { command: 'emph', snippet: 'emph{${1:text}}', detail: 'Emphasized text' },
  { command: 'mathbf', snippet: 'mathbf{${1:x}}', detail: 'Bold math font' },
  { command: 'mathit', snippet: 'mathit{${1:x}}', detail: 'Italic math font' },
  { command: 'mathrm', snippet: 'mathrm{${1:x}}', detail: 'Roman upright math font' },
  { command: 'mathcal', snippet: 'mathcal{${1:L}}', detail: 'Calligraphic math font' },
  { command: 'mathbb', snippet: 'mathbb{${1:R}}', detail: 'Blackboard bold font (e.g. ℝ)' },
  { command: 'mathfrak', snippet: 'mathfrak{${1:g}}', detail: 'Fraktur math font' },
  { command: 'bm', snippet: 'bm{${1:x}}', detail: 'Bold math symbol' },

  // Accents & Decorations
  { command: 'hat', snippet: 'hat{${1:x}}', detail: 'Hat accent x̂' },
  { command: 'widehat', snippet: 'widehat{${1:xyz}}', detail: 'Wide hat accent' },
  { command: 'bar', snippet: 'bar{${1:x}}', detail: 'Bar accent x̄' },
  { command: 'overline', snippet: 'overline{${1:xyz}}', detail: 'Overline' },
  { command: 'underline', snippet: 'underline{${1:xyz}}', detail: 'Underline' },
  { command: 'tilde', snippet: 'tilde{${1:x}}', detail: 'Tilde accent x̃' },
  { command: 'widetilde', snippet: 'widetilde{${1:xyz}}', detail: 'Wide tilde accent' },
  { command: 'vec', snippet: 'vec{${1:v}}', detail: 'Vector arrow accent v⃗' },
  { command: 'dot', snippet: 'dot{${1:x}}', detail: 'Time derivative dot ẋ' },
  { command: 'ddot', snippet: 'ddot{${1:x}}', detail: 'Double dot ẍ' },

  // Delimiters
  { command: 'left(', snippet: 'left( ${1} \\right)', detail: 'Auto-sized parentheses ( ... )' },
  { command: 'left[', snippet: 'left[ ${1} \\right]', detail: 'Auto-sized brackets [ ... ]' },
  {
    command: 'left{',
    snippet: 'left\\{ ${1} \\right\\}',
    detail: 'Auto-sized curly braces { ... }',
  },
  { command: 'left|', snippet: 'left| ${1} \\right|', detail: 'Auto-sized vertical bars | ... |' },

  // Common Functions
  { command: 'sin', snippet: 'sin', detail: 'Sine function' },
  { command: 'cos', snippet: 'cos', detail: 'Cosine function' },
  { command: 'tan', snippet: 'tan', detail: 'Tangent function' },
  { command: 'log', snippet: 'log', detail: 'Logarithm' },
  { command: 'ln', snippet: 'ln', detail: 'Natural logarithm' },
  { command: 'exp', snippet: 'exp', detail: 'Exponential function' },
  { command: 'max', snippet: 'max', detail: 'Maximum' },
  { command: 'min', snippet: 'min', detail: 'Minimum' },
  { command: 'sup', snippet: 'sup', detail: 'Supremum' },
  { command: 'inf', snippet: 'inf', detail: 'Infimum' },
  { command: 'det', snippet: 'det', detail: 'Determinant' },
  { command: 'dim', snippet: 'dim', detail: 'Dimension' },
  { command: 'ker', snippet: 'ker', detail: 'Kernel' },
  { command: 'arg', snippet: 'arg', detail: 'Argument' },

  // Environments & Blocks
  {
    command: 'begin',
    snippet: 'begin{${1:environment}}\n\t$0\n\\end{${1:environment}}',
    detail: 'Generic \\begin{...} ... \\end{...} block',
  },
  {
    command: 'begin{equation}',
    snippet: 'begin{equation}\n\t$0\n\\end{equation}',
    detail: 'Equation environment',
  },
  {
    command: 'begin{align}',
    snippet: 'begin{align}\n\t$0\n\\end{align}',
    detail: 'Align environment',
  },
  {
    command: 'begin{aligned}',
    snippet: 'begin{aligned}\n\t$0\n\\end{aligned}',
    detail: 'Aligned math environment',
  },
  {
    command: 'begin{matrix}',
    snippet: 'begin{matrix}\n\t$0\n\\end{matrix}',
    detail: 'Matrix environment (no brackets)',
  },
  {
    command: 'begin{pmatrix}',
    snippet: 'begin{pmatrix}\n\t$0\n\\end{pmatrix}',
    detail: 'Parenthesized matrix ( ... )',
  },
  {
    command: 'begin{bmatrix}',
    snippet: 'begin{bmatrix}\n\t$0\n\\end{bmatrix}',
    detail: 'Bracketed matrix [ ... ]',
  },
  {
    command: 'begin{vmatrix}',
    snippet: 'begin{vmatrix}\n\t$0\n\\end{vmatrix}',
    detail: 'Determinant matrix | ... |',
  },
  {
    command: 'begin{cases}',
    snippet: 'begin{cases}\n\t$0\n\\end{cases}',
    detail: 'Piecewise cases environment',
  },
  {
    command: 'begin{itemize}',
    snippet: 'begin{itemize}\n\t\\item $0\n\\end{itemize}',
    detail: 'Bulleted list environment',
  },
  {
    command: 'begin{enumerate}',
    snippet: 'begin{enumerate}\n\t\\item $0\n\\end{enumerate}',
    detail: 'Numbered list environment',
  },
  {
    command: 'begin{figure}',
    snippet:
      'begin{figure}[${1:htbp}]\n\t\\centering\n\t\\includegraphics[width=${2:0.8}\\textwidth]{${3:file}}\n\t\\caption{${4:caption}}\n\t\\label{fig:${5:label}}\n\\end{figure}',
    detail: 'Figure environment',
  },
  {
    command: 'begin{table}',
    snippet:
      'begin{table}[${1:htbp}]\n\t\\centering\n\t\\caption{${2:caption}}\n\t\\label{tab:${3:label}}\n\t\\begin{tabular}{${4:c c}}\n\t\t$0\n\t\\end{tabular}\n\\end{table}',
    detail: 'Table environment',
  },

  // Document Structure & Citations (LaTeX files)
  {
    command: 'documentclass',
    snippet: 'documentclass[${1:options}]{${2:article}}',
    detail: 'Document class declaration',
  },
  {
    command: 'usepackage',
    snippet: 'usepackage{${1:package}}',
    detail: 'Include LaTeX package',
  },
  { command: 'section', snippet: 'section{${1:title}}', detail: 'Section heading' },
  { command: 'subsection', snippet: 'subsection{${1:title}}', detail: 'Subsection heading' },
  {
    command: 'subsubsection',
    snippet: 'subsubsection{${1:title}}',
    detail: 'Subsubsection heading',
  },
  { command: 'paragraph', snippet: 'paragraph{${1:title}}', detail: 'Paragraph heading' },
  { command: 'label', snippet: 'label{${1:key}}', detail: 'Label for cross-referencing' },
  { command: 'ref', snippet: 'ref{${1:key}}', detail: 'Reference to a label' },
  { command: 'eqref', snippet: 'eqref{${1:key}}', detail: 'Reference to an equation' },
  { command: 'cite', snippet: 'cite{${1:key}}', detail: 'Bibliographic citation' },
  { command: 'item', snippet: 'item ', detail: 'List item' },
  {
    command: 'newcommand',
    snippet: 'newcommand{\\${1:cmd}}[${2:1}]{${3:definition}}',
    detail: 'Define a new macro command',
  },
];

