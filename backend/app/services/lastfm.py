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

    def _fetch_tags(self, params: dict, limit: int) -> List[str]:
        """Internal helper to call Last.fm and extract tags."""
        try:
            resp = requests.get(LASTFM_API_URL, params={**params, "api_key": self.api_key, "format": "json"}, timeout=5)
            if resp.status_code != 200:
                return []
            data = resp.json()
            tags = data.get("toptags", {}).get("tag", [])
            return [t["name"].lower() for t in tags[:limit] if t.get("name")]
        except Exception as e:
            logger.warning(f"Last.fm request failed: {e}")
            return []

    def get_track_tags(self, track_name: str, artist_name: str, limit: int = 5) -> List[str]:
        """
        Fetch top tags for a track from Last.fm.
        Falls back to artist-level tags if the track has no tags.
        Returns a list of lowercase tag names e.g. ['hip-hop', 'rap', 'trap'].
        """
        if not self.api_key:
            return []

        # Try track-level tags first
        tags = self._fetch_tags({"method": "track.getTopTags", "artist": artist_name, "track": track_name}, limit)
        if tags:
            return tags

        # Fall back to artist-level tags (more reliably populated on Last.fm)
        logger.info(f"No track tags for '{track_name}' — falling back to artist tags for '{artist_name}'")
        return self._fetch_tags({"method": "artist.getTopTags", "artist": artist_name}, limit)


_lastfm_service = None


def get_lastfm_service() -> LastFmService:
    global _lastfm_service
    if _lastfm_service is None:
        _lastfm_service = LastFmService()
    return _lastfm_service
