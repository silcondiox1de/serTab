import React from "react";
import { Link } from "react-router-dom";
import serumLogo from "./serum-logo.png"; // or .svg

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={serumLogo}
            alt="Serum AI logo"
            className="h-12 w-auto object-contain"
          />
          <span className="text-xl font-semibold tracking-tight">serum ai</span>
        </div>

        <Link
          to="/ser"
          className="text-sm font-semibold px-4 py-2 rounded-full border border-white/40 hover:border-white hover:bg-white hover:text-black transition-all"
        >
          Launch SerTab →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-4">
          Private Beta
        </p>

        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
          Tiny motions.<br />
          <span className="text-white/80">Ridiculous sound.</span>
        </h1>

        <p className="max-w-lg text-white/60 text-sm md:text-base mb-10">
          Serum AI is a small experimental lab for musicians and tinkerers.
          Our first experiment is <span className="text-white">SerTab</span> —
          a fast guitar tab editor with an AI brain. More tools are quietly
          brewing.
        </p>

        <Link
          to="/sertab"
          className="px-8 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
        >
          Enter SerTab
        </Link>

        <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent mt-16" />
      </main>

      {/* Footer */}
      <footer className="py-6 px-8 border-t border-white/10 text-[11px] text-white/40 flex items-center justify-between">
        <span>© {new Date().getFullYear()} Serum AI</span>
        <a
          href="https://github.com/silcondiox1de/serTab"
          target="_blank"
          rel="noreferrer"
          className="hover:text-white/70"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
};

export default LandingPage;
