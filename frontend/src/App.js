import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TracksPage from "./pages/TracksPage";
import InsightsPage from "./pages/InsightsPage";

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e5e7eb" }}>
        <header
          style={{
            padding: "1rem 2rem",
            borderBottom: "1px solid #1f2937",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0 }}>MoodSync</h2>
          <nav style={{ display: "flex", gap: "1rem" }}>
            <Link to="/" style={{ color: "#e5e7eb", textDecoration: "none" }}>Dashboard</Link>
            <Link to="/tracks" style={{ color: "#e5e7eb", textDecoration: "none" }}>Tracks</Link>
            <Link to="/insights" style={{ color: "#e5e7eb", textDecoration: "none" }}>Insights</Link>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tracks" element={<TracksPage />} />
            <Route path="/insights" element={<InsightsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
