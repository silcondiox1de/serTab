import React from 'react';
import { Link } from 'react-router-dom';
import logo from './serum-logo.png'; 

export default function LandingPage() {
  return (
    <div style={styles.container}>
      {/* 1. Main Content Wrapper: Keeps everything centered but structured */}
      <div style={styles.content}>
        
        {/* LOGO */}
        <img src={logo} alt="Serum AI Logo" style={styles.logo} />

        {/* TAGLINE: Made smaller and lighter to not compete with logo */}
        <h2 style={styles.tagline}>
          Amplifying human creation.
        </h2>

        {/* SEPARATOR LINE */}
        <div style={styles.separator}></div>

        {/* TOOLS SECTION */}
        <div style={styles.toolsSection}>
          <h3 style={styles.toolsHeader}>Tools by Serum</h3>
          
          <ul style={styles.toolList}>
            {/* Tool 1: SerTab */}
            <li style={styles.toolItem}>
              <Link to="/tool/tab" style={styles.mainLink}>
                Launch SerTab <span style={styles.arrow}>&rarr;</span>
              </Link>
            </li>

            {/* Tool 2: Coming Soon */}
            <li style={styles.toolItem}>
              <span style={styles.comingSoon}>
                More tools brewing...
              </span>
            </li>
          </ul>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p style={styles.copyright}>&copy; 2025 Serum AI &mdash; Private Beta</p>
      </footer>
    </div>
  );
}

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  content: {
    flex: 1, // Pushes footer down
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Vertically centers content
    padding: '20px',
    paddingBottom: '100px', // Visual offset to make it look "optically" centered (not too low)
  },
  logo: {
    maxWidth: '280px', // Slightly smaller to look sharper
    width: '100%',
    height: 'auto',
    marginBottom: '20px', 
  },
  tagline: {
    fontSize: '1.5rem', // Smaller than before (was 2rem)
    fontWeight: '300',  // Light font
    color: '#555',      // Dark Grey instead of black (softer)
    margin: '0 0 40px 0',
    textAlign: 'center',
  },
  separator: {
    width: '40px',
    height: '1px',
    backgroundColor: '#ddd', // Very subtle line
    marginBottom: '40px',
  },
  toolsSection: {
    textAlign: 'center',
  },
  toolsHeader: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '2px', // Wide spacing for "Tech" look
    color: '#999',
    marginBottom: '20px',
    fontWeight: '600',
  },
  toolList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  toolItem: {
    display: 'block',
  },
  mainLink: {
    fontSize: '1.25rem',
    textDecoration: 'none',
    color: '#000000',
    borderBottom: '1px solid transparent',
    transition: 'border-color 0.2s',
    fontWeight: '400',
  },
  arrow: {
    marginLeft: '5px',
    display: 'inline-block',
  },
  comingSoon: {
    fontSize: '0.9rem',
    color: '#aaa', // Light grey
    fontStyle: 'italic',
  },
  footer: {
    padding: '20px',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#ccc',
  },
  copyright: {
    margin: 0,
  }
};
