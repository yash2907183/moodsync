import React from "react";

function DashboardCards() {
  const mockCurrentMood = "Calm and focused";
  const mockRecentTracks = 5;
  const mockPrediction = "Likely to stay positive tomorrow";

  const cardStyle = {
    padding: "1.5rem",
    borderRadius: "1rem",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.9)",
    flex: 1,
    minWidth: "230px",
  };

  const labelStyle = {
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#9ca3af",
    marginBottom: "0.4rem",
  };

  const valueStyle = {
    fontSize: "1.1rem",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "1.5rem",
        marginTop: "0.5rem",
        flexWrap: "wrap",
      }}
    >
      <div style={cardStyle}>
        <div style={labelStyle}>Current mood</div>
        <div style={{ ...valueStyle, color: "#38bdf8" }}>
          {mockCurrentMood}
        </div>
        <p style={{ color: "#9ca3af", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          Based on the last few hours of listening.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Tracks analyzed today</div>
        <div style={{ ...valueStyle, color: "#22c55e" }}>
          {mockRecentTracks} tracks
        </div>
        <p style={{ color: "#9ca3af", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          Includes sentiment and emotion breakdown.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Tomorrow outlook</div>
        <div style={{ ...valueStyle, color: "#a855f7" }}>
          {mockPrediction}
        </div>
        <p style={{ color: "#9ca3af", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          Early forecast from recent mood patterns.
        </p>
      </div>
    </div>
  );
}

export default DashboardCards;
