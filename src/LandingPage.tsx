import React from 'react';
import { Link } from 'react-router-dom';
import logo from './serum-logo.png'; 

export default function LandingPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        
        {/* LOGO */}
        <img src={logo} alt="Serum AI Logo" style={styles.logo} />

        {/* TAGLINE */}
        <h2 style={styles.tagline}>
          Amplifying human creation.
        </h2>

        {/* SEPARATOR LINE */}
        <div style={styles.separator}></div>

        {/* TOOLS SECTION */}
        <div style={styles.toolsSection}>
          {/* Bigger Header as requested */}
          <h3 style={styles.toolsHeader}>Tools by Serum</h3>
          
          {/* Horizontal Row */}
          <div style={styles.toolRow}>
            {/* Tool 1 */}
            <Link to="/tool/tab" style={styles.link}>
              SerTab
            </Link>

            {/* Separator */}
            <span style={styles.pipe}>|</span>

            {/* Tool 2 (Placeholder) */}
            <span style={styles.comingSoon}>
              More tools brewing...
            </span>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p style={styles.copyright}>&copy; 2025 Serum AI</p>
        <div style={styles.footerLinks}>
            <a href="mailto:serum.ai@outlook.com" style={styles.contactLink}>
              Contact: serum.ai@outlook.com
            </a>
        </div>
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
    flex: 1, 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', 
    padding: '20px',
    paddingBottom: '80px', // Visual centering
  },
  logo: {
    maxWidth: '280px', 
    width: '100%',
    height: 'auto',
    marginBottom: '20px', 
  },
  tagline: {
    fontSize: '1.4rem', 
    fontWeight: '300',  
    color: '#555',      
    margin: '0 0 40px 0',
    textAlign: 'center',
  },
  separator: {
    width: '40px',
    height: '1px',
    backgroundColor: '#ddd', 
    marginBottom: '50px',
  },
  toolsSection: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  toolsHeader: {
    fontSize: '1.8rem', // Much larger now
    fontWeight: '600',
    color: '#000',      // Solid black to stand out
    margin: 0,
    letterSpacing: '-0.5px',
  },
  toolRow: {
    display: 'flex',
    alignItems: 'center', // Ensures vertical alignment in the row
    gap: '12px',
    fontSize: '1.1rem',
  },
  link: {
    textDecoration: 'none',
    color: '#000',
    borderBottom: '1px solid #000', // Stylish underline
    paddingBottom: '1px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  pipe: {
    color: '#ccc', // Light grey separator
    fontWeight: '300',
  },
  comingSoon: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
  },
  footer: {
    padding: '30px',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#999',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  copyright: {
    margin: 0,
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
  },
  contactLink: {
    color: '#999',
    textDecoration: 'none',
    borderBottom: '1px dotted #ccc',
    transition: 'color 0.2s',
  }
};
