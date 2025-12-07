import React, { useEffect, useState } from "react";
import { fetchRecentTracks } from "../utils/apiClient";

function TracksPage() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchRecentTracks();
      setTracks(data);
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

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "0.75rem",
    fontSize: "0.9rem",
  };

  const thStyle = {
    borderBottom: "1px solid rgba(31, 41, 55, 0.8)",
    padding: "0.75rem 0.5rem",
    textAlign: "left",
    color: "#9ca3af",
    fontWeight: 500,
  };

  const tdStyle = {
    borderBottom: "1px solid rgba(31, 41, 55, 0.6)",
    padding: "0.6rem 0.5rem",
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Tracks</h1>
      <p style={{ color: "#9ca3af", marginBottom: "0.75rem" }}>
        Recently played songs with their detected mood and sentiment score.
      </p>

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: "#9ca3af" }}>Loading tracks...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Artist</th>
                <th style={thStyle}>Mood</th>
                <th style={thStyle}>Score</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id}>
                  <td style={tdStyle}>{track.title}</td>
                  <td style={{ ...tdStyle, color: "#9ca3af" }}>
                    {track.artist}
                  </td>
                  <td style={{ ...tdStyle, color: "#a855f7" }}>{track.mood}</td>
                  <td style={{ ...tdStyle, color: "#22c55e" }}>
                    {track.score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TracksPage;
