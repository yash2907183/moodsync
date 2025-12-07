import React from "react";

function DashboardCards() {
  const mockCurrentMood = "Calm and focused";
  const mockRecentTracks = 5;
  const mockPrediction = "Likely to stay positive tomorrow";

  const cardStyle = {
    padding: "1.5rem",
    borderRadius: "0.75rem",
    background: "#111827",
    border: "1px solid #1f2937",
    flex: 1,
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Current mood</h2>
        <p>{mockCurrentMood}</p>
      </div>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Recent tracks analyzed</h2>
        <p>{mockRecentTracks} tracks today</p>
      </div>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Tomorrow outlook</h2>
        <p>{mockPrediction}</p>
      </div>
    </div>
  );
}

export default DashboardCards;
