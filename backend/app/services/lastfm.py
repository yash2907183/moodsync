"""
Last.fm tag fetching service.
Used to enrich tracks with genre/mood tags (e.g. hip-hop, sad, acoustic)
so the emotion regulation classifier can distinguish musical energy from lyrical sentiment.
"""
import os
import logging
import requests
from typing import List

logger = logging.getLogger(__name__)

LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/"


class LastFmService:
    def __init__(self):
        self.api_key = os.getenv("LASTFM_API_KEY")
        if not self.api_key:
            logger.warning("LASTFM_API_KEY not set — tag enrichment disabled.")

    def get_track_tags(self, track_name: str, artist_name: str, limit: int = 5) -> List[str]:
        """
        Fetch top tags for a track from Last.fm.
        Returns a list of lowercase tag names e.g. ['hip-hop', 'rap', 'trap'].
        Returns empty list if API key missing or request fails.
        """
        if not self.api_key:
            return []
        try:
            resp = requests.get(LASTFM_API_URL, params={
                "method":  "track.getTopTags",
                "artist":  artist_name,
                "track":   track_name,
                "api_key": self.api_key,
                "format":  "json",
            }, timeout=5)

            if resp.status_code != 200:
                return []

            data = resp.json()
            tags = data.get("toptags", {}).get("tag", [])
            return [t["name"].lower() for t in tags[:limit] if t.get("name")]

        except Exception as e:
            logger.warning(f"Last.fm tag fetch failed for '{track_name}': {e}")
            return []


_lastfm_service = None


def get_lastfm_service() -> LastFmService:
    global _lastfm_service
    if _lastfm_service is None:
        _lastfm_service = LastFmService()
    return _lastfm_service
