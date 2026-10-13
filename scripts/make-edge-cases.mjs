// Generates src/fixtures/edge-cases.json. Written as JS so the LaTeX is
// readable (String.raw) instead of double-escaped JSON.
// valid_v2: true when the string follows contracts.md rules 1-4, so it must
// render with zero .katex-error nodes. false = malformed input the renderer
// must survive (no crash, no console error), errors are reported, not gated.
import { writeFileSync } from 'node:fs';

const r = String.raw;
const cases = [
  ['currency-prose', 'Plain currency', r`The model costs about USD 10M to train, and inference is cheap.`, 2, true],
  ['currency-dollars', 'Currency written with dollars', r`Training cost $5 and $10 per hour, versus $0.34 per query.`, 2, false],
  ['dollar-in-code', 'Dollar inside code spans', r`Set ` + '`$HOME`' + r` or write ` + '`$x$`' + r` literally; real math: $x^2$.`, 2, false],
  ['unbalanced-dollar', 'Unbalanced dollar', r`The bound $O(n \log n) holds when $n$ is large.`, 2, false],
  ['inline-display-mid-sentence', 'Inline $$ mid-sentence', r`The loss $$\mathcal{L} = \sum_i \ell_i$$ is minimised jointly.`, 2, false],
  ['aligned-row-breaks', 'Aligned rows', r`We optimise two objectives.

$$
\begin{aligned}
\mathcal{L}_{\text{total}} &= \mathcal{L}_{\text{rec}} + \lambda \mathcal{L}_{\text{kl}} \\
\mathcal{L}_{\text{kl}} &= D_{\mathrm{KL}}(q(z \mid x) \,\|\, p(z))
\end{aligned}
$$

Both terms are weighted.`, 2, true],
  ['text-underscores', 'Underscores inside text commands', r`The schedule sets $\text{lr_max} = 3 \times 10^{-4}$ and $\eta_{\text{warm_up}} = 0.1$.`, 2, true],
  ['percent-ampersand', 'Percent and ampersand', r`Accuracy rises by $12\%$ (and by $50%$ on hard cases); $A \& B$ and $P & Q$ are datasets. Plain prose: 30% & more.`, 2, true],
  ['nested-braces', 'Nested braces', r`The estimator is $\hat{\mu} = \frac{\sum_{i=1}^{n} w_i^{2} x_{i}}{\sqrt{\sum_{j=1}^{n} w_j^{2}}}$.`, 2, true],
  ['set-braces', 'Escaped braces', r`The vocabulary is $V = \{v_1, \dots, v_n\}$ and $\left\{ x \mid x > 0 \right\}$.`, 2, true],
  ['unicode-symbols', 'Unicode symbols', r`For $α + β ≤ γ$ we get a 3× speed-up and ≥ 95% recall → better results, naïve baselines.`, 2, true],
  ['long-display', 'Long display equation', r`The full objective:

$$
\mathcal{L}(\theta) = \mathbb{E}_{x \sim p_{\text{data}}}\left[\log D_\phi(x)\right] + \mathbb{E}_{z \sim p(z)}\left[\log\left(1 - D_\phi(G_\theta(z))\right)\right] + \lambda_1 \|\theta\|_2^2 + \lambda_2 \sum_{k=1}^{K} \mathrm{KL}\left(q_k \,\|\, p_k\right) + \gamma \cdot \mathrm{TV}(G_\theta)
$$

This is long on purpose.`, 2, true],
  ['long-inline', 'Long inline equation', r`Inline: $\mathcal{L}(\theta)=\mathbb{E}_{x\sim p_{\text{data}}}[\log D_\phi(x)]+\mathbb{E}_{z\sim p(z)}[\log(1-D_\phi(G_\theta(z)))]+\lambda_1\|\theta\|_2^2+\lambda_2\sum_{k=1}^{K}\mathrm{KL}(q_k\|p_k)$ ends here.`, 2, true],
  ['math-in-title', r`$\tau$-bench and MC$^2$: Tool-Agent Benchmarks with $\mathcal{O}(n)$ Cost`, r`Titles go through the same inline path as summaries.`, 2, true],
  ['emphasis-adjacent', 'Emphasis next to math', r`We call *$x$* the key, **$\mathcal{L}$** the loss, and *the map $f_\theta$* the encoder; $a*b$ is a product.`, 2, true],
  ['prose-underscores', 'Underscores in prose', r`Set use_cache and max_new_tokens; the __init__ hook and snake_case names stay intact, as do $a_1$ and $b_1$.`, 2, true],
  ['escaped-dollar', 'Backslash-escaped dollar', r`A literal \$5 fee and \$ signs stay visible, with $x$ as math.`, 2, false],
  ['html-entities', 'HTML entities and tags', r`Tom &amp; Jerry &lt;3; math with entities $a &lt; b$ and <b>bold</b> tags.`, 2, false],
  ['equation-first-line', 'Equation first', r`$$
E = mc^2
$$

The equation comes before any prose.`, 2, true],
  ['list-with-display', 'List containing display math', r`- First point with $x$.
- Second point uses this objective:

  $$
  \min_\theta \sum_i \ell(f_\theta(x_i), y_i)
  $$

- Third point.`, 2, true],
  ['list-unindented-display', 'Display after a bullet, unindented', r`- First point.
- Second point:

$$
y = Wx + b
$$

- Third point.`, 2, true],
  ['cases-env', 'Cases environment', r`The gate is

$$
g(x) = \begin{cases} 1 & \text{if } x > \tau \\ 0 & \text{otherwise} \end{cases}
$$`, 2, true],
  ['pipes-and-angles', 'Pipes and angle brackets', r`We model $p(x|z)$ and $|x| < \epsilon$ with $\langle q, k \rangle$ and $a<b>c$.`, 2, true],
  ['digit-start-math', 'Math starting with a digit', r`There are $2^n$ states and $10^{-3}$ error, with $1-\epsilon$ confidence.`, 2, true],
  ['unsupported-label', 'Unsupported label and equation env', r`$$
\begin{equation} y = f(x) \label{eq:main} \end{equation}
$$

See \eqref{eq:main}.`, 2, false],
  ['text-nested-math', 'Text command with nested math', r`We define $y = \text{for all $x$ in } S$.`, 2, false],
  ['inline-wraps-line', 'Inline math across a line break', r`The value $a +
b$ wraps.`, 2, false],
  ['bare-latex-line', 'LaTeX without delimiters', r`Equations defining rewards: \text{State: } s_t = R_t, \quad \text{Reward: } r_t = f(s_t, a_t)`, 1, false],
  ['v1-double-backslash', 'v1 doubled backslashes', r`Complexity drops from $O(kh)$ to $O(h \\log_2(k))$ with $15,000 \\times$ speed-up.`, 1, false],
  ['v1-escaped-underscore', 'v1 escaped underscore', r`The loss $L\_{total} = L\_{rec} + L\_{kl}$ is used.`, 1, false],
  ['v1-inline-display', 'v1 $$ inline', r`- Point.
Equation: $$\text{Loss} = \alpha \cdot L_{s} + (1 - \alpha) \cdot L_{t}$$  `, 1, false],
  ['v1-tab-damage', 'v1 JSON tab damage', '$$\n\\\text{IR} = \\frac{\\# \\\text{ unstable}}{\\# \\\text{ total}} \\times 100\\\n$$\nwith \\\theta fixed.', 1, false],
  ['long-word', 'Very long unbroken word', r`See huggingface.co/organisation-name/an-extremely-long-model-repository-name-without-any-breaks-at-all for weights.`, 2, true],
];

const rows = cases.map((c) => {
  const [id, title, paper_summary, summary_version, valid_v2] = c;
  return { id, title, paper_summary, summary_version, valid_v2 };
});
writeFileSync(new URL('../src/fixtures/edge-cases.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
console.log(`${rows.length} edge cases written`);
