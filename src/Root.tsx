import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import Tool from './ToolApp'; 

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route 1: The Landing Page (Home) */}
        <Route path="/" element={<LandingPage />} />

        {/* Route 2: The Tool */}
        <Route path="/tool/tab" element={<Tool />} />
      </Routes>
    </BrowserRouter>
  );
}
