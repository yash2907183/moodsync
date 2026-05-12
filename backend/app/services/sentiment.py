"""
Sentiment analysis service — English (j-hartmann) + multilingual (XLM-RoBERTa)
"""
import os
import logging
from typing import Dict, Optional, Tuple
import numpy as np
from transformers import pipeline
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import torch

logger = logging.getLogger(__name__)

# Lazy-loaded multilingual model (not loaded at startup to save memory)
_multilingual_pipeline = None


def _get_multilingual_pipeline(device: int = -1):
    global _multilingual_pipeline
    if _multilingual_pipeline is None:
        logger.info("Loading multilingual sentiment model (XLM-RoBERTa)...")
        _multilingual_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
            device=device,
            max_length=512,
            truncation=True,
        )
        logger.info("Multilingual model loaded.")
    return _multilingual_pipeline


_fasttext_model = None


def _load_fasttext_model():
    """Download the 917 KB fastText language ID model on first use."""
    global _fasttext_model
    if _fasttext_model is not None:
        return _fasttext_model
    try:
        import fasttext
        import urllib.request, os
        path = "/tmp/fasttext_lid.ftz"
        if not os.path.exists(path):
            logger.info("Downloading fastText language ID model (917 KB)…")
            urllib.request.urlretrieve(
                "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz",
                path,
            )
        _fasttext_model = fasttext.load_model(path)
        logger.info("fastText language ID model loaded.")
    except Exception as e:
        logger.warning(f"fastText unavailable ({e}) — will fall back to langdetect.")
        _fasttext_model = None
    return _fasttext_model


def detect_language(text: str) -> str:
    """
    Detect language using fastText (primary) with langdetect as fallback.
    fastText handles Romanized/transliterated text (e.g. Romanized Hindi)
    significantly better than langdetect, which misclassifies it as English.
    """
    clean = text.replace("\n", " ").strip()[:500]
    if not clean:
        return "en"

    # Primary: fastText (supports 176 languages, handles Romanized scripts)
    model = _load_fasttext_model()
    if model is not None:
        try:
            labels, _ = model.predict(clean, k=1)
            return labels[0].replace("__label__", "")
        except Exception:
            pass

    # Fallback: langdetect
    try:
        from langdetect import detect
        return detect(clean)
    except Exception:
        return "en"


