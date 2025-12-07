import React from "react";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e5e7eb" }}>
      <header style={{ padding: "1rem 2rem", borderBottom: "1px solid #1f2937" }}>
        <h2 style={{ margin: 0 }}>MoodSync</h2>
      </header>
      <main>
        <HomePage />
      </main>
    </div>
  );
}

export default App;
