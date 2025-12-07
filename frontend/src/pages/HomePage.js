import React from "react";
import DashboardCards from "../components/DashboardCards";

function HomePage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>
        Mood overview
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
        High-level view of your recent listening mood and upcoming outlook.
      </p>
      <DashboardCards />
    </div>
  );
}

export default HomePage;
