import React from "react";
import DashboardCards from "../components/DashboardCards";

function HomePage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>MoodSync Dashboard</h1>
      <p>Frontend skeleton connected. Backend will be wired later.</p>
      <DashboardCards />
    </div>
  );
}

export default HomePage;
