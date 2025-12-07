import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import TracksPage from "./pages/TracksPage";
import InsightsPage from "./pages/InsightsPage";

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