class SentimentAnalyzer:

    def __init__(self, use_gpu: bool = False):
        self.device = 0 if use_gpu and torch.cuda.is_available() else -1
        self._load_english_models()

    def _load_english_models(self):
        try:
            logger.info("Loading VADER sentiment analyzer...")
            self.vader = SentimentIntensityAnalyzer()

            logger.info("Loading RoBERTa sentiment model...")
            self.roberta_sentiment = pipeline(
                "sentiment-analysis",
                model=os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment"),
                device=self.device,
                max_length=512,
                truncation=True,
            )

            logger.info("Loading emotion model (j-hartmann)...")
            self.emotion_classifier = pipeline(
                "text-classification",
                model=os.getenv("EMOTION_MODEL", "j-hartmann/emotion-english-distilroberta-base"),
                device=self.device,
                top_k=None,
                max_length=512,
                truncation=True,
            )
            logger.info("All sentiment models loaded successfully!")
        except Exception as e:
            logger.error(f"Error loading sentiment models: {e}")
            raise

    # ── English analysis ────────────────────────────────────

    def analyze_vader(self, text: str) -> Dict[str, float]:
        scores = self.vader.polarity_scores(text)
        return {
            "polarity": scores["compound"],
            "positive": scores["pos"],
            "negative": scores["neg"],
            "neutral":  scores["neu"],
        }

    def analyze_roberta(self, text: str) -> Dict[str, float]:
        result = self.roberta_sentiment(text)[0]
        label  = result["label"].lower()
        score  = result["score"]
        polarity = score if "positive" in label else (-score if "negative" in label else 0.0)
        return {"polarity": polarity, "confidence": score, "label": label}

    def analyze_emotions(self, text: str) -> Dict[str, float]:
        results = self.emotion_classifier(text)[0]
        emotions = {k: 0.0 for k in ["joy", "sadness", "anger", "fear", "surprise", "disgust", "optimism", "love"]}
        for r in results:
            label = r["label"].lower()
            score = r["score"]
            if label == "joy":
                emotions["joy"]      = max(emotions["joy"], score)
                emotions["optimism"] = max(emotions["optimism"], score * 0.5)
            elif label == "sadness":
                emotions["sadness"]  = max(emotions["sadness"], score)
            elif label == "anger":
                emotions["anger"]    = max(emotions["anger"], score)
            elif label == "fear":
                emotions["fear"]     = max(emotions["fear"], score)
            elif label == "disgust":
                emotions["disgust"]  = max(emotions["disgust"], score)
                emotions["anger"]    = max(emotions["anger"], score * 0.5)
            elif label == "surprise":
                emotions["surprise"] = max(emotions["surprise"], score)
                emotions["joy"]      = max(emotions["joy"], score * 0.3)
        return emotions

    def compute_valence_arousal(self, emotions: Dict[str, float]) -> Tuple[float, float]:
        positive = (emotions.get("joy", 0) + emotions.get("optimism", 0) * 0.8
                    + emotions.get("love", 0) + emotions.get("surprise", 0) * 0.3)
        negative = (emotions.get("sadness", 0) + emotions.get("anger", 0)
                    + emotions.get("fear", 0) * 0.8 + emotions.get("disgust", 0) * 0.7)
        total    = positive + negative
        valence  = (positive - negative) / total if total > 0.01 else 0.0

        arousal  = (emotions.get("anger", 0) * 0.9 + emotions.get("fear", 0) * 0.8
                    + emotions.get("joy", 0) * 0.6 + emotions.get("surprise", 0) * 0.7
                    - emotions.get("sadness", 0) * 0.5)
        a_total  = sum(emotions.values())
        if a_total > 0.01:
            arousal = arousal / a_total

        return float(np.clip(valence, -1, 1)), float(np.clip(arousal, -1, 1))

    # ── Multilingual analysis ───────────────────────────────

    def _analyze_multilingual(self, text: str) -> Dict:
        """
        For non-English lyrics: use XLM-RoBERTa for polarity,
        then map to the same emotion/valence schema used by English analysis.
        """
        try:
            ml = _get_multilingual_pipeline(self.device)
            result  = ml(text[:512])[0]
            label   = result["label"].lower()
            score   = result["score"]

            # Map sentiment → polarity
            if "positive" in label:
                polarity = score
            elif "negative" in label:
                polarity = -score
            else:
                polarity = 0.0

            # Build approximate emotion dict from polarity
            # Less detailed than j-hartmann (we only have polarity, not 7 emotions)
            # Research note: this is where the English/non-English comparison is meaningful
            if polarity > 0.3:
                emotions = {**self._empty_emotions(), "joy": score, "optimism": score * 0.6}
            elif polarity < -0.3:
                emotions = {**self._empty_emotions(), "sadness": score * 0.5, "anger": score * 0.5}
            else:
                emotions = self._empty_emotions()

            valence, arousal = self.compute_valence_arousal(emotions)

            # Also run VADER as secondary signal (language-agnostic to some extent)
            vader_scores = self.analyze_vader(text)
            polarity = polarity * 0.7 + vader_scores["polarity"] * 0.3

            return {
                "polarity":   round(polarity, 3),
                "emotions":   emotions,
                "valence":    round(valence, 3),
                "arousal":    round(arousal, 3),
                "confidence": round(score, 3),
                "model":      "xlm-roberta-multilingual",
            }
        except Exception as e:
            logger.error(f"Multilingual analysis failed: {e}")
            return self._empty_result()

    # ── Main entry point ────────────────────────────────────

    def analyze_comprehensive(self, text: str, use_all_models: bool = True) -> Dict:
        if not text or len(text.strip()) < 10:
            return self._empty_result()

        # Detect language and route
        lang = detect_language(text)
        is_english = lang in ("en", "unknown") or lang.startswith("en")

        try:
            if is_english:
                vader_scores  = self.analyze_vader(text)
                roberta_scores = self.analyze_roberta(text)
                emotions      = self.analyze_emotions(text)
                valence, arousal = self.compute_valence_arousal(emotions)
                polarity = vader_scores["polarity"] * 0.3 + roberta_scores["polarity"] * 0.7
                return {
                    "polarity":   round(polarity, 3),
                    "emotions":   emotions,
                    "valence":    round(valence, 3),
                    "arousal":    round(arousal, 3),
                    "confidence": round(roberta_scores["confidence"], 3),
                    "language":   lang,
                    "model":      "j-hartmann-english",
                }
            else:
                result = self._analyze_multilingual(text)
                result["language"] = lang
                logger.info(f"Non-English lyrics analysed (lang={lang}) with XLM-RoBERTa")
                return result

        except Exception as e:
            logger.error(f"Error in comprehensive analysis: {e}")
            return self._empty_result()

    def _empty_emotions(self) -> Dict[str, float]:
        return {k: 0.0 for k in ["joy", "sadness", "anger", "fear", "surprise", "disgust", "optimism", "love"]}

    def _empty_result(self) -> Dict:
        return {"polarity": 0.0, "emotions": self._empty_emotions(), "valence": 0.0,
                "arousal": 0.0, "confidence": 0.0, "language": "unknown", "model": "none"}


_sentiment_analyzer = None


def get_sentiment_analyzer(use_gpu: bool = False) -> SentimentAnalyzer:
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = SentimentAnalyzer(use_gpu=use_gpu)
    return _sentiment_analyzer
