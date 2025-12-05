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
    """
    Multi-model sentiment analysis for music lyrics.
    Combines VADER, RoBERTa sentiment, and GoEmotions for comprehensive analysis.
    """
    
    def __init__(self, use_gpu: bool = False):
        """
        Initialize sentiment analysis models.
        
        Args:
            use_gpu: Whether to use GPU for inference
        """
        self.device = 0 if use_gpu and torch.cuda.is_available() else -1
        self.models = {}
        self.load_models()
    
    def load_models(self):
        """Load all sentiment and emotion classification models."""
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
            
            # 3. GoEmotions - multi-label emotion classification
            logger.info("Loading GoEmotions emotion model...")
            emotion_model = os.getenv("EMOTION_MODEL", "joeddav/distilbert-base-uncased-go-emotions-student")
            self.emotion_classifier = pipeline(
                "text-classification",
                model=emotion_model,
                device=self.device,
                top_k=None,  # Return all emotions
                max_length=512,
                truncation=True
            )
            
            logger.info("All sentiment models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading sentiment models: {e}")
            raise
    
    def analyze_vader(self, text: str) -> Dict[str, float]:
        """
        Analyze sentiment using VADER (rule-based).
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with sentiment scores
        """
        scores = self.vader.polarity_scores(text)
        return {
            "polarity": scores["compound"],  # -1 to 1
            "positive": scores["pos"],
            "negative": scores["neg"],
            "neutral": scores["neu"]
        }
    
    def analyze_roberta(self, text: str) -> Dict[str, float]:
        """
        Analyze sentiment using RoBERTa (transformer-based).
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with sentiment polarity
        """
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
        """
        Classify emotions using GoEmotions model.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary mapping emotion names to probabilities
        """
        results = self.emotion_classifier(text)[0]
        
        # Initialize all emotions
        emotions = {
            "joy": 0.0,
            "sadness": 0.0,
            "anger": 0.0,
            "fear": 0.0,
            "surprise": 0.0,
            "disgust": 0.0,
            "optimism": 0.0,
            "love": 0.0
        }
        
        # Map GoEmotions labels to our emotion categories
        emotion_mapping = {
            "joy": "joy",
            "sadness": "sadness",
            "anger": "anger",
            "fear": "fear",
            "surprise": "surprise",
            "disgust": "disgust",
            "optimism": "optimism",
            "love": "love",
            "admiration": "love",
            "amusement": "joy",
            "approval": "optimism",
            "caring": "love",
            "desire": "love",
            "excitement": "joy",
            "gratitude": "joy",
            "pride": "joy",
            "relief": "joy",
            "disappointment": "sadness",
            "embarrassment": "sadness",
            "grief": "sadness",
            "nervousness": "fear",
            "remorse": "sadness",
            "annoyance": "anger",
            "disapproval": "anger",
        }
        
        # Aggregate scores
        for result in results:
            label = result["label"]
            score = result["score"]
            
            if label in emotion_mapping:
                emotion = emotion_mapping[label]
                emotions[emotion] = max(emotions[emotion], score)
        
        return emotions
    
    def compute_valence_arousal(self, emotions: Dict[str, float]) -> Tuple[float, float]:
        """
        Map emotions to valence-arousal space (Russell's Circumplex Model).
        
        Args:
            emotions: Dictionary of emotion scores
            
        Returns:
            Tuple of (valence, arousal) scores in range [-1, 1]
        """
        # Valence (pleasantness): positive on right, negative on left
        valence = (
            emotions.get("joy", 0) * 0.8 +
            emotions.get("love", 0) * 0.9 +
            emotions.get("optimism", 0) * 0.6 -
            emotions.get("sadness", 0) * 0.7 -
            emotions.get("anger", 0) * 0.8 -
            emotions.get("fear", 0) * 0.6 -
            emotions.get("disgust", 0) * 0.7
        )
        
        # Arousal (activation): high energy on top, low energy on bottom
        arousal = (
            emotions.get("anger", 0) * 0.9 +
            emotions.get("fear", 0) * 0.8 +
            emotions.get("joy", 0) * 0.6 +
            emotions.get("surprise", 0) * 0.7 -
            emotions.get("sadness", 0) * 0.5
        )
        
        # Normalize to [-1, 1]
        valence = np.clip(valence, -1, 1)
        arousal = np.clip(arousal, -1, 1)
        
        return float(valence), float(arousal)
    
    def analyze_comprehensive(self, text: str, use_all_models: bool = True) -> Dict[str, any]:
        """
        Perform comprehensive sentiment and emotion analysis.
        
        Args:
            text: Lyrics or text to analyze
            use_all_models: Whether to use all models (slower but more accurate)
            
        Returns:
            Dictionary with comprehensive sentiment analysis
        """
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
    """
    Get or create global sentiment analyzer instance.
    
    Args:
        use_gpu: Whether to use GPU
        
    Returns:
        SentimentAnalyzer instance
    """
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = SentimentAnalyzer(use_gpu=use_gpu)
    return _sentiment_analyzer
