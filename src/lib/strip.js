import { WINDOWS } from '../api';

// Text for the card's metadata strip: arXiv category names and the honest
// span behind a "stars gained" number.

// arXiv category taxonomy (arxiv.org/category_taxonomy). Where Eric chose a
// shorter name (2026-10-13), his wins over arXiv's.
const CATEGORIES = {
  'cs.AI': 'Artificial Intelligence', 'cs.AR': 'Hardware Architecture', 'cs.CC': 'Computational Complexity',
  'cs.CE': 'Computational Engineering', 'cs.CG': 'Computational Geometry', 'cs.CL': 'Language (NLP)',
  'cs.CR': 'Cryptography and Security', 'cs.CV': 'Computer Vision', 'cs.CY': 'Computers and Society',
  'cs.DB': 'Databases', 'cs.DC': 'Distributed Computing', 'cs.DL': 'Digital Libraries',
  'cs.DM': 'Discrete Mathematics', 'cs.DS': 'Data Structures and Algorithms', 'cs.ET': 'Emerging Technologies',
  'cs.FL': 'Formal Languages', 'cs.GL': 'General Literature', 'cs.GR': 'Graphics', 'cs.GT': 'Game Theory',
  'cs.HC': 'Human-Computer Interaction', 'cs.IR': 'Information Retrieval', 'cs.IT': 'Information Theory',
  'cs.LG': 'Machine Learning', 'cs.LO': 'Logic in Computer Science', 'cs.MA': 'Multi-Agent Systems',
  'cs.MM': 'Multimedia', 'cs.MS': 'Mathematical Software', 'cs.NA': 'Numerical Analysis',
  'cs.NE': 'Neural and Evolutionary Computing', 'cs.NI': 'Networking', 'cs.OH': 'Other Computer Science',
  'cs.OS': 'Operating Systems', 'cs.PF': 'Performance', 'cs.PL': 'Programming Languages', 'cs.RO': 'Robotics',
  'cs.SC': 'Symbolic Computation', 'cs.SD': 'Sound', 'cs.SE': 'Software Engineering',
  'cs.SI': 'Social and Information Networks', 'cs.SY': 'Systems and Control',
  'econ.EM': 'Econometrics', 'econ.GN': 'General Economics', 'econ.TH': 'Theoretical Economics',
  'eess.AS': 'Audio and Speech', 'eess.IV': 'Image and Video Processing', 'eess.SP': 'Signal Processing',
  'eess.SY': 'Systems and Control',
  'math.AC': 'Commutative Algebra', 'math.AG': 'Algebraic Geometry', 'math.AP': 'Analysis of PDEs',
  'math.AT': 'Algebraic Topology', 'math.CA': 'Classical Analysis and ODEs', 'math.CO': 'Combinatorics',
  'math.CT': 'Category Theory', 'math.CV': 'Complex Variables', 'math.DG': 'Differential Geometry',
  'math.DS': 'Dynamical Systems', 'math.FA': 'Functional Analysis', 'math.GM': 'General Mathematics',
  'math.GN': 'General Topology', 'math.GR': 'Group Theory', 'math.GT': 'Geometric Topology',
  'math.HO': 'History and Overview', 'math.IT': 'Information Theory', 'math.KT': 'K-Theory and Homology',
  'math.LO': 'Logic', 'math.MG': 'Metric Geometry', 'math.MP': 'Mathematical Physics',
  'math.NA': 'Numerical Analysis', 'math.NT': 'Number Theory', 'math.OA': 'Operator Algebras',
  'math.OC': 'Optimization and Control', 'math.PR': 'Probability', 'math.QA': 'Quantum Algebra',
  'math.RA': 'Rings and Algebras', 'math.RT': 'Representation Theory', 'math.SG': 'Symplectic Geometry',
  'math.SP': 'Spectral Theory', 'math.ST': 'Statistics Theory',
  'astro-ph': 'Astrophysics', 'astro-ph.CO': 'Cosmology', 'astro-ph.EP': 'Earth and Planetary Astrophysics',
  'astro-ph.GA': 'Astrophysics of Galaxies', 'astro-ph.HE': 'High Energy Astrophysics',
  'astro-ph.IM': 'Astronomical Instrumentation', 'astro-ph.SR': 'Solar and Stellar Astrophysics',
  'cond-mat.dis-nn': 'Disordered Systems and Neural Networks', 'cond-mat.mes-hall': 'Mesoscale and Nanoscale Physics',
  'cond-mat.mtrl-sci': 'Materials Science', 'cond-mat.other': 'Other Condensed Matter',
  'cond-mat.quant-gas': 'Quantum Gases', 'cond-mat.soft': 'Soft Condensed Matter',
  'cond-mat.stat-mech': 'Statistical Mechanics', 'cond-mat.str-el': 'Strongly Correlated Electrons',
  'cond-mat.supr-con': 'Superconductivity',
  'gr-qc': 'General Relativity and Quantum Cosmology', 'hep-ex': 'High Energy Physics (Experiment)',
  'hep-lat': 'High Energy Physics (Lattice)', 'hep-ph': 'High Energy Physics (Phenomenology)',
  'hep-th': 'High Energy Physics (Theory)', 'math-ph': 'Mathematical Physics',
  'nlin.AO': 'Adaptation and Self-Organizing Systems', 'nlin.CD': 'Chaotic Dynamics',
  'nlin.CG': 'Cellular Automata', 'nlin.PS': 'Pattern Formation and Solitons',
  'nlin.SI': 'Exactly Solvable and Integrable Systems', 'nucl-ex': 'Nuclear Experiment', 'nucl-th': 'Nuclear Theory',
  'physics.acc-ph': 'Accelerator Physics', 'physics.ao-ph': 'Atmospheric and Oceanic Physics',
  'physics.app-ph': 'Applied Physics', 'physics.atm-clus': 'Atomic and Molecular Clusters',
  'physics.atom-ph': 'Atomic Physics', 'physics.bio-ph': 'Biological Physics', 'physics.chem-ph': 'Chemical Physics',
  'physics.class-ph': 'Classical Physics', 'physics.comp-ph': 'Computational Physics',
  'physics.data-an': 'Data Analysis and Statistics', 'physics.ed-ph': 'Physics Education',
  'physics.flu-dyn': 'Fluid Dynamics', 'physics.gen-ph': 'General Physics', 'physics.geo-ph': 'Geophysics',
  'physics.hist-ph': 'History and Philosophy of Physics', 'physics.ins-det': 'Instrumentation and Detectors',
  'physics.med-ph': 'Medical Physics', 'physics.optics': 'Optics', 'physics.plasm-ph': 'Plasma Physics',
  'physics.pop-ph': 'Popular Physics', 'physics.soc-ph': 'Physics and Society', 'physics.space-ph': 'Space Physics',
  'quant-ph': 'Quantum Physics',
  'q-bio.BM': 'Biomolecules', 'q-bio.CB': 'Cell Behavior', 'q-bio.GN': 'Genomics', 'q-bio.MN': 'Molecular Networks',
  'q-bio.NC': 'Neurons and Cognition', 'q-bio.OT': 'Other Quantitative Biology',
  'q-bio.PE': 'Populations and Evolution', 'q-bio.QM': 'Quantitative Methods', 'q-bio.SC': 'Subcellular Processes',
  'q-bio.TO': 'Tissues and Organs',
  'q-fin.CP': 'Computational Finance', 'q-fin.EC': 'Economics', 'q-fin.GN': 'General Finance',
  'q-fin.MF': 'Mathematical Finance', 'q-fin.PM': 'Portfolio Management', 'q-fin.PR': 'Pricing of Securities',
  'q-fin.RM': 'Risk Management', 'q-fin.ST': 'Statistical Finance', 'q-fin.TR': 'Trading and Market Microstructure',
  'stat.AP': 'Applied Statistics', 'stat.CO': 'Statistical Computation', 'stat.ME': 'Statistical Methodology',
  'stat.ML': 'Machine Learning (Statistics)', 'stat.OT': 'Other Statistics', 'stat.TH': 'Statistics Theory',
};

