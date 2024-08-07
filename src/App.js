import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import { FaStar, FaCode, FaMoon, FaSun } from 'react-icons/fa';
import 'katex/dist/katex.min.css';
import './App.css';
import lightLogo from './assets/light-logo.png';
import darkLogo from './assets/dark-logo.png';

const renderMath = (text) => {
  if (typeof text !== 'string') {
    return text;
  }
  
  // Split the text into LaTeX and non-LaTeX parts
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={index}>{part.slice(2, -2)}</BlockMath>;
    } else if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>;
    } else {
      // Handle escaped backslashes and underscores
      const processedText = part
        .replace(/\\\\/g, '\\')
        .replace(/\\_/g, '_');
      return processedText;
    }
  });
};

const renderTitle = (text) => {
  return renderMath(text);
};

const applyTheme = (isDark) => {
  document.body.classList.toggle('dark-mode', isDark);
  document.body.classList.toggle('light-mode', !isDark);
};

const RepoCard = ({ repo }) => {
  const formattedRate = repo.hourly_rate.toFixed(2);
  const showRate = formattedRate !== '0.00';

  const components = {
    p: ({ children }) => <p>{React.Children.map(children, child => 
      typeof child === 'string' ? renderMath(child) : child
    )}</p>,
    // ... other heading components
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className={className} {...props}>
          <code className={className}>{children}</code>
        </pre>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
  };

  const processContent = (content) => {
    // Handle block-level equations
    const blockEquationRegex = /\$\$([\s\S]*?)\$\$/g;
    const parts = content.split(blockEquationRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a block-level equation
        return <BlockMath key={index}>{part}</BlockMath>;
      } else {
        // This is regular text or inline math
        return <ReactMarkdown key={index} components={components}>{part}</ReactMarkdown>;
      }
    });
  };

  return (
    <div className="repo-card">
      <h2>
        <a href={repo.html_link} target="_blank" rel="noopener noreferrer">
          {renderMath(repo.title)}
        </a>
      </h2>
      <div className="paper-summary">
        {processContent(repo.paper_summary)}
      </div>
      <div className="repo-stats">
        <FaCode />
        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
          {repo.full_name}
        </a>
      </div>
      <div className="repo-stats">
        <FaStar />
        {repo.star_count}
        {showRate && ` (+${formattedRate}/hour)`}
      </div>
    </div>
  );
};

const LogoCard = ({ isDarkMode }) => (
  <div className="logo-card" onClick={() => window.location.reload()}>
    <img src={isDarkMode ? darkLogo : lightLogo} alt="Frontier Beat Logo" className="App-logo" />
  </div>
);

function App() {
  const [repos, setRepos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
  const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });
  const initialFetchDone = useRef(false);

  useEffect(() => {
    applyTheme(isDarkMode);
    if (!initialFetchDone.current) {
      fetchRepos(1); // Fetch first page when component mounts
      initialFetchDone.current = true;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const fetchRepos = async (pageNum) => {
    try {
      const response = await axios.get(`https://api.frontier-beat.site/top_papers?page=${pageNum}&per_page=10`);
      const newRepos = response.data.repos;
      setRepos((prevRepos) => [...prevRepos, ...newRepos]);
      setPage(pageNum + 1);
      if (newRepos.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching repos:', error);
    }
  };

  const backgroundRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      if (backgroundRef.current) {
        const yPosition = -(scrolled * 0.005) % 50; // The % 100 creates the repeating effect
        backgroundRef.current.style.transform = `translate3d(0, ${yPosition}%, 0)`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <>
      <div className="background" ref={backgroundRef}></div>
      <div className="App">
        <div className="theme-toggle" onClick={toggleTheme}>
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </div>
        <InfiniteScroll
          dataLength={repos.length}
          next={() => fetchRepos(page)}
          hasMore={hasMore}
          loader={<div className="loading">Loading...</div>}
          endMessage={
            <p style={{ textAlign: 'center' }}>
              <b>You have seen all the top repositories!</b>
            </p>
          }
        >
          {repos.map((repo, index) => (
            <React.Fragment key={repo.id}>
              {index === 0 && <LogoCard isDarkMode={isDarkMode} />}
              <RepoCard repo={repo} />
            </React.Fragment>
          ))}
        </InfiniteScroll>
      </div>
    </>
  );
}

export default App;
