import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { FaCoffee, FaHeart, FaMoon, FaSun } from 'react-icons/fa';
import 'katex/dist/katex.min.css';
import './App.css';
import lightLogo from './assets/logo-light.png';
import darkLogo from './assets/logo-dark.png';
import PaperList from './components/PaperList';
import RankingControls from './components/RankingControls';
import { DEFAULT_SORT, DEFAULT_WINDOW, SORTS, WINDOWS, effectiveWindow } from './api';

const FixturePage = lazy(() => import('./components/FixturePage'));

function readRanking() {
  const q = new URLSearchParams(window.location.search);
  const pick = (key, options, fallback) => (options.some((o) => o.value === q.get(key)) ? q.get(key) : fallback);
  return { sort: pick('sort', SORTS, DEFAULT_SORT), window: pick('window', WINDOWS, DEFAULT_WINDOW) };
}

function writeRanking({ sort, window: win }) {
  const q = new URLSearchParams(window.location.search);
  q.set('sort', sort);
  q.set('window', win);
  if (sort === DEFAULT_SORT && win === DEFAULT_WINDOW) { q.delete('sort'); q.delete('window'); }
  const search = q.toString();
  window.history.pushState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
}

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => { if (!localStorage.getItem('theme')) setDark(e.matches); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const toggle = () => setDark((d) => {
    try { localStorage.setItem('theme', d ? 'light' : 'dark'); } catch { /* storage blocked */ }
    return !d;
  });
  return [dark, toggle];
}

// Space/sky backdrop. The images are two identical halves stacked, so
// drifting the 800%-tall layer by up to 50% of its height loops seamlessly
// (the original effect from 3462ea1).
function Background() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = -(window.scrollY * 0.005) % 50;
        if (ref.current) ref.current.style.transform = `translate3d(0, ${y}%, 0)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return <div className="background" ref={ref} aria-hidden="true" />;
}

const Footer = () => (
  <footer className="footer">
    <FaCoffee size={10} /> Freshly brewed with <FaHeart size={8} /> at the{' '}
    <a href="https://www.recurse.com/" target="_blank" rel="noopener noreferrer">Recurse Center</a> in New York ©{' '}
    {new Date().getFullYear()}{' '}
    <a href="https://eric-bolton.github.io/" target="_blank" rel="noopener noreferrer">Eric Bolton</a>. All rights reserved.
  </footer>
);

export default function App() {
  const [dark, toggleTheme] = useTheme();
  const [ranking, setRanking] = useState(readRanking);
  const fixtures = new URLSearchParams(window.location.search).has('fixtures');
  const apiWindow = effectiveWindow(ranking.sort, ranking.window);

  useEffect(() => {
    const onPop = () => setRanking(readRanking());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const changeRanking = useCallback((next) => {
    writeRanking(next);
    setRanking(next);
  }, []);

  return (
    <>
      <Background />
      <button type="button" className="button icon theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
        {dark ? <FaSun /> : <FaMoon />}
      </button>
      <div className="page">
        <header className="masthead">
          <a href="/" aria-label="Frontier Beat home"><img className="logo" src={dark ? darkLogo : lightLogo} alt="Frontier Beat" /></a>
        </header>
        <h1 className="page-title">Open-source machine learning papers</h1>
        {fixtures ? (
          <Suspense fallback={<p className="list-status">Loading fixtures…</p>}><FixturePage /></Suspense>
        ) : (
          <>
            <RankingControls sort={ranking.sort} window={ranking.window} onChange={changeRanking} />
            <PaperList
              key={`${ranking.sort}:${apiWindow}`}
              sort={ranking.sort}
              window={apiWindow}
              onShowAll={apiWindow === 'all' ? undefined : () => changeRanking({ sort: ranking.sort, window: 'all' })}
            />
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
