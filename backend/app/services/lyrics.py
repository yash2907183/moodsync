"""
Lyrics fetching service using Genius API with lyrics.ovh fallback
"""
import os
import logging
import re
from typing import Optional, Tuple
import lyricsgenius
from lyricsgenius.types import Song
import requests

logger = logging.getLogger(__name__)


class LyricsService:
    """Service for fetching and cleaning song lyrics"""
    
    def __init__(self):
        """Initialize lyrics service with Genius API credentials"""
        self.genius_token = os.getenv("GENIUS_ACCESS_TOKEN")
        
        if not self.genius_token:
            logger.warning("Genius API token not found. Lyrics fetching will be disabled.")
            self.genius = None
        else:
            try:
                self.genius = lyricsgenius.Genius(
                    self.genius_token,
                    timeout=15,
                    retries=2,
                    remove_section_headers=True,
                    skip_non_songs=True,
                    excluded_terms=["(Remix)", "(Live)", "(Instrumental)"]
                )
                logger.info("Genius API client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing Genius API: {e}")
                self.genius = None
    
    def fetch_lyrics(self, track_name: str, artist_name: str) -> Tuple[Optional[str], str, bool]:
        """
        Fetch lyrics for a song from Genius.
        
        Args:
            track_name: Name of the track
            artist_name: Name of the artist
            
        Returns:
            Tuple of (lyrics_text, source, is_instrumental)
        """
        if not self.genius:
            logger.warning("Genius API not available")
            return None, "none", False
        
        try:
            # Normalize track and artist names
            clean_track = self._normalize_title(track_name)
            clean_artist = self._normalize_artist(artist_name)
            
            logger.info(f"Searching for lyrics: '{clean_track}' by '{clean_artist}'")
            
            # Search for the song
            song = self.genius.search_song(clean_track, clean_artist)
            
            if song and song.lyrics:
                # Check if instrumental
                lyrics = song.lyrics
                is_instrumental = self._is_instrumental(lyrics)
                
                if is_instrumental:
                    logger.info(f"Track identified as instrumental: {track_name}")
                    return None, "genius", True
                
                # Clean the lyrics
                cleaned_lyrics = self._clean_lyrics(lyrics)
                
                if len(cleaned_lyrics.strip()) < 50:
                    logger.warning(f"Lyrics too short, might be instrumental: {track_name}")
                    return None, "genius", True
                
                logger.info(f"Successfully fetched lyrics for: {track_name}")
                return cleaned_lyrics, "genius", False
            
            logger.warning(f"No lyrics found for: {track_name} by {artist_name}")
            return None, "genius", False
            
        except Exception:
            pass

        # Fallback: lrclib.net
        return self._fetch_from_lrclib(track_name, artist_name)

    def _fetch_from_lrclib(self, track_name: str, artist_name: str) -> Tuple[Optional[str], str, bool]:
        """Fetch lyrics from lrclib.net — open API, no key, works from cloud IPs."""
        try:
            clean_track = self._normalize_title(track_name)
            clean_artist = self._normalize_artist(artist_name)
            url = "https://lrclib.net/api/get"
            resp = requests.get(url, params={"artist_name": clean_artist, "track_name": clean_track}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("instrumental"):
                    logger.info(f"lrclib: instrumental — {track_name}")
                    return None, "lrclib", True
                lyrics = data.get("plainLyrics") or ""
                if lyrics and len(lyrics.strip()) >= 50:
                    cleaned = self._clean_lyrics(lyrics)
                    logger.info(f"lrclib succeeded for: {track_name}")
                    return cleaned, "lrclib", False
                logger.warning(f"lrclib: no lyrics in response for '{track_name}'")
            elif resp.status_code == 404:
                # Exact match failed — try fuzzy search
                result = self._lrclib_search_fallback(clean_track, clean_artist)
                if result[0] is not None or result[2]:
                    return result
                logger.warning(f"lrclib: HTTP 404 for '{track_name}'")
            else:
                logger.warning(f"lrclib: HTTP {resp.status_code} for '{track_name}'")
        except Exception as e:
            logger.warning(f"lrclib failed for '{track_name}': {e}")
        return None, "none", False

    def _lrclib_search_fallback(self, track_name: str, artist_name: str) -> Tuple[Optional[str], str, bool]:
        """Fuzzy search fallback for when exact lrclib match fails (e.g. multi-artist tracks)."""
        try:
            query = f"{artist_name} {track_name}".strip()
            resp = requests.get("https://lrclib.net/api/search", params={"q": query}, timeout=10)
            if resp.status_code == 200:
                results = resp.json()
                if not results:
                    return None, "none", False

                # Find result whose trackName matches — avoids picking a same-album song
                clean_search = track_name.lower().strip()
                best = next(
                    (r for r in results if (r.get("trackName") or "").lower().strip() == clean_search),
                    results[0]  # fall back to first result if no title match
                )

                if best.get("instrumental"):
                    return None, "lrclib", True
                lyrics = best.get("plainLyrics") or ""
                if lyrics and len(lyrics.strip()) >= 50:
                    cleaned = self._clean_lyrics(lyrics)
                    logger.info(f"lrclib search fallback succeeded for: {track_name}")
                    return cleaned, "lrclib", False
        except Exception as e:
            logger.warning(f"lrclib search fallback failed for '{track_name}': {e}")
        return None, "none", False

    def _normalize_title(self, title: str) -> str:
        """
        Normalize track title for better matching.
        
        Args:
            title: Original track title
            
        Returns:
            Normalized title
        """
        # Remove common suffixes and metadata
        patterns = [
            r'\s*-\s*Remaster(ed)?\s*\d*',
            r'\s*-\s*\d{4}\s*Remaster',
            r'\s*\(.*?Remix.*?\)',
            r'\s*\(.*?Edit.*?\)',
            r'\s*\(.*?Version.*?\)',
            r'\s*\(feat\..*?\)',
            r'\s*\[.*?\]',
            r'\s*-\s*Live.*',
            r'\s*\(Live.*?\)',
            # Remix/edit styles common in streaming
            r'\s*-\s*Hardstyle.*',
            r'\s*-\s*Slowed.*',
            r'\s*-\s*Sped\s*Up.*',
            r'\s*-\s*Speed\s*Up.*',
            r'\s*-\s*Techno.*',
            r'\s*-\s*Hoodtrap.*',
            r'\s*-\s*Nightcore.*',
            r'\s*-\s*Lofi.*',
            r'\s*-\s*Lo-fi.*',
            r'\s*\(Hardstyle.*?\)',
            r'\s*\(Slowed.*?\)',
            r'\s*\(Sped.*?\)',
        ]
        
        normalized = title
        for pattern in patterns:
            normalized = re.sub(pattern, '', normalized, flags=re.IGNORECASE)
        
        return normalized.strip()
    
    def _normalize_artist(self, artist: str) -> str:
        """
        Normalize artist name for better matching.
        
        Args:
            artist: Original artist name (can be list-like for multiple artists)
            
        Returns:
            Normalized artist name
        """
        # If multiple artists, take the first one
        if isinstance(artist, list):
            artist = artist[0] if artist else ""
        
        # Remove "The" prefix
        artist = re.sub(r'^The\s+', '', artist, flags=re.IGNORECASE)
        
        return artist.strip()
    
    def _clean_lyrics(self, lyrics: str) -> str:
        """
        Clean and normalize lyrics text.
        
        Args:
            lyrics: Raw lyrics text
            
        Returns:
            Cleaned lyrics
        """
        # Remove Genius annotations and metadata
        lyrics = re.sub(r'\d+Embed$', '', lyrics)
        lyrics = re.sub(r'You might also like', '', lyrics)
        lyrics = re.sub(r'\[.*?\]', '', lyrics)  # Remove [Verse 1], [Chorus], etc.
        
        # Remove URLs
        lyrics = re.sub(r'http\S+', '', lyrics)
        
        # Remove excessive whitespace
        lyrics = re.sub(r'\n{3,}', '\n\n', lyrics)
        lyrics = re.sub(r' {2,}', ' ', lyrics)
        
        # Remove leading/trailing whitespace
        lyrics = lyrics.strip()
        
        return lyrics
    
    def _is_instrumental(self, lyrics: str) -> bool:
        """
        Check if a track is instrumental based on lyrics.
        
        Args:
            lyrics: Lyrics text
            
        Returns:
            True if instrumental, False otherwise
        """
        if not lyrics or len(lyrics.strip()) < 20:
            return True
        
        # Common instrumental indicators
        instrumental_indicators = [
            "instrumental",
            "no lyrics",
            "purely instrumental",
            "music only"
        ]
        
        lyrics_lower = lyrics.lower()
        for indicator in instrumental_indicators:
            if indicator in lyrics_lower:
                return True
        
        # Check if mostly non-alphabetic (unlikely to be real lyrics)
        alpha_chars = sum(c.isalpha() for c in lyrics)
        if alpha_chars < len(lyrics) * 0.5:
            return True
        
        return False
    
    def detect_language(self, text: str) -> str:
        """
        Detect language of lyrics text.
        
        Args:
            text: Lyrics text
            
        Returns:
            ISO language code (e.g., 'en', 'es', 'fr')
        """
        try:
            from langdetect import detect
            language = detect(text)
            logger.info(f"Detected language: {language}")
            return language
        except Exception as e:
            logger.warning(f"Error detecting language: {e}")
            return "en"  # Default to English
    
    def batch_fetch_lyrics(
        self, 
        tracks: list, 
        max_tracks: Optional[int] = None
    ) -> dict:
        """
        Fetch lyrics for multiple tracks.
        
        Args:
            tracks: List of dicts with 'name' and 'artists' keys
            max_tracks: Maximum number of tracks to process (for rate limiting)
            
        Returns:
            Dictionary mapping track IDs to lyrics data
        """
        results = {}
        
        tracks_to_process = tracks[:max_tracks] if max_tracks else tracks
        
        for i, track in enumerate(tracks_to_process):
            track_name = track.get("name")
            artists = track.get("artists", [])
            artist_name = artists[0] if artists else "Unknown"
            track_id = track.get("track_id") or track.get("spotify_id")
            
            if not track_name or not track_id:
                continue
            
            logger.info(f"Fetching lyrics {i+1}/{len(tracks_to_process)}: {track_name}")
            
            lyrics, source, is_instrumental = self.fetch_lyrics(track_name, artist_name)
            
            results[track_id] = {
                "lyrics": lyrics,
                "source": source,
                "is_instrumental": is_instrumental,
                "language": self.detect_language(lyrics) if lyrics else None
            }
        
        logger.info(f"Batch fetch complete: {len(results)} tracks processed")
        return results


# Global instance
_lyrics_service = None


def get_lyrics_service() -> LyricsService:
    """
    Get or create global lyrics service instance.
    
    Returns:
        LyricsService instance
    """
    global _lyrics_service
    if _lyrics_service is None:
        _lyrics_service = LyricsService()
    return _lyrics_service
