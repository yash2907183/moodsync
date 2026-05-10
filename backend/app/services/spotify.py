"""
Spotify API integration service
"""
import os
import logging
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
from spotipy.exceptions import SpotifyException

logger = logging.getLogger(__name__)


class SpotifyService:
    """Service for interacting with Spotify API"""
    
    def __init__(self):
        """Initialize Spotify service with credentials from environment"""
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/api/auth/callback")
        
        if not self.client_id or not self.client_secret:
            raise ValueError("Spotify credentials not found in environment variables")
        
        # Scopes needed for the application
        self.scope = " ".join([
            "user-read-recently-played",
            "user-top-read",
            "user-library-read",
            "playlist-read-private",
            "user-read-playback-state"
        ])
    
    def get_oauth_manager(self) -> SpotifyOAuth:
        """
        Create OAuth manager for user authentication.
        
        Returns:
            SpotifyOAuth instance
        """
        return SpotifyOAuth(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            scope=self.scope,
            cache_path=None  # Don't cache, handle tokens in DB
        )
    
    def get_client(self, access_token: str) -> spotipy.Spotify:
        """
        Get authenticated Spotify client.
        
        Args:
            access_token: User's access token
            
        Returns:
            Authenticated Spotify client
        """
        if not access_token:
            raise ValueError("No Spotify access token provided")
        token = access_token.strip()
        if token.lower().startswith("bearer "):
            token = token.split(None, 1)[1]
        
        logger.debug("Creating Spotify client - token length = %d", len(token))
        return spotipy.Spotify(auth=access_token)
    
    def get_user_profile(self, access_token: str) -> Dict:
        """
        Get user's Spotify profile.
        
        Args:
            access_token: User's access token
            
        Returns:
            User profile dictionary
        """
        try:
            sp = self.get_client(access_token)
            profile = sp.current_user()
            return {
                "spotify_id": profile["id"],
                "email": profile.get("email"),
                "display_name": profile.get("display_name"),
                "country": profile.get("country")
            }
        except SpotifyException as e:
            logger.error(f"Error fetching user profile: {e}")
            raise
    
    def get_recently_played(
        self, 
        access_token: str, 
        limit: int = 50,
        after: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Get user's recently played tracks.
        
        Args:
            access_token: User's access token
            limit: Number of tracks to fetch (max 50)
            after: Only return tracks played after this timestamp
            
        Returns:
            List of recently played track dictionaries
        """
        try:
            sp = self.get_client(access_token)
            
            # Convert datetime to Unix timestamp (milliseconds)
            after_ms = None
            if after:
                after_ms = int(after.timestamp() * 1000)
            
            results = sp.current_user_recently_played(limit=limit, after=after_ms)
            
            tracks = []
            for item in results.get("items", []):
                if not item or not item.get("track"):
                    continue
                track_obj = item.get("track") or {}
                played_at_raw = item.get("played_at")
                played_at = None
                if played_at_raw:
                    try:
                        played_at = datetime.fromisoformat(played_at_raw.replace("Z", "+00:00"))
                    except Exception:
                        played_at = None

                context = item.get("context") or {}
                track_data = self._extract_track_data(track_obj)
                track_data["played_at"] = played_at
                track_data["context_type"] = context.get("type")
                track_data["context_uri"] = context.get("uri")

                tracks.append(track_data)
            
            logger.info(f"Fetched {len(tracks)} recently played tracks")
            return tracks
            
        except SpotifyException as e:
            logger.error(f"Error fetching recently played: {e}")
            raise
    
    def get_track_audio_features(self, access_token: str, track_ids: List[str]) -> Dict[str, Dict]:
        """
        Get audio features for multiple tracks.
        Handled gracefully to support Spotify's 2024 API restrictions (403 errors).
        """
        sp = self.get_client(access_token)
        features_map: Dict[str, Dict] = {}

        # If the list is empty, return immediately
        if not track_ids:
            return features_map

        # Process in batches of 100
        for i in range(0, len(track_ids), 100):
            batch = track_ids[i:i+100]
            
            try:
                features_list = sp.audio_features(batch)
                
                if not features_list:
                    continue

                for features in features_list:
                    if not features:
                        continue
                        
                    track_id = features.get("id")
                    if track_id:
                        features_map[track_id] = {
                            "valence": features.get("valence"),
                            "energy": features.get("energy"),
                            "danceability": features.get("danceability"),
                            "tempo": features.get("tempo"),
                            "loudness": features.get("loudness"),
                            "speechiness": features.get("speechiness"),
                            "acousticness": features.get("acousticness"),
                            "instrumentalness": features.get("instrumentalness"),
                            "liveness": features.get("liveness"),
                            "key": features.get("key"),
                            "mode": features.get("mode"),
                            "time_signature": features.get("time_signature")
                        }

            except (SpotifyException, Exception) as e:
                # We catch generic Exception too, just in case spotipy raises a raw HTTPError
                # We Log the error but DO NOT RAISE it. This allows the sync to continue.
                logger.warning(f"Could not fetch audio features for batch (likely Spotify 403 restriction): {e}")
                continue

        logger.info(f"Fetched audio features for {len(features_map)}/{len(track_ids)} tracks")
        return features_map

    
    def get_saved_tracks(self, access_token: str, limit: int = 50) -> List[Dict]:
        """
        Get user's saved (liked) tracks.
        
        Args:
            access_token: User's access token
            limit: Number of tracks to fetch
            
        Returns:
            List of saved track dictionaries
        """
        try:
            sp = self.get_client(access_token)
            
            tracks = []
            offset = 0
            while len(tracks) < limit:
                batch_size = min(50, limit - len(tracks))
                results = sp.current_user_saved_tracks(limit=batch_size, offset=offset)
                
                if not results["items"]:
                    break
                
                for item in results["items"]:
                    track_data = self._extract_track_data(item["track"])
                    track_data["added_at"] = datetime.fromisoformat(
                        item["added_at"].replace("Z", "+00:00")
                    )
                    tracks.append(track_data)
                
                offset += batch_size
                
                if not results["next"]:
                    break
            
            logger.info(f"Fetched {len(tracks)} saved tracks")
            return tracks
            
        except SpotifyException as e:
            logger.error(f"Error fetching saved tracks: {e}")
            raise
    
    def get_user_playlists(self, access_token: str) -> List[Dict]:
        """
        Get user's playlists.
        
        Args:
            access_token: User's access token
            
        Returns:
            List of playlist dictionaries
        """
        try:
            sp = self.get_client(access_token)
            
            playlists = []
            results = sp.current_user_playlists(limit=50)
            
            while results:
                for playlist in results["items"]:
                    playlists.append({
                        "playlist_id": playlist["id"],
                        "name": playlist["name"],
                        "track_count": playlist["tracks"]["total"],
                        "uri": playlist["uri"]
                    })
                
                if results["next"]:
                    results = sp.next(results)
                else:
                    break
            
            logger.info(f"Fetched {len(playlists)} playlists")
            return playlists
            
        except SpotifyException as e:
            logger.error(f"Error fetching playlists: {e}")
            raise
    
    def get_playlist_tracks(self, access_token: str, playlist_id: str) -> tuple[str, List[Dict]]:
        """
        Fetch all tracks from a Spotify playlist (handles pagination).
        Returns (playlist_name, list_of_track_dicts).
        """
        try:
            sp = self.get_client(access_token)
            meta = sp.playlist(playlist_id, fields="name")
            playlist_name = meta.get("name", "Unknown Playlist")

            tracks = []
            results = sp.playlist_items(
                playlist_id,
                fields="items(track(id,name,artists,album,duration_ms,popularity,uri)),next",
                limit=100,
            )
            while results:
                for item in results.get("items", []):
                    track = item.get("track")
                    if track and track.get("id"):
                        tracks.append(self._extract_track_data(track))
                if results.get("next"):
                    results = sp.next(results)
                else:
                    break

            logger.info(f"Fetched {len(tracks)} tracks from playlist {playlist_id}")
            return playlist_name, tracks
        except SpotifyException as e:
            logger.error(f"Error fetching playlist tracks: {e}")
            raise

    def _extract_track_data(self, track: Dict) -> Dict:
        if not track:
            return {}
        """
        Extract relevant track data from Spotify track object.
        
        Args:
            track: Spotify track object
            
        Returns:
            Cleaned track data dictionary
        """
        return {
            "spotify_id": track.get("id"),
            "name": track.get("name"),
            "artists": [artist.get("name","Unknown") for artist in track.get("artists",[])],
            "album": (track.get("album") or {}).get("name"),
            "duration_ms": track.get("duration_ms"),
            "popularity": track.get("popularity"),
            "uri": track.get("uri"),
        }


# Global instance
_spotify_service = None


def get_spotify_service() -> SpotifyService:
    """
    Get or create global Spotify service instance.
    
    Returns:
        SpotifyService instance
    """
    global _spotify_service
    if _spotify_service is None:
        _spotify_service = SpotifyService()
    return _spotify_service