export const categoryName = (code) => (code ? CATEGORIES[code] ?? code : code);

const WINDOW_HOURS = { day: 24, week: 168, month: 720 };
// Samples arrive every ~15 min; allow an hour before calling a span short.
const SLACK_MS = 3600e3;

// ISO or Postgres text ("2024-08-05 00:00:00+00"); NaN if neither.
function parseTime(value) {
  if (typeof value !== 'string') return NaN;
  const iso = value.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return Date.parse(iso);
}

// The span a "stars gained" number really covers: the window's label when
// the star history spans the window, else "since <first sample date>" in
// the reader's time zone.
export function gainSpan(paper, window, now = Date.now(), timeZone = undefined) {
  const label = WINDOWS.find((w) => w.value === window)?.label ?? '';
  const since = parseTime(paper.gained_since);
  if (Number.isNaN(since)) return label;
  const start = window in WINDOW_HOURS ? now - WINDOW_HOURS[window] * 3600e3 : -Infinity;
  if (since <= start + SLACK_MS) return label;
  const year = (t) => new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(t);
  const opts = { month: 'short', day: 'numeric', timeZone };
  if (year(since) !== year(now)) opts.year = 'numeric';
  return `since ${new Intl.DateTimeFormat('en-US', opts).format(since)}`;
}

// "+5", "−5" (minus sign), never "+-5". Takes an already formatted number.
export const signed = (text) => (text.startsWith('-') ? `\u2212${text.slice(1)}` : `+${text}`);
