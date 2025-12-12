# MoodSync Frontend

MoodSync is a modern, music‑driven mood dashboard.  
This project contains the **React frontend** for MoodSync. The backend and API integration are handled separately.

## Tech stack

- React (Create React App)
- React Router for client‑side routing
- Custom inline styling (CSS‑in‑JS style)
- Custom assets:
  - `src/assets/logo.jpg` – MoodSync logo
  - `src/assets/background.jpg` – dashboard background illustration

## Project Structure

~~~~text
frontend/
  ├── src/
  │   ├── assets/
  │   │   ├── logo.jpg
  │   │   └── background.jpg
  │   ├── components/
  │   │   ├── AppLayout.js
  │   │   └── DashboardCards.js
  │   ├── pages/
  │   │   ├── HomePage.js
  │   │   ├── TracksPage.js
  │   │   └── InsightsPage.js
  │   ├── utils/
  │   │   └── apiClient.js
  │   ├── App.js
  │   └── index.js
  └── package.json
~~~~

---

## Key components

### AppLayout

- Global shell used by all pages.  
- Includes:
  - Sticky header with logo, tagline (“Music mood intelligence”), and navigation.
  - Background image with gradient overlay for readability.
  - Centered content area with max‑width and consistent padding.

### DashboardCards

- Three highlight cards shown on the dashboard:
  - Current mood
  - Tracks analyzed today
  - Tomorrow outlook
- Uses mock data for now; designed to be wired to real metrics later.

## Pages

### Dashboard (`/`)

High‑level mood overview:

- Title: “Mood overview” and short description.
- Three metric cards for current mood, track count, and next‑day outlook.
- Cards styled as dark glass panels with soft borders and accent highlights.

### Tracks (`/tracks`)

Track‑level view:

- Table of recent tracks with:
  - Title  
  - Artist  
  - Mood label  
  - Sentiment score
- Dark card container with subtle borders and shadows.
- Accent colors for mood (violet) and score (green).
- Data is obtained via the mock API client.

### Insights (`/insights`)

Analytics and trends:

- **Mood timeline (last 5 days)**  
  - Bar‑style chart with:
    - Color‑coded bars for positive / neutral / negative moods.
    - Hover lift/shadow effect.
    - Baseline line to ground the chart visually.

- **Top emotions this week**  
  - Simple list of dominant emotions.

- **Emotion breakdown this week (donut / pie)**  
  - Donut‑style chart built with a conic gradient.
  - Shows distribution of Joy, Calm, Anticipation, Melancholy, Stress.
  - Legend with color chips and percentage labels.

All data on this page currently comes from mock functions in `apiClient.js`.

## Mock API client

`src/utils/apiClient.js` centralizes data access:

- `fetchHealth()` – returns a mock health object.
- `fetchRecentTracks()` – returns an array of example tracks.
- `fetchInsightsTimeline()` – returns a 5‑day mood timeline.

When the backend is ready, replace the mock returns with real HTTP calls (for example using `fetch` or `axios`) while keeping the same function names so page components do not need changes.

## Running the frontend

From the `frontend` directory:

npm install
npm start


- The app runs at `http://localhost:3000`.
- Routing is handled entirely on the client with React Router.

## Future backend integration

When the backend is available:

1. Add an environment variable such as `REACT_APP_API_BASE_URL`.
2. Update `apiClient.js` to call the real endpoints, for example:
   - `GET /health`
   - `GET /tracks/recent`
   - `GET /insights/timeline`
   - `GET /insights/emotions`
3. Keep component code unchanged by preserving the existing function signatures.
