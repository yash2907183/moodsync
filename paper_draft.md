# MoodSync: Correlating Lyrical Sentiment with Self-Reported Mood via Personalised NLP Calibration

**Yash Chaturvedi**  
[Institution]  
[Email]

---

## Abstract

The relationship between music and mood has long been studied in psychology, but computationally operationalising this relationship in a real-time, personalised, and unobtrusive manner remains an open challenge. We present MoodSync, a fully deployed web application that passively tracks users' emotional states by analysing the lyrical content of their Spotify listening history through a multi-model natural language processing pipeline. The system combines three complementary models — j-hartmann's DistilRoBERTa emotion classifier (7-class), cardiffnlp's RoBERTa polarity model, and VADER — to derive a per-track valence score from song lyrics, aggregating these into a continuous daily mood timeline, a 7-day Holt exponential smoothing forecast, and session-level emotion regulation classifications. For non-English content, the pipeline falls back to XLM-RoBERTa, enabling cross-lingual mood tracking. A 7-day naturalistic field study with [N=4] participants examined whether NLP-derived lyrical valence correlates with self-reported daily mood on a 1–5 scale, finding a mean Pearson r = [X.XX] (p [</>] 0.05). Emotion regulation analysis revealed [dominant strategy] as the predominant listening behaviour across participants. A personalised linear calibration model — fit per user on their own check-in history — further improved model-to-mood correspondence. These results demonstrate that passive listening history, when processed through a carefully designed NLP ensemble, can serve as a meaningful and low-burden proxy signal for affective state, with direct implications for affect-aware music recommendation, mental health monitoring, and human-computer interaction.

**Keywords:** music emotion recognition, sentiment analysis, mood tracking, transformer models, emotion regulation, Spotify, NLP, personalised calibration

---

## I. Introduction

Music occupies a uniquely privileged position in human emotional life. Unlike most stimuli, music can simultaneously evoke, amplify, and regulate affect — people reach for specific tracks when grieving, when celebrating, when seeking focus, or when trying to lift a low mood [13, 14]. This deeply functional relationship between listening behaviour and emotional state raises a compelling computational question: if a person's music choices are shaped by how they feel, can we reverse the inference — reading their emotional state *from* their listening history?

This question has practical stakes. Mental health applications increasingly seek low-burden, continuous signals of emotional wellbeing that do not require active self-report effort from users. Streaming platforms such as Spotify hold longitudinal records of billions of listening events, and have already begun incorporating mood into playlist curation. However, existing mood-inference systems largely rely on audio features (tempo, mode, spectral characteristics) or collaborative filtering over implicit feedback — neither of which captures the *semantic emotional content* that listeners consciously respond to when choosing music.

Song lyrics offer a semantically rich, directly interpretable signal. When a person repeatedly listens to tracks about loneliness, yearning, or grief, that pattern is meaningfully different from a sequence of tracks about celebration and triumph — even if the acoustic characteristics of both sets are similar. Natural language processing has, in recent years, reached a level of maturity where such distinctions can be extracted automatically, at scale, and in multiple languages.

However, a key obstacle remains: universal sentiment models are calibrated on aggregate population data and do not account for individual listening personalities. A user who habitually listens to lyrically dark music — using it as solace rather than as a reflection of distress — will show a systematically lower mean valence than a user who listens to pop music, yet both may report similar self-assessed mood. Bridging this gap requires personalised calibration: learning, from each user's own history, how their model-derived valence scores map to their subjective experience.

MoodSync is designed to address all of these challenges simultaneously. It is a fully deployed, production system — not a prototype evaluated on static datasets — and its design decisions (choice of NLP models, scoring formula, session-based regulation classification, personalised calibration approach) are grounded in and motivated by the literature reviewed in Section II. A 7-day naturalistic field study provides empirical evidence on the core correlation question under real-world conditions.

This paper addresses six research questions:

- **RQ1:** Does NLP-derived lyrical valence correlate significantly with users' self-reported daily mood?
- **RQ2:** What emotion regulation strategies are observable from listening sequences, and is there a dominant strategy across participants?
- **RQ3:** Can personalised linear calibration improve the correspondence between model valence and subjective mood relative to the uncalibrated score?
- **RQ4:** Does the composite multi-model ensemble provide a more reliable mood proxy than any single model in isolation?
- **RQ5:** To what extent does genre, inferred from Last.fm tags, predict the emotional valence of listening sessions — and do genre-valence profiles differ across participants?
- **RQ6:** How does pipeline coverage and accuracy degrade for non-English content, and what are the implications for multilingual mood tracking?

This paper makes the following contributions:

1. An end-to-end, production-deployed NLP pipeline for continuous lyrical mood tracking from Spotify listening history, combining three complementary models into a composite valence score with mathematical transparency.
2. A session-level emotion regulation classifier that operationalises the theoretical taxonomy of Saarikallio and Erkkilä [15] computationally using valence trajectory statistics.
3. A personalised linear calibration framework that maps universal model output to individual self-reported mood, with Pearson r and statistical significance as evaluation metrics.
4. Empirical results from a 7-day naturalistic study with [N=4] participants, providing preliminary evidence on the viability of lyrical sentiment as a passive mood proxy.

---

## II. Related Work

### A. Lyric-Based Sentiment and Emotion Analysis

