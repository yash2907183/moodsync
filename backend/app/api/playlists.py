import re
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models import get_db
from app.models.database import User, Track, Lyric, Score, PlaylistJob
from app.api.auth import get_current_user
from app.services.spotify import get_spotify_service
from app.services.lyrics import get_lyrics_service
from app.services.sentiment import get_sentiment_analyzer

router = APIRouter()
logger = logging.getLogger(__name__)

SPOTIFY_PLAYLIST_RE = re.compile(
    r"(?:https?://open\.spotify\.com/playlist/|spotify:playlist:)([A-Za-z0-9]+)"
)


def _parse_playlist_id(url: str) -> str | None:
    m = SPOTIFY_PLAYLIST_RE.search(url)
    return m.group(1) if m else None


def _run_playlist_job(job_id: str, playlist_url: str, spotify_token: str, db: Session):
    job = db.query(PlaylistJob).filter(PlaylistJob.job_id == job_id).first()
    if not job:
        return

    try:
        job.status = "running"
        db.commit()

        playlist_id = _parse_playlist_id(playlist_url)
        if not playlist_id:
            job.status = "error"
            job.error = "Could not parse playlist ID from URL."
            db.commit()
            return

        spotify = get_spotify_service()
        lyrics_svc = get_lyrics_service()
        sentiment = get_sentiment_analyzer()

        playlist_name, raw_tracks = spotify.get_playlist_tracks(spotify_token, playlist_id)
        job.playlist_name = playlist_name
        job.total_tracks = len(raw_tracks)
        db.commit()

        track_results = []

        for raw in raw_tracks:
            spotify_id = raw.get("spotify_id")
            if not spotify_id:
                continue

            # Upsert track
            track = db.query(Track).filter(Track.spotify_id == spotify_id).first()
            if not track:
                track = Track(
                    track_id=f"track_{spotify_id}",
                    spotify_id=spotify_id,
                    name=raw.get("name"),
                    artists=raw.get("artists"),
                    album=raw.get("album"),
                    duration_ms=raw.get("duration_ms"),
                    popularity=raw.get("popularity"),
                )
                db.add(track)
                db.commit()

            # Lyrics
            lyric_obj = db.query(Lyric).filter(Lyric.track_id == track.track_id).first()
            if not lyric_obj:
                artist_name = track.artists[0] if track.artists else "Unknown"
                lyrics_text, source, is_instrumental = lyrics_svc.fetch_lyrics(track.name, artist_name)
                if lyrics_text or is_instrumental:
                    language = lyrics_svc.detect_language(lyrics_text) if lyrics_text else None
                    lyric_obj = Lyric(
                        track_id=track.track_id,
                        source=source,
                        language=language,
                        text=lyrics_text or "",
                        is_instrumental=is_instrumental,
                    )
                    db.add(lyric_obj)
                    db.commit()

            # Sentiment (skip if already scored)
            if track.valence is None:
                if lyric_obj and lyric_obj.is_instrumental:
                    track.valence = 0.5
                    track.energy = 0.5
                    db.commit()
                elif lyric_obj and lyric_obj.text:
                    result = sentiment.analyze_comprehensive(lyric_obj.text)
                    track.valence = result["valence"]
                    track.energy = result["arousal"]
                    existing_score = db.query(Score).filter(Score.track_id == track.track_id).first()
                    if not existing_score:
                        db.add(Score(
                            track_id=track.track_id,
                            model="hybrid_roberta",
                            polarity=result["polarity"],
                            valence_score=result["valence"],
                            arousal_score=result["arousal"],
                            joy=result["emotions"].get("joy", 0),
                            sadness=result["emotions"].get("sadness", 0),
                            anger=result["emotions"].get("anger", 0),
                            fear=result["emotions"].get("fear", 0),
                            optimism=result["emotions"].get("optimism", 0),
                        ))
                    db.commit()

            track_results.append({
                "name": track.name,
                "artist": track.artists[0] if track.artists else "Unknown",
                "valence": round(track.valence, 3) if track.valence is not None else None,
                "energy": round(track.energy, 3) if track.energy is not None else None,
            })

            job.analyzed_tracks += 1
            db.commit()

        # Aggregate
        scored = [t for t in track_results if t["valence"] is not None]
        avg_valence = round(sum(t["valence"] for t in scored) / len(scored), 3) if scored else None
        avg_energy  = round(sum(t["energy"]  for t in scored) / len(scored), 3) if scored else None

        job.result = {
            "playlist_name": playlist_name,
            "total_tracks": len(raw_tracks),
            "analyzed_tracks": len(scored),
            "avg_valence": avg_valence,
            "avg_energy": avg_energy,
            "tracks": track_results,
        }
        job.status = "done"
        db.commit()
        logger.info(f"Playlist job {job_id} done — {len(scored)}/{len(raw_tracks)} tracks scored")

    except Exception as e:
        logger.error(f"Playlist job {job_id} failed: {e}")
        try:
            job.status = "error"
            job.error = str(e)[:400]
            db.commit()
        except Exception:
            db.rollback()


@router.post("/analyze")
async def start_playlist_analysis(
    background_tasks: BackgroundTasks,
    playlist_url: str,
    spotify_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _parse_playlist_id(playlist_url):
        raise HTTPException(status_code=422, detail="Invalid Spotify playlist URL.")

    job_id = str(uuid.uuid4())
    job = PlaylistJob(
        job_id=job_id,
        user_id=current_user.user_id,
        playlist_url=playlist_url,
        status="pending",
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(_run_playlist_job, job_id, playlist_url, spotify_token, db)

    return {"job_id": job_id, "status": "pending"}


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(PlaylistJob).filter(
        PlaylistJob.job_id == job_id,
        PlaylistJob.user_id == current_user.user_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "playlist_name": job.playlist_name,
        "total_tracks": job.total_tracks,
        "analyzed_tracks": job.analyzed_tracks,
        "result": job.result,
        "error": job.error,
    }
