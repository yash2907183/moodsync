"""
Sentiment analysis service using multiple NLP models
"""
import os
import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import torch

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    
    def __init__(self, use_gpu: bool = False):
        
        self.device = 0 if use_gpu and torch.cuda.is_available() else -1
        self.models = {}
        self.load_models()
    
    def load_models(self):

        try:
            # 1. VADER - fast baseline for general sentiment
            logger.info("Loading VADER sentiment analyzer...")
            self.vader = SentimentIntensityAnalyzer()
            
            # 2. RoBERTa - better contextual sentiment
            logger.info("Loading RoBERTa sentiment model...")
            sentiment_model = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment")
            self.roberta_sentiment = pipeline(
                "sentiment-analysis",
                model=sentiment_model,
                device=self.device,
                max_length=512,
                truncation=True
            )
            
            # 3. Emotion model - 7 focused emotions (anger/disgust/fear/joy/neutral/sadness/surprise)
            # j-hartmann gives proper per-emotion confidence vs GoEmotions' 28-label spread
            logger.info("Loading emotion model (j-hartmann)...")
            emotion_model = os.getenv("EMOTION_MODEL", "j-hartmann/emotion-english-distilroberta-base")
            self.emotion_classifier = pipeline(
                "text-classification",
                model=emotion_model,
                device=self.device,
                top_k=None,
                max_length=512,
                truncation=True
            )
            
            logger.info("All sentiment models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading sentiment models: {e}")
            raise
    
    def analyze_vader(self, text: str) -> Dict[str, float]:
        
        scores = self.vader.polarity_scores(text)
        return {
            "polarity": scores["compound"],  # -1 to 1
            "positive": scores["pos"],
            "negative": scores["neg"],
            "neutral": scores["neu"]
        }
    
    def analyze_roberta(self, text: str) -> Dict[str, float]:
        
        result = self.roberta_sentiment(text)[0]
        
        # Convert label to polarity score
        label = result["label"].lower()
        score = result["score"]
        
        if "positive" in label:
            polarity = score
        elif "negative" in label:
            polarity = -score
        else:  # neutral
            polarity = 0.0
        
        return {
            "polarity": polarity,
            "confidence": score,
            "label": label
        }
    
    def analyze_emotions(self, text: str) -> Dict[str, float]:
        results = self.emotion_classifier(text)[0]

        emotions = {
            "joy": 0.0,
            "sadness": 0.0,
            "anger": 0.0,
            "fear": 0.0,
            "surprise": 0.0,
            "disgust": 0.0,
            "optimism": 0.0,
            "love": 0.0,
        }

        # j-hartmann/emotion-english-distilroberta-base labels:
        # anger, disgust, fear, joy, neutral, sadness, surprise
        for result in results:
            label = result["label"].lower()
            score = result["score"]
            if label == "joy":
                emotions["joy"] = max(emotions["joy"], score)
                emotions["optimism"] = max(emotions["optimism"], score * 0.5)
            elif label == "sadness":
                emotions["sadness"] = max(emotions["sadness"], score)
            elif label == "anger":
                emotions["anger"] = max(emotions["anger"], score)
            elif label == "fear":
                emotions["fear"] = max(emotions["fear"], score)
            elif label == "disgust":
                emotions["disgust"] = max(emotions["disgust"], score)
                emotions["anger"] = max(emotions["anger"], score * 0.5)
            elif label == "surprise":
                emotions["surprise"] = max(emotions["surprise"], score)
                emotions["joy"] = max(emotions["joy"], score * 0.3)

        return emotions

    def compute_valence_arousal(self, emotions: Dict[str, float]) -> Tuple[float, float]:
        positive = (
            emotions.get("joy", 0) +
            emotions.get("optimism", 0) * 0.8 +
            emotions.get("love", 0) +
            emotions.get("surprise", 0) * 0.3
        )
        negative = (
            emotions.get("sadness", 0) +
            emotions.get("anger", 0) +
            emotions.get("fear", 0) * 0.8 +
            emotions.get("disgust", 0) * 0.7
        )

        # Ratio-based: relative balance matters, not absolute magnitudes
        total = positive + negative
        if total > 0.01:
            valence = (positive - negative) / total  # -1 to 1
        else:
            valence = 0.0

        arousal = (
            emotions.get("anger", 0) * 0.9 +
            emotions.get("fear", 0) * 0.8 +
            emotions.get("joy", 0) * 0.6 +
            emotions.get("surprise", 0) * 0.7 -
            emotions.get("sadness", 0) * 0.5
        )
        arousal_total = sum(emotions.values())
        if arousal_total > 0.01:
            arousal = arousal / arousal_total

        valence = float(np.clip(valence, -1, 1))
        arousal = float(np.clip(arousal, -1, 1))

        return valence, arousal
    
    def analyze_comprehensive(self, text: str, use_all_models: bool = True) -> Dict[str, any]:
        
        if not text or len(text.strip()) < 10:
            logger.warning("Text too short for analysis")
            return self._empty_result()
        
        results = {}
        
        try:
            # VADER analysis (fast baseline)
            vader_scores = self.analyze_vader(text)
            results["vader"] = vader_scores
            
            if use_all_models:
                # RoBERTa sentiment (better accuracy)
                roberta_scores = self.analyze_roberta(text)
                results["roberta"] = roberta_scores
                
                # Emotion classification
                emotions = self.analyze_emotions(text)
                results["emotions"] = emotions
                
                # Compute valence-arousal
                valence, arousal = self.compute_valence_arousal(emotions)
                results["valence"] = valence
                results["arousal"] = arousal
                
                # Ensemble polarity (weighted average)
                results["polarity"] = (
                    vader_scores["polarity"] * 0.3 +
                    roberta_scores["polarity"] * 0.7
                )
                
                results["confidence"] = roberta_scores["confidence"]
            else:
                # Fast mode: only VADER
                results["polarity"] = vader_scores["polarity"]
                results["emotions"] = self._empty_emotions()
                results["valence"] = vader_scores["polarity"]
                results["arousal"] = 0.0
                results["confidence"] = 0.7
            
            return results
            
        except Exception as e:
            logger.error(f"Error in comprehensive analysis: {e}")
            return self._empty_result()
    
    def _empty_emotions(self) -> Dict[str, float]:
        """Return empty emotion dictionary."""
        return {
            "joy": 0.0,
            "sadness": 0.0,
            "anger": 0.0,
            "fear": 0.0,
            "surprise": 0.0,
            "disgust": 0.0,
            "optimism": 0.0,
            "love": 0.0
        }
    
    def _empty_result(self) -> Dict[str, any]:
        """Return empty analysis result."""
        return {
            "polarity": 0.0,
            "emotions": self._empty_emotions(),
            "valence": 0.0,
            "arousal": 0.0,
            "confidence": 0.0
        }


# Global instance (singleton pattern)
_sentiment_analyzer = None


def get_sentiment_analyzer(use_gpu: bool = False) -> SentimentAnalyzer:
    
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = SentimentAnalyzer(use_gpu=use_gpu)
    return _sentiment_analyzer
