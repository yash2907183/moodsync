import React, { useEffect, useState } from "react";
import { fetchInsightsTimeline } from "../utils/apiClient";

function EmotionPieCard() {
  const mockEmotionDistribution = [
    { label: "Joy", value: 40, color: "#22c55e" },
    { label: "Calm", value: 30, color: "#38bdf8" },
    { label: "Anticipation", value: 15, color: "#a855f7" },
    { label: "Melancholy", value: 10, color: "#f97316" },
    { label: "Stress", value: 5, color: "#ef4444" },
  ];

  const total = mockEmotionDistribution.reduce((sum, e) => sum + e.value, 0);

  const cardStyle = {
    padding: "1.5rem",
    borderRadius: "1rem",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.9)",
    marginTop: "1.5rem",
    display: "flex",
    gap: "1.5rem",
    alignItems: "center",
    flexWrap: "wrap",
  };

  return (
    <div style={cardStyle}>
      {/* “Pie” as a ring-style donut approximation */}
      <div
        style={{
          width: "180px",
          height: "180px",
          borderRadius: "999px",
          background:
            "conic-gradient(#22c55e 0 144deg, #38bdf8 144deg 252deg, #a855f7 252deg 306deg, #f97316 306deg 342deg, #ef4444 342deg 360deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "999px",
            background: "#020617",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            Dominant
          </span>
          <span style={{ fontSize: "1rem", fontWeight: 600 }}>Joy + Calm</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ minWidth: "200px", flex: 1 }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Emotion breakdown this week
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
          Share of emotions detected from your listening sessions.
        </p>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {mockEmotionDistribution.map((emotion) => (
            <div
              key={emotion.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.9rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: emotion.color,
                  }}
                />
                <span>{emotion.label}</span>
              </div>
              <span style={{ color: "#9ca3af" }}>
                {Math.round((emotion.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightsPage() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchInsightsTimeline();
      setTimeline(data);
      setLoading(false);
    }
    load();
  }, []);

  const cardStyle = {
    padding: "1.5rem",
    borderRadius: "1rem",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.9)",
    marginTop: "1.5rem",
  };

  const barContainer = {
    display: "flex",
    gap: "1.5rem",
    marginTop: "1.5rem",
    alignItems: "flex-end",
  };

  const barBase = {
    width: "3rem",
    background: "#020617",
    borderRadius: "1rem",
    display: "flex",
    flexDirection: "column-reverse",
    alignItems: "center",
    paddingBottom: "0.4rem",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.85)",
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Insights</h1>
      <p style={{ color: "#9ca3af", marginBottom: "0.75rem" }}>
        Mood timeline, dominant emotions, and a quick forecast snapshot.
      </p>

      {/* Mood timeline card */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Mood timeline (last 5 days)
        </h2>

        {loading ? (
          <p style={{ color: "#9ca3af" }}>Loading timeline...</p>
        ) : (
          <>
            <div
              style={{
                height: "1px",
                width: "100%",
                background:
                  "linear-gradient(to right, rgba(55,65,81,0.2), rgba(55,65,81,0.5), rgba(55,65,81,0.2))",
                marginTop: "0.5rem",
              }}
            />
            <div style={barContainer}>
              {timeline.map((point) => (
                <div
                  key={point.day}
                  style={barBase}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 14px 28px rgba(15, 23, 42, 0.95)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 18px rgba(15, 23, 42, 0.85)";
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${point.score * 150}px`,
                      background:
                        point.score > 0.7
                          ? "linear-gradient(to top, #22c55e, #4ade80)"
                          : point.score < 0.4
                          ? "linear-gradient(to top, #ef4444, #f97373)"
                          : "linear-gradient(to top, #f97316, #fdba74)",
                      borderRadius: "1rem",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      marginTop: "0.35rem",
                      color: "#9ca3af",
                    }}
                  >
                    {point.day}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Top emotions list card */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Top emotions this week
        </h2>
        <ul style={{ marginTop: "0.75rem", color: "#e5e7eb" }}>
          <li>Joy</li>
          <li>Calm</li>
          <li>Anticipation</li>
        </ul>
      </div>

      {/* New emotion “pie” card */}
      <EmotionPieCard />
    </div>
  );
}

export default InsightsPage;