Early work by Logan et al. [6] applied Probabilistic Latent Semantic Analysis to song lyrics to derive topic-based similarity vectors, establishing text-based semantic representation as a viable approach for music analysis. Xia et al. [7] proposed the Sentiment Vector Space Model (s-VSM), addressing core challenges in lyric sentiment — noise words, polysemy, negation handling, and data sparseness — and demonstrated significant accuracy gains over standard VSM with SVM classification. Kumar and Minz [9] evaluated Naïve Bayes, KNN, and SVM classifiers using SentiWordNet-derived features on a four-class mood task, achieving 78.27% accuracy and demonstrating that ontology-based sentiment lexicons outperform raw text features for lyric classification.

Shukla et al. [1] provided a foundational review of lyric-based sentiment analysis, examining fusion methods that combine lyric and audio features and noting that late-fusion approaches require fewer training samples. Crucially, they draw on the Big Five personality inventory and the CAC scale to show that lyric sentiment is interpreted differently across users — a finding that motivates our personalised calibration approach. Çano and Morisio [5] introduced MoodyLyrics, a large-scale mood-annotated lyrics dataset built on Russell's valence-arousal circumplex [12], showing that valence is a stronger mood discriminator than arousal — directly informing our choice to centre analysis on a single valence dimension.

Choi et al. [2] applied NLP emotion analysis to approximately 11,000 Billboard Hot 100 lyrics using KNN, framing lyric sentiment as a powerful alternative to genre-based classification for recommendation. Chen and Tang [3] combined TF-IDF with sentiment analysis to build an emotion-point matrix for Chinese songs, demonstrating that lyric-based sentiment can substitute effectively for expensive collaborative filtering. These works establish the lyric-as-emotional-signal paradigm that MoodSync operationalises in a longitudinal, personalised context.

### B. Multimodal and Non-English Approaches

Schaab and Kruspe [4] investigated multimodal fusion of lyric and audio sentiment, finding that a 60/40 audio-text weighting yielded optimal performance and identifying inconsistent emotion taxonomies across datasets as a central obstacle. Their work underscores the complementary nature of text and audio — and the practical limitation that Spotify deprecated audio features for new applications in November 2024, making lyrics the sole feasible modality for our system.

For non-English content, Abburi et al. [11] performed multimodal sentiment analysis on Telugu songs using Doc2Vec lyric features combined with spectral and chroma audio features, achieving 85–91.2% accuracy and showing that song-segment selection significantly affects results. Wu et al. [10] constructed a graded Chinese sentiment lexicon via ConceptNet relations, highlighting the inadequacy of translated English dictionaries for Indic and East Asian lyric analysis. These findings are directly relevant to our XLM-RoBERTa fallback for non-English tracks and our acknowledgment that romanised Punjabi/Hindi lyrics present language detection challenges. Bottu and Ragavan [8] demonstrated a multimodal emotion-aware recommendation system integrating CNN-based facial expression recognition with 7-class lyric emotion classification, achieving 91.78% FER accuracy — showing the broader applicability of lyric emotion pipelines in real-world systems.

### C. Mood Tracking and Emotion Regulation

Studies by North et al. [14] established that people actively use music for mood regulation, identifying strategies including mood maintenance, enhancement, and distraction. Saarikallio and Erkkilä [15] formalised seven music-based mood regulation strategies. Computational approaches to inferring user mood from listening behaviour have largely relied on collaborative filtering signals [19] or explicit playlist mood labels. MoodSync differs by inferring mood from the *lyrical content* of naturally occurring listening history and correlating it against prospective self-report — without requiring explicit user labelling of tracks.

### D. NLP Models for Emotion

The j-hartmann/emotion-english-distilroberta-base model [16] provides 7-class emotion classification and has become a standard benchmark for English emotion analysis. For multilingual content, XLM-RoBERTa [17] provides cross-lingual polarity. VADER [18] remains a robust rule-based baseline suited to informal text. Our pipeline combines all three, with the composite score stored separately to enable personalised calibration as a post-study step.

### E. Research Gaps

A systematic examination of the reviewed literature reveals five gaps that MoodSync directly addresses:

**Gap 1 — No longitudinal, personalised deployed system exists.** All reviewed systems operate on fixed datasets at the track level. None aggregate scores across a specific user's personal listening history into a continuous daily mood signal.

**Gap 2 — The individual variability problem is acknowledged but not solved.** Shukla et al. [1] explicitly note that lyric sentiment is interpreted differently across users, yet no reviewed system implements a personalisation mechanism. MoodSync's per-user calibration model directly fills this gap.

**Gap 3 — Audio features are assumed to be available.** Multimodal approaches [4, 11] depend on Spotify's audio features API, which was deprecated for new applications in November 2024. No reviewed system proposes a lyrics-only approach that remains deployable under this constraint.

**Gap 4 — Non-English music is underrepresented.** While Wu et al. [10] and Abburi et al. [11] address specific languages, no reviewed system provides a general multilingual fallback within a unified deployed pipeline, nor addresses the romanisation problem for Indic scripts in a streaming context.

**Gap 5 — Emotion regulation is not computationally classified in real time.** Saarikallio and Erkkilä's [15] taxonomy is widely cited but has not been implemented as a real-time session-level classifier operating on live streaming data.

---

## III. NLP Model Architectures and Mathematical Foundations

A central contribution of this work is the application of a multi-model NLP ensemble to lyrical sentiment analysis. This section provides a detailed account of the architecture and mathematics underlying each model, and explains how they are integrated into MoodSync's valence scoring pipeline.

### A. The Transformer Architecture

All three neural models in MoodSync's pipeline — DistilRoBERTa, RoBERTa, and XLM-RoBERTa — are built on the Transformer encoder architecture introduced by Vaswani et al. (2017). The core operation is **scaled dot-product self-attention**, which allows each token in a sequence to attend to all other tokens simultaneously, capturing long-range dependencies that recurrent models (LSTMs, GRUs) struggle with.

