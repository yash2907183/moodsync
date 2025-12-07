import React from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpg";

function AppLayout({ children }) {
  const location = useLocation();

  const linkStyle = (path) => ({
    color: location.pathname === path ? "#38bdf8" : "#e5e7eb",
    textDecoration: "none",
    fontWeight: location.pathname === path ? 600 : 400,
    fontSize: "0.95rem",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#e5e7eb",
        backgroundImage: `url(${require("../assets/background.jpg")})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(56, 189, 248, 0.25), transparent 55%), rgba(15, 23, 42, 0.92)",
        }}
      >
        <header
          style={{
            padding: "0.75rem 2rem",
            borderBottom: "1px solid #1f2937",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            backdropFilter: "blur(12px)",
            background: "rgba(15, 23, 42, 0.9)",
            zIndex: 10,
          }}
        >
          {/* Logo + wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.9rem",
            }}
          >
            <div
              style={{
                padding: "6px",
                borderRadius: "20px",
                background:
                  "radial-gradient(circle at top, rgba(56, 189, 248, 0.45), transparent 60%)",
              }}
            >
              <img
                src={logo}
                alt="MoodSync logo"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "16px", // rounded square
                  objectFit: "cover",
                  display: "block",
                  boxShadow: "0 0 18px rgba(15, 23, 42, 0.9)",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.1rem",
              }}
            >
              <span style={{ fontSize: "1.35rem", fontWeight: 600 }}>
                MoodSync
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#9ca3af",
                }}
              >
                Music mood intelligence
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ display: "flex", gap: "1.5rem" }}>
            <Link to="/" style={linkStyle("/")}>
              Dashboard
            </Link>
            <Link to="/tracks" style={linkStyle("/tracks")}>
              Tracks
            </Link>
            <Link to="/insights" style={linkStyle("/insights")}>
              Insights
            </Link>
          </nav>
        </header>

        <main
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            padding: "2rem 1.5rem 3rem",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
