import React from 'react';
import logo from './serum-logo.png'; // Make sure this path matches where your image is

export default function LandingPage() {
  return (
    <div style={styles.container}>
      {/* 1. Logo: Centered and sized */}
      <img src={logo} alt="Serum AI Logo" style={styles.logo} />

      {/* 2. The New Tagline */}
      <h1 style={styles.tagline}>
        Amplifying human creation.
      </h1>

      {/* 3. The Call to Action */}
      <a href="/app" style={styles.link}>
        Launch SerTab <span style={{ fontSize: '1.2em' }}>&rarr;</span>
      </a>

      {/* 4. Minimal Footer */}
      <footer style={styles.footer}>
        <p style={styles.copyright}>&copy; 2025 Serum AI</p>
        <div style={styles.socials}>
          {/* Add real links later */}
          <span style={{ opacity: 0.5 }}>Private Beta</span>
        </div>
      </footer>
    </div>
  );
}

// Simple CSS Styles (CSS-in-JS)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: '20px',
    backgroundColor: '#ffffff',
    color: '#000000',
    textAlign: 'center',
  },
  logo: {
    maxWidth: '300px', // Prevents the massive logo
    width: '100%',
    height: 'auto',
    marginBottom: '40px', // Space between logo and text
  },
  tagline: {
    fontSize: '2rem',
    fontWeight: '300', // Light font weight looks more modern
    letterSpacing: '-0.5px',
    margin: '0 0 40px 0',
  },
  link: {
    fontSize: '1.2rem',
    textDecoration: 'none',
    color: '#000000',
    borderBottom: '1px solid #000000', // stylish underline
    paddingBottom: '2px',
    transition: 'opacity 0.2s ease',
    cursor: 'pointer',
  },
  footer: {
    marginTop: 'auto', // Pushes footer to bottom if page is tall
    paddingTop: '60px',
    fontSize: '0.8rem',
    color: '#666',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  copyright: {
    margin: 0,
  },
  socials: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
  }
};
