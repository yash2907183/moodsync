// src/utils/apiClient.js
// Temporary mock API client. Replace implementations with real fetch calls later.

export async function fetchHealth() {
  // Later: return fetch("http://localhost:8000/health").then(res => res.json());
  return { status: "healthy", service: "MoodSync API (mock)", version: "v1" };
}

export async function fetchRecentTracks() {
  return [
    { id: 1, title: "Track A", artist: "Artist 1", mood: "Happy", score: 0.82 },
    { id: 2, title: "Track B", artist: "Artist 2", mood: "Melancholic", score: 0.41 },
    { id: 3, title: "Track C", artist: "Artist 3", mood: "Energetic", score: 0.73 },
  ];
}

export async function fetchInsightsTimeline() {
  return [
    { day: "Mon", mood: "Calm", score: 0.6 },
    { day: "Tue", mood: "Happy", score: 0.8 },
    { day: "Wed", mood: "Stressed", score: 0.3 },
    { day: "Thu", mood: "Balanced", score: 0.7 },
    { day: "Fri", mood: "Excited", score: 0.9 },
  ];
}
