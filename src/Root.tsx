import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import ToolApp from "./ToolApp"; // your tab editor

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tab" element={<ToolApp />} />
      </Routes>
    </BrowserRouter>
  );
}
