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


# ── Tag-based energy helpers ───────────────────────────────────────────────

_HIGH_ENERGY_TAGS = {
    "hip-hop", "hip hop", "rap", "trap", "drill", "grime", "dancehall",
    "dance", "electronic", "edm", "house", "techno", "drum and bass", "dnb",
    "club", "party", "workout", "hype", "crunk", "bounce", "southern rap",
    "dirty south", "memphis rap",
}

_LOW_ENERGY_TAGS = {
    "acoustic", "ballad", "sad", "melancholy", "melancholic", "folk",
    "singer-songwriter", "classical", "ambient", "sleep", "chill",
    "lo-fi", "lo fi", "soft", "quiet", "meditation",
}

# Canonical genre groups for the genre breakdown feature
GENRE_MAP: dict[str, set[str]] = {
    "hip-hop/rap":    {"hip-hop", "hip hop", "rap", "trap", "drill", "grime", "crunk",
                       "bounce", "southern rap", "dirty south", "memphis rap",
                       "underground hip-hop", "alternative hip-hop"},
    "r&b/soul":       {"rnb", "r&b", "soul", "neo soul", "new jack swing",
                       "alternative rnb", "contemporary r&b"},
    "pop":            {"pop", "dance pop", "electropop", "synth-pop", "teen pop",
                       "indie pop", "art pop", "baroque pop"},
    "rock/indie":     {"rock", "alternative", "indie", "punk", "metal", "emo",
                       "post-rock", "pop rock", "indie rock"},
    "electronic":     {"electronic", "dance", "edm", "house", "techno",
                       "dubstep", "drum and bass", "dnb", "ambient"},
    "country/folk":   {"country", "folk", "americana", "acoustic",
                       "singer-songwriter", "bluegrass"},
    "latin/afro":     {"latin", "reggaeton", "salsa", "afrobeats", "afropop",
                       "dancehall", "reggae", "soca"},
}


def tag_energy_score(tags: List[str]) -> float | None:
    """
    Returns a tag-based energy estimate (0–1), or None if tags are inconclusive.
    Used to blend with lyrical arousal for a more accurate energy score.
    """
    if not tags:
        return None
    high = sum(1 for t in tags if t in _HIGH_ENERGY_TAGS)
    low  = sum(1 for t in tags if t in _LOW_ENERGY_TAGS)
    if high > low:
        return 0.78
    if low > high:
        return 0.22
    return None


def canonical_genre(tags: List[str]) -> str:
    """Map a track's tag list to one of the canonical genre groups."""
    if not tags:
        return "other"
    for tag in tags:
        for genre, keywords in GENRE_MAP.items():
            if tag.lower() in keywords:
                return genre
    return "other"
