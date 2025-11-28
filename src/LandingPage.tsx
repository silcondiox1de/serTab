import React from 'react';
import { Link } from 'react-router-dom';
import logo from './serum-logo.png'; 

export default function LandingPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        
        {/* SECTION A: BIGGER */}
        <div style={styles.sectionA}>
          <img src={logo} alt="Serum AI Logo" style={styles.logo} />
          <h2 style={styles.tagline}>
            Amplifying human creation.
          </h2>
        </div>

        {/* SEPARATOR */}
        <div style={styles.separator}></div>

        {/* SECTION B: SMALLER + COURIER FONT */}
        <div style={styles.sectionB}>
          <h3 style={styles.toolsHeader}>Tools by Serum</h3>
          
          <div style={styles.toolRow}>
            <Link to="/tool/tab" style={styles.link}>
              SerTab
            </Link>

            <span style={styles.pipe}>|</span>

            <span style={styles.comingSoon}>
              More tools brewing...
            </span>
          </div>
        </div>

      </div>

      {/* SECTION C: SMALLER, 1 ROW, PRIVATE BETA */}
      <footer style={styles.footer}>
        <span>&copy; 2025 Serum AI</span>
        <span style={styles.footerDot}>&bull;</span>
        
        <span style={{ opacity: 0.7 }}>Private Beta</span>
        <span style={styles.footerDot}>&bull;</span>
        
        <a href="mailto:serum.ai@outlook.com" style={styles.contactLink}>
          Contact
        </a>
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
    paddingBottom: '60px', 
  },
  
  // --- SECTION A STYLES ---
  sectionA: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
  },
  logo: {
    maxWidth: '380px', // Increased size (was 280px)
    width: '100%',
    height: 'auto',
    marginBottom: '25px', 
  },
  tagline: {
    fontSize: '2rem', // Increased size (was 1.4rem)
    fontWeight: '300',  
    color: '#333', // Slightly darker to match the size      
    margin: 0,
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },

  separator: {
    width: '30px',
    height: '1px',
    backgroundColor: '#eee', 
    marginBottom: '40px',
  },

  // --- SECTION B STYLES ---
  sectionB: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    // Courier Font applied to the whole section
    fontFamily: '"Courier New", Courier, monospace', 
  },
  toolsHeader: {
    fontSize: '1rem', // Much smaller (was 1.8rem)
    fontWeight: '700',
    color: '#000',      
    margin: 0,
    textTransform: 'uppercase', // Optional: looks good with Courier
    letterSpacing: '1px',
  },
  toolRow: {
    display: 'flex',
    alignItems: 'center', 
    gap: '10px',
    fontSize: '0.85rem', // Smaller text for the links
  },
  link: {
    textDecoration: 'none',
    color: '#000',
    borderBottom: '1px solid #000', 
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  pipe: {
    color: '#ccc', 
  },
  comingSoon: {
    color: '#999',
    fontStyle: 'italic',
  },

  // --- SECTION C (FOOTER) STYLES ---
  footer: {
    padding: '20px',
    textAlign: 'center',
    fontSize: '0.75rem', // Small font size
    color: '#aaa',
    display: 'flex',       // Makes it 1 row
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
  },
  footerDot: {
    fontSize: '0.5rem', // Tiny separator dot
    opacity: 0.5,
  },
  contactLink: {
    color: '#aaa',
    textDecoration: 'underline',
    cursor: 'pointer',
    transition: 'color 0.2s',
  }
};