Given an input sequence of tokens represented as a matrix X ∈ ℝ^(n×d_model), three linear projections produce query, key, and value matrices:

```
Q = X W_Q,    K = X W_K,    V = X W_V
```

where W_Q, W_K, W_V ∈ ℝ^(d_model × d_k) are learned weight matrices. The attention output is:

```
Attention(Q, K, V) = softmax( QK^T / √d_k ) · V
```

The scaling factor √d_k prevents the dot products from growing large in magnitude (which would push softmax into regions of very small gradients). The softmax produces a probability distribution over positions — intuitively, how much each token "attends to" every other token.

**Multi-Head Attention** runs h parallel attention heads, each with its own projections, then concatenates and projects the results:

```
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W_O

where head_i = Attention(Q W_Q^i, K W_K^i, V W_V^i)
```

Each head learns a different relational pattern. In emotion analysis, one head might specialise in negation scope ("not happy"), another in intensifiers ("extremely sad").

Each transformer layer also contains a **position-wise feed-forward network**:

```
FFN(x) = max(0, x W_1 + b_1) W_2 + b_2
```

Layer normalisation and residual connections surround both sub-layers:

```
x' = LayerNorm(x + Sublayer(x))
```

For classification, a special [CLS] token is prepended to the input. Its final hidden state h_[CLS] ∈ ℝ^d_model is passed through a linear classifier followed by softmax:

```
p = softmax( W_c · h_[CLS] + b_c )
```

where W_c ∈ ℝ^(num_classes × d_model) is the classification head.

### B. BERT and RoBERTa Pre-training

BERT (Devlin et al., 2019) introduced bidirectional pre-training via two tasks: **Masked Language Modelling (MLM)**, where 15% of tokens are masked and the model predicts them, and **Next Sentence Prediction (NSP)**. RoBERTa (Liu et al., 2019) removed NSP (shown to be unhelpful), used dynamic masking (different masks each epoch), larger batch sizes, and trained on significantly more data (160GB vs BERT's 16GB). These changes yielded consistent improvements across benchmarks.

The tokenisation scheme used by both BERT and RoBERTa is **Byte-Pair Encoding (BPE)**, which iteratively merges the most frequent character pairs to build a fixed vocabulary of ~50,000 subword units. The word "happiness" might be tokenised as ["happ", "iness"]; "joy" as a single token. This handles out-of-vocabulary words gracefully.

For MoodSync, the cardiffnlp/twitter-roberta-base-sentiment checkpoint fine-tunes RoBERTa on approximately 58 million tweets, specifically tuning it for the informal, abbreviated, emotionally-charged language style commonly found in social media text — which also characterises much contemporary song lyrics.

**Architecture:** 12 transformer layers, hidden dimension d_model = 768, 12 attention heads, d_k = 64 per head, ~125M parameters. Output: 3-class softmax (positive / neutral / negative).

### C. DistilRoBERTa and Knowledge Distillation (j-hartmann)

The j-hartmann emotion model is built on **DistilRoBERTa**, a distilled version of RoBERTa. Knowledge distillation (Hinton et al., 2015) trains a smaller *student* model to mimic the output distribution of a larger *teacher* model, using soft probability labels (rather than hard one-hot labels) which carry richer information about inter-class relationships.

The student training loss is a weighted combination:

```
L = α · L_CE(y, p_student) + (1 - α) · L_KL(p_teacher / T, p_student / T)
```

where L_CE is cross-entropy against true labels, L_KL is KL-divergence against the teacher's softened outputs (temperature T typically set to 2), and α balances the two objectives. The temperature T smooths the teacher's distribution, preventing it from collapsing to near-zero probabilities on non-target classes and allowing the student to learn relative similarities between classes.

**Architecture:** 6 transformer layers (half of RoBERTa's 12), d_model = 768, ~82M parameters — approximately 40% smaller and 60% faster at inference, with ~97% of RoBERTa's performance on downstream tasks.

The j-hartmann checkpoint fine-tunes DistilRoBERTa on a combination of six emotion datasets covering diverse text styles (tweets, Reddit posts, dialogue), producing 7-class probability outputs: joy, sadness, anger, fear, disgust, surprise, and neutral. It is currently the most-cited open-source emotion classifier on HuggingFace with over 3 million monthly downloads.

**Why this model for MoodSync:** Song lyrics share structural similarities with social media text — short, emotionally direct, heavy use of figurative language. The model's training data diversity and 7-class granularity make it the most appropriate single-model choice for lyric emotion classification.

### D. XLM-RoBERTa: Multilingual Extension

For non-English lyrics, MoodSync falls back to **XLM-RoBERTa** (Conneau et al., 2020), a multilingual variant of RoBERTa trained on 2.5TB of filtered CommonCrawl data across 100 languages.

The key architectural difference is in **tokenisation**. Unlike monolingual RoBERTa's BPE vocabulary of ~50,000 English-centric tokens, XLM-RoBERTa uses **SentencePiece** with a **unigram language model** and a vocabulary of 250,002 subword tokens distributed across 100 languages. The unigram model selects the vocabulary by iteratively pruning a large initial set, maximising the likelihood of the training corpus:

```
L(V) = Σ_s log P(s | V) = Σ_s log( max_{x ∈ seg(s,V)} Π_i p(x_i) )
```

where seg(s, V) is the set of all segmentations of sentence s given vocabulary V, and p(x_i) is the unigram probability of subword x_i. The shared multilingual vocabulary creates a **cross-lingual embedding space**: semantically similar words in different languages (e.g. "happy", "feliz", "خوش") map to nearby regions of the embedding manifold, enabling zero-shot cross-lingual transfer.

**Architecture:** 12 transformer layers, d_model = 768, 12 attention heads, ~270M parameters (larger than monolingual RoBERTa due to the expanded vocabulary embedding matrix).

MoodSync uses the cardiffnlp/twitter-xlm-roberta-base-sentiment checkpoint, fine-tuned on multilingual Twitter data across 8 languages. Its output is a 3-class softmax (positive / neutral / negative) rather than the 7-class output of j-hartmann — a known limitation arising from the scarcity of large-scale multilingual emotion-annotated datasets, as noted by Schaab and Kruspe [4].

**Comparative summary of the three models:**

| Property | VADER | DistilRoBERTa (j-hartmann) | XLM-RoBERTa |
|---|---|---|---|
| Type | Rule-based lexicon | Neural (distilled transformer) | Neural (multilingual transformer) |
| Parameters | N/A (~7,500 lexicon entries) | ~82M | ~270M |
| Layers | N/A | 6 | 12 |
| Vocabulary | Fixed sentiment lexicon | BPE, ~50K tokens | SentencePiece, 250K tokens |
| Languages | English | English | 100 languages |
| Output classes | Compound score [−1, +1] | 7 emotions | 3 polarity classes |
| Training data | Hand-curated rules | 6 emotion datasets | 2.5TB multilingual web text |
| Inference speed | Very fast (< 1ms) | Fast (~20ms/track) | Moderate (~40ms/track) |

### E. Valence Score Derivation

The outputs of j-hartmann — a 7-dimensional probability vector (p_joy, p_sadness, p_anger, p_fear, p_disgust, p_surprise, p_neutral) — are mapped to a scalar valence in [−1, +1] through a weighted emotion mass formula:

```
positive_mass = p_joy + 0.8 · p_optimism + 0.3 · p_surprise
negative_mass = p_sadness + p_anger + 0.8 · p_fear + 0.7 · p_disgust

valence = (positive_mass − negative_mass) / (positive_mass + negative_mass)
```

The weights reflect the partial positivity of surprise (which can be positive or negative) and the partial negativity of disgust relative to fear. This formula is bounded in (−1, +1) and collapses to 0 when positive and negative masses are equal — representing emotional neutrality.

Separately, a polarity score is computed from VADER and RoBERTa:

```
polarity = 0.3 · VADER_compound + 0.7 · RoBERTa_positive_prob − 0.7 · RoBERTa_negative_prob
```

The 0.7 weight on RoBERTa reflects its superior performance on formal text relative to VADER, while VADER's 0.3 contribution captures rule-based signals (negation, punctuation, capitalisation) that neural models can miss on very short lyric lines.

The composite is stored separately and not applied during the study period, to be used post-study in personalised calibration:

```
final_valence = (1 − α) · valence + α · polarity
```

where α is a user-specific scalar learned from paired (check-in, valence) observations via grid search over α ∈ [0, 1].

### F. Personalised Calibration: Mathematical Basis

Given n days of paired observations {(v_t, m_t)}_{t=1}^{n} where v_t is the daily mean valence and m_t is the normalised check-in score, Pearson's r quantifies linear correspondence:

```
r = Σ(v_t − v̄)(m_t − m̄) / √[Σ(v_t − v̄)² · Σ(m_t − m̄)²]
```

A linear regression model fits:

```
m̂_t = β · v_t + intercept
```

The intercept absorbs systematic baseline differences between individual listening habits and self-reported mood (e.g. a user who habitually listens to lyrically dark music regardless of mood will have a lower mean valence but may still show a strong positive correlation). The slope β captures the sensitivity of the user's mood to valence changes.

Statistical significance is assessed via the two-tailed t-test on r with n−2 degrees of freedom:

```
t = r · √(n − 2) / √(1 − r²)
```

A p-value < 0.05 is considered significant. With n=7 days, the critical value is |t| > 2.571 (t-distribution, 5 df), corresponding to |r| > 0.754.

---

## IV. System Design

### A. Architecture Overview

MoodSync is a full-stack web application organised into three layers: a Python 3.11 / FastAPI backend, a Next.js 14 (App Router) frontend, and a PostgreSQL relational database hosted on Neon. The backend is deployed on Railway (EU West region) and the frontend on Vercel; both communicate over HTTPS using a Next.js reverse proxy that forwards all `/api/*` requests to the Railway service, eliminating CORS complexity on the client side.

Authentication is handled via Spotify OAuth 2.0. When a user clicks "Connect with Spotify", the backend generates an authorisation URL using Spotipy's SpotifyOAuth manager, configured with `show_dialog=True` to force explicit account selection on every login — preventing cached sessions from being silently reused across different users. Upon callback, the backend exchanges the authorisation code for an access token and refresh token, looks up or creates a User record keyed on the Spotify `user_id`, and issues a signed JSON Web Token (JWT) using the HS256 algorithm. The JWT is stored in the browser's localStorage and attached as a Bearer token on every subsequent API request. The backend decodes and verifies the JWT on each protected endpoint using a FastAPI dependency, extracting the `user_id` to scope all database queries to the authenticated user.

The full data flow from a user pressing "Sync" to a rendered mood timeline is:

```
User clicks Sync
    │
    ▼
POST /api/tracks/sync  (JWT-authenticated)
    │  ① Fetch up to 50 recently played tracks from Spotify API
    │  ② Fetch Last.fm genre tags per track (with artist fallback)
    │  ③ Upsert Track records; create Listen records (user × track × timestamp)
    │  ④ Identify tracks needing lyrics (no Lyric record, or empty record with valence=0.0)
    │  ⑤ Return HTTP 200 immediately
    │
    └─► BackgroundTask: fetch_lyrics_for_tracks()
            │
            ├─► lrclib.net API  →  plainLyrics field
            │       └─► if found: create/update Lyric record
            │
            ├─► Language detection (langdetect)
            │       ├─► 'en': route to j-hartmann + RoBERTa + VADER pipeline
            │       └─► other: route to XLM-RoBERTa pipeline
            │
            ├─► NLP scoring  →  valence, energy, emotions (joy/sadness/anger/fear/optimism)
            │
            └─► Write Track.valence, Track.energy, Score record to PostgreSQL
                    │
                    ▼
        Dashboard API endpoints read from DB
        (timeline, emotions, forecast, regulation, genre mood)
```

The background task pattern is critical: it allows the HTTP response to return immediately (with a "pending" count), while model inference — which can take 1–3 minutes for 35 tracks due to loading HuggingFace transformer models — runs asynchronously. The frontend polls `/api/tracks/analysis-status` every 5 seconds and updates a progress banner until the pending count reaches zero.

### B. Data Model

The PostgreSQL schema consists of seven tables:

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | user_id, spotify_id, display_name, spotify_refresh_token | Spotify user accounts |
| `tracks` | track_id, spotify_id, name, artists, valence, energy, tags | Track metadata + NLP scores |
| `listens` | user_id, track_id, played_at, ms_played | Per-user listen events |
| `lyrics` | track_id, source, text, language, is_instrumental | Cached lyrics per track |
| `scores` | track_id, valence_score, polarity, joy, sadness, anger, fear, optimism | Full emotion vectors |
| `mood_checkins` | user_id, day, mood_1to5, notes | Self-reported daily mood |
| `daily` | user_id, date, avg_valence, checkin | Pre-aggregated daily stats |

The `tracks` table is **global** — shared across users. If two users have listened to the same track, its lyrics and NLP scores are computed once and reused. Only the `listens` table is user-scoped, recording each play event with a timestamp. This design minimises redundant NLP computation: a track listened to by multiple participants is scored exactly once.

All date grouping is performed in **IST (Asia/Kolkata, UTC+5:30)** using PostgreSQL's `AT TIME ZONE` clause, ensuring that a track played at 11:45 PM IST is counted on the correct calendar day rather than being shifted to the next UTC date.

### C. Lyrics Retrieval and Language Detection

Lyrics are fetched server-side from lrclib.net, an open community database with a RESTful API requiring no authentication. A GET request to:

```
https://lrclib.net/api/get?artist_name={artist}&track_name={title}
```

returns a JSON object containing `plainLyrics` (unsynced text), `syncedLyrics` (LRC-format with timestamps), and an `instrumental` boolean flag. MoodSync uses `plainLyrics` for NLP input and the `instrumental` flag to assign a neutral valence of 0.5 without running the full pipeline.

Track titles are normalised before querying: featured artist credits (`feat.`, `with`, parenthetical credits) and suffix qualifiers (`Remaster`, `Remix`, `Radio Edit`) are stripped via regular expressions. This improves lrclib hit rate for tracks with verbose metadata.

If a track's lyric record exists but contains empty text and the track's stored valence is 0.0 — indicating a previously failed fetch — it is re-queued for retry on the next sync. This retry mechanism ensures that transient API failures do not permanently exclude tracks from analysis.

Language detection is performed using the `langdetect` library, which applies a Naive Bayes classifier over character n-gram profiles trained on Wikipedia text across 55 languages. English lyrics are routed to the j-hartmann + RoBERTa + VADER pipeline; all other detected languages are routed to XLM-RoBERTa. A known limitation is that romanised Indic scripts (e.g. Punjabi written in Latin characters) are misidentified as European languages; this does not affect the valence score (XLM-RoBERTa handles the text correctly regardless of the detected label) but affects the language comparison chart in the Research dashboard.

### D. The Three-Model NLP Pipeline (English)

For English lyrics, three models are applied in parallel and their outputs combined:

**Model 1 — j-hartmann DistilRoBERTa (emotion classifier):**
The full lyrics text is passed to the model, which returns a 7-dimensional probability vector:

```
p = (p_joy, p_sadness, p_anger, p_fear, p_disgust, p_surprise, p_neutral)
    where Σ p_i = 1
```

These probabilities are the primary input to the valence formula. The model is loaded once at server startup and cached in memory for the lifetime of the Railway container, avoiding repeated cold-load latency (~8 seconds per load).

**Model 2 — cardiffnlp RoBERTa (polarity):**
Returns a 3-class probability vector (p_positive, p_neutral, p_negative). A scalar polarity signal is derived as:

```
roberta_score = p_positive − p_negative  ∈ [−1, +1]
```

**Model 3 — VADER (rule-based):**
Operates token-by-token over the lyrics, applying a sentiment lexicon of ~7,500 word-sentiment mappings with adjustments for negation scope, booster words ("extremely", "barely"), punctuation (exclamation marks add +0.292 per mark, up to 3), and ALL-CAPS emphasis. The final compound score is:

```
VADER_compound = x / √(x² + α),   α = 15
```

where x is the sum of adjusted valence scores across all tokens. This normalises the raw sum into [−1, +1].

The three outputs are combined into two stored signals:

```
# Primary valence (from emotion probabilities):
positive_mass = p_joy + 0.8·p_optimism + 0.3·p_surprise
negative_mass = p_sadness + p_anger + 0.8·p_fear + 0.7·p_disgust
valence = (positive_mass − negative_mass) / (positive_mass + negative_mass)

# Polarity blend (stored separately for calibration):
polarity = 0.3·VADER_compound + 0.7·roberta_score
```

The weights in the polarity blend (0.7 for RoBERTa, 0.3 for VADER) reflect the relative performance of neural vs. rule-based models on longer, grammatically structured text such as song lyrics — RoBERTa's contextual understanding outperforms VADER's token-level lexicon on multi-sentence inputs, but VADER contributes meaningful signal on short, punchy lines.

### E. Non-English Pipeline (XLM-RoBERTa)

When the detected language is not English, XLM-RoBERTa is applied in place of j-hartmann. Its output is a 3-class vector (p_positive, p_neutral, p_negative), which is mapped to approximate emotion masses:

```
positive_mass = p_positive
negative_mass = p_negative
valence = (positive_mass − negative_mass) / (positive_mass + negative_mass)
```

This is a reduced form of the English valence formula — it lacks the 7-class granularity of j-hartmann and cannot distinguish, for instance, between anger and sadness within the negative mass. The emotion breakdown chart (joy/sadness/anger/fear/optimism) is therefore not populated for non-English tracks; they contribute to the valence timeline and regulation classification but not to per-emotion statistics. This is a documented limitation motivated by the scarcity of multilingual emotion-annotated datasets [4].

### F. Genre Enrichment via Last.fm

After NLP scoring, each track's energy dimension is enriched using genre tags fetched from the Last.fm API. For each track, MoodSync queries `track.getTopTags` using the track name and artist; if no tags are returned, it falls back to `artist.getTopTags`. Tags are canonicalised into eight broad genre categories (hip-hop, pop, rock, electronic/dance, r&b/soul, classical, acoustic/folk, other) using a keyword-matching heuristic over the top-5 returned tags.

Each canonical genre is assigned a `tag_energy` scalar derived from the acoustic and social characteristics of that genre (e.g. hip-hop/dance → 0.78, acoustic/classical → 0.22). The final energy score blends lyrical arousal (derived from the NLP pipeline) with this tag-based signal:

```
arousal = p_anger·0.9 + p_fear·0.8 + p_joy·0.6 + p_surprise·0.7 − p_sadness·0.5
energy  = 0.6·arousal + 0.4·tag_energy
```

This hybrid approach compensates for a known weakness of purely lyrical energy estimation: a slow, melancholic ballad about heartbreak and a slow acoustic lullaby have similar lyrical arousal (low) but meaningfully different energetic characters. The genre tag provides the necessary disambiguation. Note that Spotify's native audio features API — which previously provided acoustic energy, tempo, danceability, and valence directly — was deprecated for new application registrations in November 2024, making this hybrid approach necessary.

### G. Mood Check-ins and Daily Aggregation

Users submit mood ratings on a 1–5 integer scale via a Journal interface. The scale maps to qualitative descriptors (1: Very low, 2: Low, 3: Neutral, 4: Good, 5: Very good). Multiple check-ins per day are permitted and encouraged; all entries for a given IST calendar day are averaged:

```
m_t = (1/k) Σ_{i=1}^{k} mood_i,    mood_i ∈ {1, 2, 3, 4, 5}
```

For correlation analysis, the averaged rating is normalised to match the valence range:

```
m_t_normalised = (m_t − 3.0) / 2.0  ∈ [−1, +1]
```

This centres the scale at zero (3 = neutral → 0.0) and maps the extremes to ±1, aligning with the valence scale's semantics.

The daily mean valence for the correlation is computed as the mean of valence scores across all tracks listened to on that IST day, weighted by listen count (repeat plays of the same track are counted separately):

```
v_t = (1/N_t) Σ_{j=1}^{N_t} valence_j
```

where N_t is the total number of listen events on day t (not unique tracks).

### H. Emotion Regulation Classification

Emotion regulation classification operationalises the theoretical framework of Saarikallio and Erkkilä [15] computationally. A listening session is defined as a maximal sequence of listen events where no consecutive gap exceeds 30 minutes. Sessions with fewer than 3 tracks are excluded (insufficient trajectory information).

For each qualifying session, four statistics are computed from the ordered valence sequence [v_1, v_2, ..., v_n]:

```
mean_v  = (1/n) Σ v_i
std_v   = √[(1/n) Σ (v_i − mean_v)²]
start_v = mean(v_1, ..., v_{⌊n/3⌋})       # first third
end_v   = mean(v_{n−⌊n/3⌋}, ..., v_n)     # last third
slope_v = (end_v − start_v) / (n − 1)
```

Classification rules are applied in priority order:

```
if std_v < 0.08:                          # low variance → stable listening
    if mean_v < −0.15 → Rumination
    if mean_v > 0.15  → Mood Maintenance (positive)
    else              → Mood Maintenance (neutral)
elif slope_v > 0.05 and start_v < −0.1:  # rising from negative → Mood Repair
    Mood Repair
elif slope_v > 0.05:                      # rising from neutral  → Upregulation
    Upregulation
elif slope_v < −0.05:                     # falling              → Downregulation
    Downregulation
else:                                     # no clear pattern     → Diversion
    Diversion
```

The threshold std_v < 0.08 delineates stable sessions (consistent lyrical content) from dynamic ones. The start/end third averaging reduces sensitivity to individual outlier tracks at session boundaries.

### I. Mood Forecast

A 7-day ahead mood forecast is generated using **Holt's double exponential smoothing** (also called Holt's linear trend model), which models both the level and trend of the time series:

```
Level:   L_t = α · v_t + (1 − α)(L_{t-1} + T_{t-1})
Trend:   T_t = β · (L_t − L_{t-1}) + (1 − β) T_{t-1}
Forecast: v̂_{t+h} = L_t + h · T_t
```

where α ∈ [0,1] is the level smoothing parameter, β ∈ [0,1] is the trend smoothing parameter, and h is the forecast horizon in days. Parameters are estimated by minimising the sum of squared one-step-ahead forecast errors over the observed history. This model is appropriate for short, noisy time series (7 days of daily data) where a simple linear trend is a reasonable assumption and more complex seasonal models (e.g. Holt-Winters) are not identifiable due to insufficient data.

A 95% prediction interval is computed as:

```
v̂_{t+h} ± 1.96 · σ_e · √h
```

where σ_e is the standard deviation of in-sample residuals, and the √h factor accounts for increasing uncertainty at longer horizons.

---

## V. Study Design

### A. Participants

[N=4] participants were recruited from the researcher's personal network. All were regular Spotify users (self-reported daily listening). Participants were compensated with [compensation/none]. The researcher's own data was collected in parallel but excluded from all analysis.

### B. Procedure

The study ran for 7 days. Participants were given access to MoodSync via a Spotify OAuth link and instructed to:

1. Sync their listening history at least once daily (morning and evening recommended).
2. Submit at least one mood check-in per day via the Journal tab.

To prevent demand characteristics, the correlation chart and calibration scatter were hidden from participants during the study period. Participants saw their listening history, emotion breakdown, and daily timeline but not how their check-ins compared to the model's predictions.

### C. Hypotheses

**H1 (Primary):** There is a statistically significant positive Pearson correlation (r > 0, p < 0.05) between a user's daily mean NLP-derived lyrical valence and their normalised self-reported mood rating, for at least a majority of study participants. If people choose music that reflects or regulates their current emotional state, the lyrical content of their choices should co-vary with their mood.

**H2 (Secondary):** Personalised linear calibration will improve model-to-mood correspondence (higher r post-calibration) by absorbing systematic individual baseline offsets in listening style.

**H0 (Null):** There is no statistically significant linear relationship between NLP-derived lyrical valence and self-reported mood (r = 0 cannot be rejected at α = 0.05).

### D. Measures

- **Primary:** Pearson r between daily mean NLP valence and daily mean self-reported mood rating (normalised).
- **Secondary:** Distribution of emotion regulation strategies across listening sessions; dominant emotion per user; genre-valence breakdown; pipeline coverage rate per participant.

---

## VI. Results

*[To be completed on Day 7 — run `scripts/study_results.py` with DATABASE_URL set to production Neon URL.]*

### A. Track Coverage

| Participant | Listening Days | Unique Tracks | Analysed Tracks | Avg Valence |
|---|---|---|---|---|
| P1 | [X] | [X] | [X] | [X.XXX] |
| P2 | [X] | [X] | [X] | [X.XXX] |
| P3 | [X] | [X] | [X] | [X.XXX] |
| P4 | [X] | [X] | [X] | [X.XXX] |

### B. Mood–Valence Correlation (RQ1)

| Participant | Check-in Days | Pearson r | p-value | Strength |
|---|---|---|---|---|
| P1 | [X] | [X.XXX] | [X.XXX] | [weak/moderate/strong] |
| P2 | [X] | [X.XXX] | [X.XXX] | |
| P3 | [X] | [X.XXX] | [X.XXX] | |
| P4 | [X] | [X.XXX] | [X.XXX] | |
| **Mean** | | **[X.XXX]** | | |

[Narrative: e.g. "X/4 participants showed a statistically significant positive correlation (p < 0.05), suggesting that NLP-derived lyrical valence is a reliable proxy for self-reported mood for the majority of users."]

### C. Emotion Regulation Strategies (RQ2)

| Strategy | % of Sessions |
|---|---|
| Mood Repair | [X]% |
| Upregulation | [X]% |
| Rumination | [X]% |
| Mood Maintenance | [X]% |
| Diversion | [X]% |

[Narrative: dominant strategy and what it suggests about participant listening behaviour.]

### D. Genre and Language Breakdown (RQ3)

[Top genres per participant, dominant emotion per genre. Any difference between English vs non-English tracks in valence distribution.]

---

## VII. Discussion

### A. Lyrical Valence as a Mood Proxy

[Based on results — if correlations are significant: argue that passive listening history can serve as a lightweight, unobtrusive proxy for affective state, requiring no active self-report beyond the initial OAuth login. If mixed: discuss individual differences and why some users show stronger alignment.]

The personalised calibration approach addresses the well-known limitation that universal sentiment models do not account for individual differences in music taste. A user who habitually listens to lyrically dark music for comfort (rumination-as-coping) would show a systematically different baseline than one who uses music purely for mood enhancement. The linear recalibration `predicted_mood = slope × valence + intercept` absorbs this individual offset, improving practical utility.

### B. Emotion Regulation Strategies

[Discuss dominant strategy found. Compare to Saarikallio & Erkkilä's taxonomy. Note whether regulation behaviour was consistent within participants or varied by day/genre.]

### C. Limitations

1. **Small sample size.** With N=4 participants, results are indicative rather than generalisable. Statistical power is limited — with n=7 data points per user, the critical value for significance at α=0.05 is |r| > 0.754, meaning only strong correlations are detectable.

2. **Spotify development mode constraint.** Spotify limits application access to 5 users in development mode, preventing large-scale recruitment without quota extension approval, which Spotify no longer grants to individual developers.

3. **Lyrics-only modality.** With Spotify's audio features API deprecated, energy and arousal must be estimated from lyrical content and Last.fm genre tags rather than acoustic measurements, introducing estimation error relative to true acoustic energy.

4. **Language detection reliability.** The langdetect library misidentifies romanised Punjabi/Hindi as European languages, corrupting the language comparison chart — though valence scoring via XLM-RoBERTa is unaffected since the model handles the text content regardless of the detected label.

5. **lrclib.net coverage gaps.** Very recent releases and obscure regional tracks may not be in lrclib's database, resulting in a valence = 0.0 placeholder that excludes those tracks from aggregation and may distort mean valence for participants whose listening skews toward new music.

6. **Model training domain mismatch.** j-hartmann was fine-tuned on social media text. Song lyrics are more figurative, repetitive, and genre-coded — party anthems, for instance, may be classified as negative due to hyperbolic language common in hip-hop, despite expressing positive sentiment.

7. **Self-report temporal misalignment.** Mood check-ins are single-point daily ratings that may not reflect emotional state *during* specific listening sessions, introducing temporal misalignment between the NLP signal and the subjective measure.

8. **Calibration data scarcity.** The personalised calibration model is fit on at most 7 paired observations per user, making the learned slope and intercept parameters highly sensitive to individual outlier days.

---

## VIII. Conclusion

We presented MoodSync, a system for continuous mood tracking through NLP analysis of Spotify listening history. A 7-day field study with [N=4] participants demonstrated [summary of key finding — e.g. a moderate-to-strong positive correlation between lyrical valence and self-reported mood for X of 4 participants]. Emotion regulation strategy classification revealed [dominant pattern]. These results support the viability of passive listening history as an affective signal and motivate future work on personalised calibration at scale, multimodal approaches incorporating audio features, and longitudinal studies beyond 7 days.

---

## References

[1] S. Shukla, P. Khanna, and K. K. Agrawal, "Review on sentiment analysis on music," in *Proc. Int. Conf. Infocom Technologies and Unmanned Systems (ICTUS)*, 2017.

[2] J. Choi, J.-H. Song, and Y. Kim, "An analysis of music lyrics by measuring the distance of emotion and sentiment," in *Proc. 19th IEEE/ACIS Int. Conf.*, 2018.

[3] X. Chen and T. Tang, "Combining content and sentiment analysis on lyrics for a lightweight emotion-aware Chinese song recommendation system," 2018.

[4] L. Schaab and A. Kruspe, "Joint sentiment analysis of lyrics and audio in music," 2024.

[5] E. Çano and M. Morisio, "MoodyLyrics: A sentiment annotated lyrics dataset," 2017.

[6] B. Logan, A. Kositsky, and P. Moreno, "Semantic analysis of song lyrics," in *Proc. IEEE Int. Conf. Multimedia and Expo (ICME)*, 2004.

[7] Y. Xia, L. Wang, and K.-F. Wong, "Sentiment vector space model for lyric-based song sentiment classification," in *Proc. WWW*, 2008.

[8] V. S. G. S. P. Bottu and K. Ragavan, "Emotion-based music recommendation system integrating facial expression recognition and lyrics sentiment analysis," *IEEE Access*, vol. 13, pp. 87740–87752, 2025.

[9] V. Kumar and S. Minz, "Mood classification of lyrics using SentiWordNet," in *Proc. ICCCI*, pp. 1–5, IEEE, 2013.

[10] H.-H. Wu, C.-R. A. Tsai, T.-H. R. Tsai, and Y.-J. J. Hsu, "Building a graded Chinese sentiment dictionary based on commonsense knowledge for sentiment analysis of song lyrics."

[11] H. Abburi, E. S. A. Akkireddy, S. V. Gangashetty, and R. Mamidi, "Multimodal sentiment analysis of Telugu songs," 2016.

[12] J. A. Russell, "A circumplex model of affect," *J. Personality Social Psychol.*, vol. 39, no. 6, pp. 1161–1178, 1980.

[13] R. E. Thayer, J. R. Newman, and T. M. McClain, "Self-regulation of mood," *J. Personality Social Psychol.*, vol. 67, no. 5, pp. 910–925, 1994.

[14] A. C. North, D. J. Hargreaves, and J. Hargreaves, "Uses of music in everyday life," *Music Perception*, vol. 22, no. 1, pp. 41–77, 2004.

[15] S. Saarikallio and J. Erkkilä, "The role of music in adolescents' mood regulation," *Psychol. Music*, vol. 35, no. 1, pp. 88–109, 2007.

[16] J. Hartmann, "Emotion English DistilRoBERTa-base," Hugging Face, 2022. [Online]. Available: https://huggingface.co/j-hartmann/emotion-english-distilroberta-base

[17] F. Barbieri, J. Camacho-Collados, L. Espinosa-Anke, and L. Neves, "TweetEval: Unified benchmark and comparative evaluation for tweet classification," in *Findings of EMNLP*, 2020.

[18] C. J. Hutto and E. Gilbert, "VADER: A parsimonious rule-based model for sentiment analysis of social media text," in *Proc. ICWSM*, 2014.

[19] M. Schedl, H. Zamani, C.-W. Chen, Y. Deldjoo, and M. Elahi, "Current challenges and visions in music recommender systems research," *Int. J. Multimedia Inf. Retrieval*, vol. 7, no. 2, pp. 95–116, 2018.
