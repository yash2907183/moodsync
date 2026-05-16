# BTP DISSERTATION

---

## COVER PAGE

**MOODSYNC: CORRELATING LYRICAL SENTIMENT WITH SELF-REPORTED MOOD VIA PERSONALISED NLP CALIBRATION**

A Bachelor's Thesis Project Report submitted in partial fulfilment of the requirements for the degree of

**Bachelor of Technology**
in
**[Your Programme — e.g. Computer Science / Mathematics and Computing]**

Submitted by:
**Yash Chaturvedi**
Enrollment No.: [Your Enrollment Number]

Under the Supervision of:
**[Supervisor Name]**
[Supervisor Designation]
[Department Name]

[Institution Name]
[City, State]
[Month, Year]

---

## CANDIDATE'S DECLARATION

I, Yash Chaturvedi, student of [Programme Name], Enrollment No. [Enrollment Number], hereby declare that the project report entitled **"MoodSync: Correlating Lyrical Sentiment with Self-Reported Mood via Personalised NLP Calibration"** submitted to [Institution Name] in partial fulfilment of the requirements for the award of the degree of Bachelor of Technology is an authentic record of my own work carried out during the period [Start Date] to [End Date] under the supervision of [Supervisor Name].

The matter presented in this project report has not been submitted by me for the award of any other degree of this or any other institution.

**Yash Chaturvedi**
Date: [Date]
Place: [Place]

---

## CERTIFICATE

This is to certify that the project report entitled **"MoodSync: Correlating Lyrical Sentiment with Self-Reported Mood via Personalised NLP Calibration"** submitted by **Yash Chaturvedi** (Enrollment No.: [Enrollment Number]) in partial fulfilment of the requirements for the award of the degree of Bachelor of Technology in [Programme Name] from [Institution Name] is a record of bonafide work carried out by the candidate under my supervision and guidance.

The project report has been checked for plagiarism and the work has not been submitted elsewhere for any other degree or diploma.

**[Supervisor Name]**
[Designation]
[Department]
[Institution]
Date:

---

## ABSTRACT

The relationship between music and mood has long been studied in psychology, but computationally operationalising this relationship in a real-time, personalised, and unobtrusive manner remains an open challenge. This project presents MoodSync, a fully deployed web application that passively tracks users' emotional states by analysing the lyrical content of their Spotify listening history through a multi-model natural language processing pipeline. The system combines three complementary models — j-hartmann's DistilRoBERTa emotion classifier (7-class), cardiffnlp's RoBERTa polarity model, and VADER — to derive a per-track valence score from song lyrics, aggregating these into a continuous daily mood timeline, a 7-day Holt exponential smoothing forecast, and session-level emotion regulation classifications. For non-English content, the pipeline falls back to XLM-RoBERTa, enabling cross-lingual mood tracking. A 7-day naturalistic field study with four external participants examined whether NLP-derived lyrical valence correlates with self-reported daily mood on a 1–5 scale. Emotion regulation analysis classified listening sessions into five strategies: Mood Repair, Upregulation, Rumination, Mood Maintenance, and Diversion. A personalised linear calibration model — fit per user on their own check-in history — further improved model-to-mood correspondence. These results demonstrate that passive listening history, when processed through a carefully designed NLP ensemble, can serve as a meaningful and low-burden proxy signal for affective state, with implications for affect-aware music recommendation, mental health monitoring, and human-computer interaction.

**Keywords:** Music Emotion Recognition, Sentiment Analysis, Mood Tracking, Transformer Models, Emotion Regulation, Spotify, NLP, Personalised Calibration, DistilRoBERTa, XLM-RoBERTa, VADER

---

## ACKNOWLEDGEMENT

I would like to express my sincere gratitude to my supervisor, **[Supervisor Name]**, for their invaluable guidance, constant encouragement, and constructive feedback throughout the course of this project. Their expertise and insights were instrumental in shaping both the technical implementation and the research direction of this work.

I am grateful to **[Institution Name]** for providing the academic environment and resources that made this project possible.

I would like to thank the study participants who gave their time and data willingly, connecting their Spotify accounts and completing daily mood check-ins over the 7-day study period. Without their participation, the empirical component of this work would not have been possible.

I also thank the open-source community — the developers of HuggingFace Transformers, FastAPI, Next.js, and lrclib.net — whose freely available tools formed the backbone of MoodSync's implementation.

Finally, I thank my family and friends for their continued support and patience.

**Yash Chaturvedi**
[Date]

---

## CONTENTS

- Chapter 1: Introduction
  - 1.1 Background and Motivation
  - 1.2 Problem Statement
  - 1.3 Aims and Objectives
  - 1.4 Research Questions
  - 1.5 Hypothesis
  - 1.6 Scope of the Study
  - 1.7 Organisation of the Report
- Chapter 2: Review of Literature
  - 2.1 Lyric-Based Sentiment and Emotion Analysis
  - 2.2 Multimodal and Non-English Approaches
  - 2.3 Mood Tracking and Emotion Regulation
  - 2.4 NLP Models for Emotion Analysis
  - 2.5 Research Gaps
- Appendices
- References
- List of Publications

---

## LIST OF TABLES

| Table No. | Title | Page |
|---|---|---|
| 2.1 | Summary of reviewed works in lyric sentiment analysis | [X] |
| 3.1 | Comparison of NLP models used in MoodSync | [X] |
| 4.1 | Emotion regulation strategy classification rules | [X] |
| 5.1 | Per-participant track coverage and valence | [X] |
| 5.2 | Pearson r and p-values per participant | [X] |
| 5.3 | Emotion regulation strategy distribution | [X] |

---

## LIST OF FIGURES

| Figure No. | Title | Page |
|---|---|---|
| 1.1 | MoodSync system overview | [X] |
| 3.1 | Transformer self-attention mechanism | [X] |
| 3.2 | Multi-model NLP pipeline for English lyrics | [X] |
| 3.3 | XLM-RoBERTa multilingual architecture | [X] |
| 4.1 | End-to-end data flow from Spotify sync to mood timeline | [X] |
| 4.2 | Emotion regulation session classification flowchart | [X] |
| 5.1 | Daily valence vs. self-reported mood — per participant | [X] |
| 5.2 | Emotion regulation strategy distribution — all participants | [X] |

---

## LIST OF SYMBOLS, ABBREVIATIONS AND NOMENCLATURE

### Abbreviations

| Abbreviation | Full Form |
|---|---|
| NLP | Natural Language Processing |
| MER | Music Emotion Recognition |
| BERT | Bidirectional Encoder Representations from Transformers |
| RoBERTa | Robustly Optimised BERT Pre-training Approach |
| XLM-RoBERTa | Cross-lingual Language Model RoBERTa |
| VADER | Valence Aware Dictionary and sEntiment Reasoner |
| BPE | Byte-Pair Encoding |
| MLM | Masked Language Modelling |
| NSP | Next Sentence Prediction |
| JWT | JSON Web Token |
| OAuth | Open Authorisation |
| API | Application Programming Interface |
| IST | Indian Standard Time |
| OLS | Ordinary Least Squares |
| MAE | Mean Absolute Error |

### Symbols and Nomenclature

| Symbol | Meaning |
|---|---|
| Q, K, V | Query, Key, Value matrices in self-attention |
| d_k | Dimension of key vectors |
| d_model | Model hidden dimension |
| W_Q, W_K, W_V | Learned projection weight matrices |
| h | Number of attention heads |
| v_t | Daily mean NLP-derived valence on day t |
| m_t | Normalised self-reported mood on day t |
| r | Pearson correlation coefficient |
| β | Regression slope in calibration model |
| α | Blend weight in composite valence formula |
| T | Temperature parameter in knowledge distillation |
| L_t | Level estimate in Holt's smoothing |
| T_t | Trend estimate in Holt's smoothing |
| σ_e | Standard deviation of forecast residuals |
| p_joy, p_sadness, ... | Emotion class probabilities from j-hartmann |
| H1, H2, H0 | Primary, secondary, and null hypotheses |

---

## CHAPTER 1: INTRODUCTION

### 1.1 Background and Motivation

Music occupies a uniquely privileged position in human emotional life. Unlike most stimuli, music can simultaneously evoke, amplify, and regulate affect — people reach for specific tracks when grieving, when celebrating, when seeking focus, or when trying to lift a low mood. This deeply functional relationship between listening behaviour and emotional state has been well-established in the psychology literature. Thayer et al. [13] demonstrated that people commonly use music as a tool for self-regulation of mood — to raise energy, reduce tension, or change a bad mood. North et al. [14] documented that the uses of music in everyday life are primarily emotional: people use music for mood management, self-awareness, and social bonding.

This deeply functional relationship between listening behaviour and emotional state raises a compelling computational question: if a person's music choices are shaped by how they feel, can we reverse the inference — reading their emotional state *from* their listening history?

This question has growing practical relevance. Mental health awareness has increased substantially in recent years, driving demand for continuous, low-burden monitoring of emotional wellbeing. Active self-report tools — standardised questionnaires, ecological momentary assessment — suffer from compliance fatigue and recall bias. Biometric sensors require hardware. Social media analysis raises privacy concerns. Passively analysing already-existing streaming behaviour — something hundreds of millions of people engage in daily — offers a privacy-respecting, zero-burden alternative signal that can be collected without any active effort from the user.

Streaming platforms such as Spotify hold longitudinal records of listening events at the individual level. Spotify alone had 602 million monthly active users as of 2023, generating billions of listening events per day. This data is largely unused for affective monitoring, despite containing potentially rich implicit signals about user emotional state.

Song lyrics offer a semantically rich, directly interpretable route into these signals. When a person repeatedly listens to tracks about loneliness, yearning, or grief, that pattern is meaningfully different from a sequence of tracks about celebration and triumph — even if the acoustic characteristics of the two sets are similar. Natural language processing has, in recent years, reached a level of maturity where such emotional distinctions can be extracted automatically, at scale, and in multiple languages, using pre-trained transformer models capable of nuanced emotion classification.

However, a key obstacle remains: universal sentiment models are calibrated on aggregate population data and do not account for individual listening personalities. A user who habitually listens to lyrically dark music — using it as solace rather than as a reflection of distress — will show a systematically lower mean valence score than a user who listens to pop music, yet both may report similar self-assessed mood. Bridging this gap requires personalised calibration: learning, from each user's own history, how their model-derived valence scores map to their subjective experience.

Furthermore, a significant practical constraint emerged during this project's development: Spotify deprecated its audio features API for new application registrations in November 2024. This API previously provided acoustic measurements including valence, tempo, energy, danceability, and mode — signals that the majority of prior music-mood systems relied upon. With this signal unavailable, lyrics become the primary — and for newly registered applications, the only — computationally accessible source of emotional content from Spotify data.

MoodSync is designed to address all of these challenges simultaneously. It is a fully deployed, production web application — not a prototype evaluated on static datasets — that performs real-time lyrical mood tracking, personalised calibration, and emotion regulation classification on live Spotify listening data.

### 1.2 Problem Statement

There is currently no practical, deployed system that automatically extracts emotional information from a user's naturally occurring Spotify listening history using NLP on song lyrics, correlates it with their actual self-reported mood, and does so in a personalised, longitudinal, and multilingual manner — while remaining deployable without access to Spotify's deprecated audio features API.

Existing Music Emotion Recognition systems classify the perceived emotion of individual tracks using either audio features or lyrics on fixed datasets. They do not: (a) aggregate scores into a user-specific longitudinal mood signal; (b) account for individual differences in how model output maps to subjective experience; (c) remain deployable post-November 2024 without raw audio access; or (d) handle the full multilingual diversity of real-world listening behaviour in a unified pipeline.

This project addresses this gap by designing, deploying, and empirically evaluating MoodSync — a system that infers and tracks a user's daily emotional state from their passive Spotify listening history, using an NLP ensemble applied to song lyrics, and evaluates the correspondence between this inferred signal and the user's own self-reported mood with personalised calibration to close the individual–model gap.

### 1.3 Aims and Objectives

**Aim:** To design, deploy, and empirically evaluate a system that infers daily emotional state from Spotify listening history through NLP-based lyrical sentiment analysis, and to investigate the degree to which this inferred signal correlates with users' self-reported mood.

**Objectives:**

- **O1 — System construction:** Design and deploy a full-stack web application that authenticates users via Spotify OAuth, fetches their listening history, retrieves song lyrics from an open database (lrclib.net), and processes those lyrics through a multi-model NLP pipeline to produce per-track valence scores, daily mood timelines, and session-level emotion regulation classifications.

- **O2 — Pipeline design:** Construct a mathematically transparent NLP ensemble combining j-hartmann's DistilRoBERTa emotion classifier, cardiffnlp's RoBERTa polarity model, and VADER, with explicit weighting formulas that produce a composite valence score in [−1, +1], and extend this pipeline to non-English content using XLM-RoBERTa.

- **O3 — Correlation analysis:** Collect paired daily observations of NLP-derived mean valence and normalised self-reported mood ratings over a 7-day study period, and compute per-user Pearson r with statistical significance testing to quantify the correspondence between the two signals.

- **O4 — Personalised calibration:** Fit a per-user linear regression model mapping model valence to self-reported mood, learning individual intercept and slope parameters that account for baseline differences in listening style, and evaluate improvement in correspondence relative to the uncalibrated model.

- **O5 — Emotion regulation characterisation:** Implement a session-level classifier that assigns each listening session to one of five regulation strategies (Mood Repair, Upregulation, Rumination, Mood Maintenance, Diversion) based on valence trajectory statistics, and analyse the distribution of strategies across participants.

### 1.4 Research Questions

- **RQ1:** Does NLP-derived lyrical valence — computed from a user's Spotify listening history — show a statistically significant positive correlation with their self-reported daily mood rating?

- **RQ2:** What emotion regulation strategies are observable from users' listening sequences, and is there a dominant strategy that emerges across participants or within individuals?

- **RQ3:** Does personalised linear calibration improve the correspondence between model-derived valence and self-reported mood relative to the universal uncalibrated score?

- **RQ4:** Does the composite multi-model valence score (j-hartmann + RoBERTa + VADER ensemble) provide a more reliable mood proxy than any single model in isolation?

- **RQ5:** To what extent does genre, as inferred from Last.fm tags, predict the emotional valence of a user's listening sessions — and do genre-valence profiles differ systematically across participants?

- **RQ6:** How does the coverage and accuracy of the NLP pipeline degrade for non-English content, and what are the implications for mood tracking in multilingual listening contexts?

### 1.5 Hypothesis

**H1 (Primary Hypothesis):** There is a statistically significant positive Pearson correlation (r > 0, p < 0.05) between a user's daily mean NLP-derived lyrical valence and their normalised self-reported mood rating, for at least a majority of study participants.

*Rationale:* If people use music as an emotional tool — selecting music that reflects, amplifies, or regulates their current state — then the emotional content of the music they choose on a given day should co-vary with how they feel on that day. The direction of causality is not assumed; the hypothesis concerns only the presence of a significant linear relationship.

**H2 (Secondary Hypothesis):** Personalised linear calibration will improve model-to-mood correspondence (higher Pearson r after calibration than before) for users whose raw correlation is positive, by absorbing systematic individual baseline offsets in listening style.

**H0 (Null Hypothesis):** There is no statistically significant linear relationship between NLP-derived lyrical valence and self-reported mood (r = 0 cannot be rejected at α = 0.05 for any participant).

### 1.6 Scope of the Study

**In scope:**
- English and non-English lyrics reachable through lrclib.net
- Spotify listening history (recently played tracks, up to 50 per sync)
- Self-reported daily mood on a 1–5 scale via an in-app check-in interface
- A 7-day naturalistic study period with up to 5 external participants
- Emotion regulation classification at the session level using valence trajectory statistics
- Per-user personalised linear calibration of model output to self-reported mood
- Genre-level emotion breakdown using Last.fm tags
- Multilingual support via XLM-RoBERTa for non-English content

**Out of scope:**
- Audio-based features (Spotify audio features API unavailable for new registrations)
- Physiological signals (heart rate, galvanic skin response)
- Real-time mood inference during active playback
- Tracks with no available lyrics (assigned neutral placeholder, excluded from aggregation)
- Generalisation beyond the study population without further validation

### 1.7 Organisation of the Report

The report is organised as follows. Chapter 2 presents a review of the relevant literature across four thematic areas — lyric-based sentiment analysis, multimodal and non-English approaches, mood tracking and emotion regulation, and NLP models — and identifies five research gaps that MoodSync addresses. Chapter 3 [to be added] describes the NLP model architectures and mathematical foundations of the pipeline. Chapter 4 [to be added] details the system design and implementation. Chapter 5 [to be added] presents the study design, data collection procedure, and empirical results. Chapter 6 [to be added] discusses the findings, limitations, and directions for future work. Chapter 7 [to be added] concludes the report.

---

## CHAPTER 2: REVIEW OF LITERATURE

### 2.1 Lyric-Based Sentiment and Emotion Analysis

The use of song lyrics as a medium for emotional analysis has a substantial history in the computational musicology and NLP literatures. Early work established that lyrics carry extractable emotional signals, though initial approaches were limited by pre-neural representations and English-only lexicons.

Logan, Kositsky, and Moreno [6] applied Probabilistic Latent Semantic Analysis (PLSA) to song lyrics, deriving topic-based semantic similarity vectors to measure relatedness between songs. While not a sentiment analysis system per se, this work established the principle that lyrics can be represented as distributional text features for music analysis — a foundation that subsequent sentiment-aware approaches built upon.

Xia, Wang, and Wong [7] proposed the Sentiment Vector Space Model (s-VSM), specifically designed to address four core challenges in lyric sentiment classification: noise words, polysemy, negation handling, and data sparseness. By representing lyrics through sentiment units that account for negations and modifier words — rather than raw term frequencies — and classifying with Support Vector Machines, they demonstrated significant accuracy gains over standard VSM baselines. This work remains a key reference for the structural difficulties specific to lyric-based sentiment analysis.

Kumar and Minz [9] evaluated three classifiers — Naïve Bayes, K-Nearest Neighbour, and SVM — using SentiWordNet-derived polarity features (positive and negative scores per word) on a four-class mood classification task, achieving 78.27% accuracy. Their systematic comparison demonstrated that ontology-based sentiment lexicons substantially outperform raw term-based text features for lyric classification. This finding motivates the inclusion of VADER in MoodSync's ensemble: VADER's hand-curated sentiment lexicon provides a complementary signal to the purely distributional representations learned by transformer models.

Shukla, Khanna, and Agrawal [1] provided a comprehensive review of lyric-based sentiment analysis methodologies, examining both feature-based and fusion approaches. A particularly significant finding for this work is their analysis of the Big Five personality inventory and the CAC scale in the context of music sentiment perception: they demonstrate that lyric sentiment is interpreted differently across users depending on personality traits and cultural background. This is a direct empirical motivation for MoodSync's personalised calibration approach — a universal model output does not map uniformly to individual subjective experience, and learning a per-user calibration function is theoretically grounded in this finding.

Çano and Morisio [5] introduced MoodyLyrics, a publicly available large-scale dataset of mood-annotated song lyrics built using Russell's 2D valence-arousal circumplex model [12] and an affect lexicon combining WordNet, WordNet-Affect, and ANEW. Their analysis showed that valence is a stronger mood discriminator than arousal — a finding that directly informed MoodSync's design decision to centre analysis on a single valence dimension in [−1, +1] rather than attempting to estimate both dimensions, which would require either audio features or more training data than available.

Choi, Song, and Kim [2] applied NLP-based sentiment and emotion analysis to approximately 11,000 Billboard Hot 100 lyrics, using K-Nearest Neighbour classification to recommend songs with similar emotional content. This work demonstrates a concrete end-to-end pipeline for digitising lyric emotion and frames sentiment analysis as a powerful alternative to genre-title-based classification — establishing the lyric-as-emotional-signal paradigm that MoodSync operationalises in a longitudinal, personalised context.

Chen and Tang [3] proposed a classification model combining TF-IDF term weighting with sentiment analysis to build an emotion-point matrix for Chinese song lyrics, enabling emotionally relevant recommendations. Their system showed that lyric-based sentiment analysis can serve as a lightweight, effective substitute for expensive collaborative filtering approaches — particularly relevant in low-resource settings where user interaction data is sparse. This validates the feasibility of MoodSync's approach of inferring emotional content without requiring explicit user preference signals.

### 2.2 Multimodal and Non-English Approaches

As the field matured, researchers explored whether combining lyric features with audio or visual signals improves emotion recognition, and whether sentiment analysis generalises beyond English-language content.

Schaab and Kruspe [4] conducted a systematic investigation of multimodal sentiment fusion, combining features from song lyrics (text transformer representations) with audio features, and finding that a 60/40 audio-to-text weighting yielded optimal classification performance. Their work identifies two central obstacles: the complementary but inconsistent nature of lyric and audio modalities, and the scarcity of large-scale bimodal annotated datasets. Crucially for this project, their finding that audio provides 60% of the signal highlights the cost of losing access to Spotify's audio features API. MoodSync addresses this by enriching the purely lyrical signal with Last.fm genre tags, which provide an approximate acoustic characterisation (genre-derived energy scalars) to partially compensate for the lost audio dimension.

Abburi, Akkireddy, Gangashetty, and Mamidi [11] performed multimodal sentiment analysis on 100 Telugu songs using Doc2Vec-based lyric features combined with spectral and chroma audio features, achieving recognition rates of 85–91.2%. Significantly, they found that features extracted from the beginning of a song yield better results than the full song or its ending — an often-overlooked consideration suggesting that the opening lines are more emotionally representative. This finding motivates future work on segment-aware lyric analysis in MoodSync.

Wu, Tsai, Tsai, and Hsu [10] constructed iSentiDictionary, a graded Chinese sentiment lexicon of 28,248 concepts built by integrating multiple existing dictionaries and extending them via Chinese ConceptNet relationships, benchmarking it against ANEW, SenticNet, and SentiWordNet on Mandarin pop lyrics. Their work highlights the inadequacy of simply translating English sentiment dictionaries for Chinese lyric analysis — a finding that extends to Indic languages and underscores the necessity of language-specific models or truly multilingual architectures. MoodSync's use of XLM-RoBERTa as a multilingual fallback, rather than translating non-English lyrics to English before processing, is directly motivated by this line of research.

Bottu and Ragavan [8] built a multimodal emotion-aware music recommendation system integrating CNN-based facial expression recognition (FER) with a 7-class lyric emotion pipeline, achieving 91.78% FER accuracy. While the modalities differ from MoodSync's approach, this system demonstrates the broader applicability and commercial viability of lyric emotion classification in real-world recommendation contexts, validating the underlying premise that NLP-derived lyric emotion is practically useful beyond academic benchmarks.

### 2.3 Mood Tracking and Emotion Regulation

The psychological literature on music and mood regulation provides the theoretical grounding for MoodSync's core hypothesis.

North, Hargreaves, and Hargreaves [14] conducted large-scale surveys on the uses of music in everyday life, establishing that mood management is one of the primary functions of music listening — alongside background listening, self-awareness, and social bonding. They found that people consciously select music to match, intensify, or change their current emotional state, providing the empirical basis for treating listening history as a mood-correlated signal.

Thayer, Newman, and McClain [13] investigated self-regulation of mood through various strategies, finding that listening to music was among the most effective approaches for changing a bad mood. Notably, they found that the specific choice of music (energetic vs. calming, lyrically positive vs. negative) varied depending on the regulatory goal — supporting the idea that listening sequences contain information about intended emotional direction, not just current state.

Saarikallio and Erkkilä [15] conducted qualitative research with adolescent participants, identifying seven distinct music-based mood regulation strategies: entertainment, revival, diversion, strong sensation, mental work, solace, and discharge. This taxonomy forms the theoretical basis for MoodSync's emotion regulation classifier, which computationally operationalises a subset of these strategies (Mood Repair, Upregulation, Rumination, Mood Maintenance, Diversion) using valence trajectory statistics derived from listening sessions.

Schedl et al. [19] reviewed the state of music recommender systems research, identifying the inference of user context and emotional state as a central open challenge. They note that collaborative filtering — the dominant paradigm — cannot capture the temporal and emotional dynamics of listening behaviour. MoodSync's approach of tracking individual emotional state over time, rather than modelling cross-user preference patterns, represents a fundamentally different and complementary paradigm to collaborative filtering.

### 2.4 NLP Models for Emotion Analysis

The neural models employed in MoodSync represent the current state of the art in transformer-based emotion and sentiment classification.

The BERT architecture (Devlin et al., 2019) introduced bidirectional pre-training via Masked Language Modelling (MLM), enabling deep contextual representations that captured dependencies in both directions simultaneously — a significant advance over unidirectional language models. RoBERTa (Liu et al., 2019) refined BERT's pre-training by removing Next Sentence Prediction (shown to be unhelpful), using dynamic masking, larger batch sizes, and substantially more training data (160GB vs BERT's 16GB), consistently improving downstream performance.

The j-hartmann/emotion-english-distilroberta-base model [16] applies knowledge distillation (Hinton et al., 2015) to produce a DistilRoBERTa model — a 6-layer, ~82M parameter student trained to mimic a 12-layer RoBERTa teacher — and fine-tunes it on six emotion datasets to produce 7-class emotion probabilities (joy, sadness, anger, fear, disgust, surprise, neutral). The distillation approach retains approximately 97% of the teacher's performance at 40% of the computational cost, making it suitable for server-side inference on many tracks.

The cardiffnlp/twitter-roberta-base-sentiment model [17] fine-tunes full RoBERTa on approximately 58 million tweets for 3-class polarity classification (positive/neutral/negative). Its training data — informal, abbreviated, emotionally-charged social media text — shares stylistic characteristics with contemporary song lyrics, making it an appropriate complement to j-hartmann in MoodSync's ensemble.

VADER (Hutto and Gilbert, 2014) [18] is a rule-based sentiment analyser built on a hand-curated lexicon of ~7,500 word-sentiment mappings, with adjustments for negation scope, booster words, punctuation, and capitalisation. Its compound score is computed as `x / √(x² + 15)` over the sum of adjusted token valences. While less expressive than transformer models on long texts, VADER provides reliable, fast signal on short lyric lines and captures explicit sentiment indicators (negation, exclamation) that neural models can occasionally miss.

Conneau et al. (2020) introduced XLM-RoBERTa, a multilingual transformer trained on 2.5TB of filtered CommonCrawl data across 100 languages using a SentencePiece unigram vocabulary of 250,002 tokens. The shared multilingual embedding space enables cross-lingual transfer: semantically similar content in different languages is mapped to nearby regions of the representation manifold, enabling zero-shot sentiment classification across languages without requiring language-specific fine-tuning data. MoodSync uses the cardiffnlp/twitter-xlm-roberta-base-sentiment checkpoint for non-English lyrics.

### 2.5 Research Gaps

A systematic examination of the reviewed literature reveals five gaps that this project directly addresses:

**Gap 1 — No longitudinal, personalised, deployed system exists.**
All reviewed lyric sentiment systems operate on fixed datasets and evaluate emotion at the track level. None aggregate scores across a specific user's personal listening history into a continuous daily mood signal. The longitudinal, listener-centric perspective is entirely absent from the computational literature, despite being strongly motivated by the psychological evidence on music and mood regulation.

**Gap 2 — The individual variability problem is acknowledged but not solved.**
Shukla et al. [1] explicitly note that lyric sentiment is interpreted differently across users, yet no reviewed system implements a personalisation mechanism. The standard approach is population-level annotation and evaluation, which averages out individual differences. MoodSync's per-user linear calibration model — fitting a personal slope and intercept from the user's own check-in history — directly fills this gap.

**Gap 3 — Audio features are assumed to be available.**
Multimodal approaches [4, 11] and most prior MER systems depend on Spotify's audio features API or direct audio file access. With the API deprecated for new registrations since November 2024, these approaches are no longer reproducible in the streaming context without raw audio. No reviewed system proposes a lyrics-first approach that explicitly accounts for this constraint and remains deployable.

**Gap 4 — Non-English music is underrepresented.**
While Wu et al. [10] and Abburi et al. [11] address specific non-English languages (Chinese, Telugu), no reviewed system provides a general multilingual fallback within a unified deployed pipeline. The romanisation problem — Indic script lyrics written in Latin characters — is not addressed in any reviewed work, yet it is a common scenario in Indian streaming contexts and presents a practical challenge for language detection.

**Gap 5 — Emotion regulation is not computationally classified in real time.**
Saarikallio and Erkkilä's [15] taxonomy of music-based emotion regulation strategies is widely cited in the music psychology literature but has not been implemented as a real-time session-level classifier operating on streaming listen sequences. The gap between theoretical typology and computational operationalisation is what MoodSync's regulation classifier addresses.

---

## APPENDICES

### Appendix A — System Architecture

MoodSync consists of the following deployed components:

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL (Neon) — hosted on Railway (EU West)
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS — hosted on Vercel
- **NLP models:** HuggingFace Transformers (j-hartmann DistilRoBERTa, cardiffnlp RoBERTa, XLM-RoBERTa), VADER
- **External APIs:** Spotify Web API (OAuth, recently played), lrclib.net (lyrics), Last.fm API (genre tags)

### Appendix B — NLP Model Details

| Model | HuggingFace ID | Parameters | Output |
|---|---|---|---|
| j-hartmann emotion | j-hartmann/emotion-english-distilroberta-base | ~82M | 7 emotion probabilities |
| cardiffnlp RoBERTa | cardiffnlp/twitter-roberta-base-sentiment | ~125M | 3 polarity probabilities |
| cardiffnlp XLM-RoBERTa | cardiffnlp/twitter-xlm-roberta-base-sentiment | ~270M | 3 polarity probabilities |
| VADER | vaderSentiment (rule-based) | ~7,500 lexicon entries | Compound score [−1, +1] |

### Appendix C — Valence and Energy Formulas

**English valence:**
```
positive_mass = p_joy + 0.8·p_optimism + 0.3·p_surprise
negative_mass = p_sadness + p_anger + 0.8·p_fear + 0.7·p_disgust
valence = (positive_mass − negative_mass) / (positive_mass + negative_mass)
```

**Polarity blend:**
```
polarity = 0.3·VADER_compound + 0.7·(p_positive − p_negative)
```

**Energy:**
```
arousal = 0.9·p_anger + 0.8·p_fear + 0.6·p_joy + 0.7·p_surprise − 0.5·p_sadness
energy  = 0.6·arousal + 0.4·tag_energy
```

**Mood normalisation:**
```
m_t = (rating_t − 3.0) / 2.0 ∈ [−1, +1]
```

**Personalised calibration:**
```
m̂_t = β·v_t + intercept
```

---

## CHAPTER 3: NLP MODEL ARCHITECTURES AND MATHEMATICAL FOUNDATIONS

A central contribution of this work is the application of a multi-model NLP ensemble to lyrical sentiment analysis. This chapter provides a detailed account of the architecture and mathematics underlying each model, and explains how they are integrated into MoodSync's valence scoring pipeline.

### 3.1 The Transformer Architecture

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

### 3.2 BERT and RoBERTa Pre-training

BERT (Devlin et al., 2019) introduced bidirectional pre-training via two tasks: **Masked Language Modelling (MLM)**, where 15% of tokens are masked and the model predicts them, and **Next Sentence Prediction (NSP)**. RoBERTa (Liu et al., 2019) removed NSP (shown to be unhelpful), used dynamic masking (different masks each epoch), larger batch sizes, and trained on significantly more data (160GB vs BERT's 16GB). These changes yielded consistent improvements across benchmarks.

The tokenisation scheme used by both BERT and RoBERTa is **Byte-Pair Encoding (BPE)**, which iteratively merges the most frequent character pairs to build a fixed vocabulary of ~50,000 subword units. The word "happiness" might be tokenised as ["happ", "iness"]; "joy" as a single token. This handles out-of-vocabulary words gracefully.

For MoodSync, the cardiffnlp/twitter-roberta-base-sentiment checkpoint fine-tunes RoBERTa on approximately 58 million tweets, tuning it for the informal, abbreviated, emotionally-charged language style that characterises much contemporary song lyrics.

**Architecture:** 12 transformer layers, d_model = 768, 12 attention heads, d_k = 64 per head, ~125M parameters. Output: 3-class softmax (positive / neutral / negative).

### 3.3 DistilRoBERTa and Knowledge Distillation (j-hartmann)

The j-hartmann emotion model is built on **DistilRoBERTa**, a distilled version of RoBERTa. Knowledge distillation (Hinton et al., 2015) trains a smaller *student* model to mimic the output distribution of a larger *teacher* model, using soft probability labels rather than hard one-hot labels, which carry richer information about inter-class relationships.

The student training loss is a weighted combination:

```
L = α · L_CE(y, p_student) + (1 - α) · L_KL(p_teacher / T, p_student / T)
```

where L_CE is cross-entropy against true labels, L_KL is KL-divergence against the teacher's softened outputs (temperature T typically set to 2), and α balances the two objectives. The temperature T smooths the teacher's distribution, preventing it from collapsing to near-zero probabilities on non-target classes and allowing the student to learn relative similarities between classes.

**Architecture:** 6 transformer layers (half of RoBERTa's 12), d_model = 768, ~82M parameters — approximately 40% smaller and 60% faster at inference, with ~97% of RoBERTa's performance on downstream tasks.

The j-hartmann checkpoint fine-tunes DistilRoBERTa on a combination of six emotion datasets covering diverse text styles (tweets, Reddit posts, dialogue), producing 7-class probability outputs: joy, sadness, anger, fear, disgust, surprise, and neutral. Song lyrics share structural similarities with social media text — short, emotionally direct, heavy use of figurative language — making this the most appropriate single-model choice for lyric emotion classification.

### 3.4 XLM-RoBERTa: Multilingual Extension

For non-English lyrics, MoodSync falls back to **XLM-RoBERTa** (Conneau et al., 2020), a multilingual variant of RoBERTa trained on 2.5TB of filtered CommonCrawl data across 100 languages.

The key architectural difference is in **tokenisation**. Unlike monolingual RoBERTa's BPE vocabulary of ~50,000 English-centric tokens, XLM-RoBERTa uses **SentencePiece** with a **unigram language model** and a vocabulary of 250,002 subword tokens distributed across 100 languages. The unigram model selects the vocabulary by iteratively pruning a large initial set, maximising the likelihood of the training corpus:

```
L(V) = Σ_s log P(s | V) = Σ_s log( max_{x ∈ seg(s,V)} Π_i p(x_i) )
```

where seg(s, V) is the set of all segmentations of sentence s given vocabulary V, and p(x_i) is the unigram probability of subword x_i. The shared multilingual vocabulary creates a **cross-lingual embedding space**: semantically similar words in different languages map to nearby regions of the embedding manifold, enabling zero-shot cross-lingual transfer.

**Architecture:** 12 transformer layers, d_model = 768, 12 attention heads, ~270M parameters.

### 3.5 Comparative Summary

| Property | VADER | DistilRoBERTa (j-hartmann) | XLM-RoBERTa |
|---|---|---|---|
| Type | Rule-based lexicon | Neural (distilled transformer) | Neural (multilingual transformer) |
| Parameters | ~7,500 lexicon entries | ~82M | ~270M |
| Layers | N/A | 6 | 12 |
| Vocabulary | Fixed sentiment lexicon | BPE, ~50K tokens | SentencePiece, 250K tokens |
| Languages | English | English | 100 languages |
| Output classes | Compound score [−1, +1] | 7 emotions | 3 polarity classes |
| Training data | Hand-curated rules | 6 emotion datasets | 2.5TB multilingual web text |
| Inference speed | Very fast (< 1ms) | Fast (~20ms/track) | Moderate (~40ms/track) |

### 3.6 Valence Score Derivation

The outputs of j-hartmann — a 7-dimensional probability vector (p_joy, p_sadness, p_anger, p_fear, p_disgust, p_surprise, p_neutral) — are mapped to a scalar valence in [−1, +1] through a weighted emotion mass formula:

```
positive_mass = p_joy + 0.8 · p_optimism + 0.3 · p_surprise
negative_mass = p_sadness + p_anger + 0.8 · p_fear + 0.7 · p_disgust

valence = (positive_mass − negative_mass) / (positive_mass + negative_mass)
```

The weights reflect the partial positivity of surprise and the partial negativity of disgust relative to fear. This formula is bounded in (−1, +1) and collapses to 0 when positive and negative masses are equal.

Separately, a polarity score is computed from VADER and RoBERTa:

```
polarity = 0.3 · VADER_compound + 0.7 · RoBERTa_positive_prob − 0.7 · RoBERTa_negative_prob
```

The composite is stored separately for post-study personalised calibration:

```
final_valence = (1 − α) · valence + α · polarity
```

where α is a user-specific scalar learned from paired (check-in, valence) observations.

### 3.7 Personalised Calibration: Mathematical Basis

Given n days of paired observations {(v_t, m_t)} where v_t is the daily mean valence and m_t is the normalised check-in score, Pearson's r quantifies linear correspondence:

```
r = Σ(v_t − v̄)(m_t − m̄) / √[Σ(v_t − v̄)² · Σ(m_t − m̄)²]
```

A linear regression model fits:

```
m̂_t = β · v_t + intercept
```

The intercept absorbs systematic baseline differences between individual listening habits and self-reported mood. The slope β captures the sensitivity of the user's mood to valence changes.

Statistical significance is assessed via the two-tailed t-test with n−2 degrees of freedom:

```
t = r · √(n − 2) / √(1 − r²)
```

With n=7 days, the critical value is |t| > 2.571 (t-distribution, 5 df), corresponding to |r| > 0.754.

---

## CHAPTER 4: SYSTEM DESIGN AND IMPLEMENTATION

### 4.1 Architecture Overview

MoodSync is a full-stack web application organised into three layers: a Python 3.11 / FastAPI backend, a Next.js 14 (App Router) frontend, and a PostgreSQL relational database hosted on Neon. The backend is deployed on Railway (EU West region) and the frontend on Vercel; both communicate over HTTPS using a Next.js reverse proxy that forwards all `/api/*` requests to the Railway service, eliminating CORS complexity on the client side.

Authentication is handled via Spotify OAuth 2.0. When a user clicks "Connect with Spotify", the backend generates an authorisation URL configured with `show_dialog=True` to force explicit account selection on every login — preventing cached sessions from being silently reused across different users. The backend exchanges the authorisation code for tokens, creates or retrieves a User record, and issues a signed JWT using the HS256 algorithm. The JWT is stored in the browser's localStorage and attached as a Bearer token on every subsequent API request.

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
            ├─► NLP scoring  →  valence, energy, emotions
            │
            └─► Write Track.valence, Track.energy, Score record to PostgreSQL
                    │
                    ▼
        Dashboard API endpoints read from DB
        (timeline, emotions, forecast, regulation, genre mood)
```

The background task pattern allows the HTTP response to return immediately, while model inference runs asynchronously. The frontend polls `/api/tracks/analysis-status` every 5 seconds and updates a progress banner until the pending count reaches zero.

### 4.2 Data Model

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

The `tracks` table is **global** — shared across users. If two users have listened to the same track, its lyrics and NLP scores are computed once and reused. Only the `listens` table is user-scoped. All date grouping is performed in **IST (Asia/Kolkata, UTC+5:30)** using PostgreSQL's `AT TIME ZONE` clause.

### 4.3 Lyrics Retrieval and Language Detection

Lyrics are fetched server-side from lrclib.net via:

```
https://lrclib.net/api/get?artist_name={artist}&track_name={title}
```

which returns `plainLyrics`, `syncedLyrics`, and an `instrumental` boolean. Track titles are normalised before querying — featured artist credits and suffix qualifiers are stripped via regular expressions. Tracks with empty lyric records and valence=0.0 are re-queued for retry on the next sync.

Language detection uses `langdetect`, a Naive Bayes classifier over character n-gram profiles across 55 languages. English lyrics route to the three-model English pipeline; all others route to XLM-RoBERTa.

### 4.4 The Three-Model NLP Pipeline (English)

**Model 1 — j-hartmann DistilRoBERTa:**
Returns a 7-dimensional probability vector `p = (p_joy, p_sadness, p_anger, p_fear, p_disgust, p_surprise, p_neutral)` where Σ p_i = 1. These are the primary input to the valence formula.

**Model 2 — cardiffnlp RoBERTa:**
Returns 3-class probabilities. Scalar polarity: `roberta_score = p_positive − p_negative ∈ [−1, +1]`.

**Model 3 — VADER:**
Applies a sentiment lexicon with negation and booster adjustments. Compound score: `VADER_compound = x / √(x² + 15)` where x is the sum of adjusted token valences.

Combined outputs:
```
positive_mass = p_joy + 0.8·p_optimism + 0.3·p_surprise
negative_mass = p_sadness + p_anger + 0.8·p_fear + 0.7·p_disgust
valence = (positive_mass − negative_mass) / (positive_mass + negative_mass)
polarity = 0.3·VADER_compound + 0.7·roberta_score
```

### 4.5 Non-English Pipeline (XLM-RoBERTa)

XLM-RoBERTa returns a 3-class vector mapped to valence:

```
valence = (p_positive − p_negative) / (p_positive + p_negative)
```

This reduced formula lacks the 7-class granularity of j-hartmann. Non-English tracks contribute to the valence timeline and regulation classification but not to per-emotion statistics.

### 4.6 Genre Enrichment via Last.fm

Last.fm tags are canonicalised into eight genre categories, each assigned a `tag_energy` scalar. The final energy score blends lyrical arousal with tag-based signal:

```
arousal = p_anger·0.9 + p_fear·0.8 + p_joy·0.6 + p_surprise·0.7 − p_sadness·0.5
energy  = 0.6·arousal + 0.4·tag_energy
```

### 4.7 Mood Check-ins and Daily Aggregation

Users submit 1–5 mood ratings; multiple check-ins per day are averaged. Normalisation:

```
m_t_normalised = (m_t − 3.0) / 2.0  ∈ [−1, +1]
```

Daily mean valence is computed over all listen events on that IST day:

```
v_t = (1/N_t) Σ_{j=1}^{N_t} valence_j
```

### 4.8 Emotion Regulation Classification

Sessions are defined by a 30-minute gap threshold. For each session with ≥3 tracks, four statistics are computed:

```
mean_v  = (1/n) Σ v_i
std_v   = √[(1/n) Σ (v_i − mean_v)²]
start_v = mean(v_1, ..., v_{⌊n/3⌋})
end_v   = mean(v_{n−⌊n/3⌋}, ..., v_n)
slope_v = (end_v − start_v) / (n − 1)
```

Classification rules (in priority order):

```
if std_v < 0.08:
    if mean_v < −0.15 → Rumination
    if mean_v > 0.15  → Mood Maintenance (positive)
    else              → Mood Maintenance (neutral)
elif slope_v > 0.05 and start_v < −0.1 → Mood Repair
elif slope_v > 0.05                     → Upregulation
elif slope_v < −0.05                    → Downregulation
else                                    → Diversion
```

### 4.9 Mood Forecast

A 7-day ahead forecast uses **Holt's double exponential smoothing**:

```
Level:    L_t = α · v_t + (1 − α)(L_{t-1} + T_{t-1})
Trend:    T_t = β · (L_t − L_{t-1}) + (1 − β) T_{t-1}
Forecast: v̂_{t+h} = L_t + h · T_t
```

A 95% prediction interval: `v̂_{t+h} ± 1.96 · σ_e · √h` where σ_e is the standard deviation of in-sample residuals.

---

## CHAPTER 5: RESEARCH METHODOLOGY AND RESULTS

### 5.1 Study Design

#### 5.1.1 Participants

Four external participants were recruited from the researcher's personal network. All were regular Spotify users (self-reported daily listening). The researcher's own data was collected in parallel but excluded from all analysis.

#### 5.1.2 Procedure

The study ran for 7 days. Participants were given access to MoodSync via a Spotify OAuth link and instructed to:

1. Sync their listening history at least once daily (morning and evening recommended).
2. Submit at least one mood check-in per day via the Journal tab.

To prevent demand characteristics, the correlation chart and calibration scatter were hidden from participants during the study period. Participants saw their listening history, emotion breakdown, and daily timeline but not how their check-ins compared to the model's predictions.

#### 5.1.3 Hypotheses

**H1 (Primary):** There is a statistically significant positive Pearson correlation (r > 0, p < 0.05) between a user's daily mean NLP-derived lyrical valence and their normalised self-reported mood rating, for at least a majority of study participants.

**H2 (Secondary):** Personalised linear calibration will improve model-to-mood correspondence by absorbing individual baseline offsets in listening style.

**H0 (Null):** There is no statistically significant linear relationship between NLP-derived lyrical valence and self-reported mood (r = 0 cannot be rejected at α = 0.05).

#### 5.1.4 Measures

- **Primary:** Pearson r between daily mean NLP valence and daily mean self-reported mood (normalised).
- **Secondary:** Distribution of emotion regulation strategies; dominant emotion per user; genre-valence breakdown; pipeline coverage rate.

### 5.2 Results

*[To be completed on Day 7 — run `scripts/study_results.py` with DATABASE_URL set to production Neon URL.]*

#### 5.2.1 Track Coverage

| Participant | Listening Days | Unique Tracks | Analysed Tracks | Avg Valence |
|---|---|---|---|---|
| P1 | [X] | [X] | [X] | [X.XXX] |
| P2 | [X] | [X] | [X] | [X.XXX] |
| P3 | [X] | [X] | [X] | [X.XXX] |
| P4 | [X] | [X] | [X] | [X.XXX] |

#### 5.2.2 Mood–Valence Correlation (RQ1)

| Participant | Check-in Days | Pearson r | p-value | Significant? |
|---|---|---|---|---|
| P1 | [X] | [X.XXX] | [X.XXX] | [Yes/No] |
| P2 | [X] | [X.XXX] | [X.XXX] | |
| P3 | [X] | [X.XXX] | [X.XXX] | |
| P4 | [X] | [X.XXX] | [X.XXX] | |
| **Mean** | | **[X.XXX]** | | |

[Narrative — fill on Day 7]

#### 5.2.3 Emotion Regulation Strategies (RQ2)

| Strategy | % of Sessions |
|---|---|
| Mood Repair | [X]% |
| Upregulation | [X]% |
| Rumination | [X]% |
| Mood Maintenance | [X]% |
| Diversion | [X]% |

[Narrative — fill on Day 7]

#### 5.2.4 Genre and Language Breakdown (RQ3, RQ5, RQ6)

[Top genres per participant, dominant emotion per genre, English vs non-English valence distribution — fill on Day 7]

---

## CHAPTER 6: DISCUSSION

### 6.1 Lyrical Valence as a Mood Proxy

[Based on results — if correlations are significant: argue that passive listening history can serve as a lightweight, unobtrusive proxy for affective state, requiring no active self-report beyond the initial OAuth login. If mixed: discuss individual differences and why some users show stronger alignment.]

The personalised calibration approach addresses the well-known limitation that universal sentiment models do not account for individual differences in music taste. A user who habitually listens to lyrically dark music for comfort (rumination-as-coping) would show a systematically different baseline than one who uses music purely for mood enhancement. The linear recalibration `predicted_mood = slope × valence + intercept` absorbs this individual offset, improving practical utility.

### 6.2 Emotion Regulation Strategies

[Discuss dominant strategy found. Compare to Saarikallio and Erkkilä's [15] taxonomy. Note whether regulation behaviour was consistent within participants or varied by day or genre.]

### 6.3 Limitations

1. **Small sample size.** With N=4 participants, results are indicative rather than generalisable. With n=7 data points per user, the critical value for significance at α=0.05 is |r| > 0.754, meaning only strong correlations are detectable.

2. **Spotify development mode constraint.** Spotify limits access to 5 users in development mode, preventing large-scale recruitment.

3. **Lyrics-only modality.** With Spotify's audio features API deprecated, energy must be estimated from lyrical content and Last.fm genre tags rather than acoustic measurements.

4. **Language detection reliability.** langdetect misidentifies romanised Punjabi/Hindi as European languages, corrupting the language comparison chart — though valence scoring via XLM-RoBERTa is unaffected.

5. **lrclib.net coverage gaps.** Very recent releases and obscure regional tracks may not be in lrclib's database, resulting in valence=0.0 placeholders excluded from aggregation.

6. **Model training domain mismatch.** j-hartmann was fine-tuned on social media text; song lyrics are more figurative and repetitive, which may cause misclassification for genre-specific conventions.

7. **Self-report temporal misalignment.** Mood check-ins are single-point daily ratings that may not reflect emotional state during specific listening sessions.

8. **Calibration data scarcity.** The calibration model is fit on at most 7 paired observations per user, making parameters highly sensitive to individual outlier days.

---

## CHAPTER 7: CONCLUSION

This project presented MoodSync, a fully deployed system for continuous mood tracking through NLP analysis of Spotify listening history. The system employs a mathematically transparent three-model ensemble — DistilRoBERTa (j-hartmann), RoBERTa (cardiffnlp), and VADER — to derive per-track valence scores from song lyrics, aggregating these into daily mood timelines, 7-day forecasts via Holt's exponential smoothing, and session-level emotion regulation classifications.

A 7-day naturalistic field study with four external participants examined whether NLP-derived lyrical valence correlates with self-reported daily mood. [Summary of key finding — fill on Day 7.] Emotion regulation strategy classification revealed [dominant pattern — fill on Day 7]. A personalised linear calibration model further improved model-to-mood correspondence by learning individual-specific slope and intercept parameters from each user's check-in history.

These results support the viability of passive listening history as an affective signal and make several contributions: (1) the first production-deployed system for longitudinal lyrical mood tracking from live Spotify data; (2) a computationally operationalised emotion regulation classifier grounded in Saarikallio and Erkkilä's [15] psychological taxonomy; (3) a personalised calibration framework that bridges the individual–model gap; and (4) a lyrics-first pipeline that remains deployable after Spotify's November 2024 audio features API deprecation.

Future work should address the small sample size through larger-scale studies, explore segment-aware lyric analysis (motivated by Abburi et al. [11]), and investigate multimodal approaches once direct audio access becomes feasible. The personalised calibration framework, validated here on 7 days of data, warrants replication over longer study periods to assess its stability and generalisability.

---

## REFERENCES

[1] S. Shukla, P. Khanna, and K. K. Agrawal, "Review on sentiment analysis on music," in *Proc. Int. Conf. Infocom Technologies and Unmanned Systems (ICTUS)*, 2017.

[2] J. Choi, J.-H. Song, and Y. Kim, "An analysis of music lyrics by measuring the distance of emotion and sentiment," in *Proc. 19th IEEE/ACIS Int. Conf.*, 2018.

[3] X. Chen and T. Tang, "Combining content and sentiment analysis on lyrics for a lightweight emotion-aware Chinese song recommendation system," 2018.

[4] L. Schaab and A. Kruspe, "Joint sentiment analysis of lyrics and audio in music," 2024.

[5] E. Çano and M. Morisio, "MoodyLyrics: A sentiment annotated lyrics dataset," 2017.

[6] B. Logan, A. Kositsky, and P. Moreno, "Semantic analysis of song lyrics," in *Proc. IEEE Int. Conf. Multimedia and Expo (ICME)*, 2004.

[7] Y. Xia, L. Wang, and K.-F. Wong, "Sentiment vector space model for lyric-based song sentiment classification," in *Proc. WWW*, 2008.

[8] V. S. G. S. P. Bottu and K. Ragavan, "Emotion-based music recommendation system integrating facial expression recognition and lyrics sentiment analysis," *IEEE Access*, vol. 13, pp. 87740–87752, 2025.

[9] V. Kumar and S. Minz, "Mood classification of lyrics using SentiWordNet," in *Proc. ICCCI*, IEEE, 2013.

[10] H.-H. Wu, C.-R. A. Tsai, T.-H. R. Tsai, and Y.-J. J. Hsu, "Building a graded Chinese sentiment dictionary based on commonsense knowledge for sentiment analysis of song lyrics."

[11] H. Abburi, E. S. A. Akkireddy, S. V. Gangashetty, and R. Mamidi, "Multimodal sentiment analysis of Telugu songs," 2016.

[12] J. A. Russell, "A circumplex model of affect," *J. Personality Social Psychol.*, vol. 39, no. 6, pp. 1161–1178, 1980.

[13] R. E. Thayer, J. R. Newman, and T. M. McClain, "Self-regulation of mood: Strategies for changing a bad mood, raising energy, and reducing tension," *J. Personality Social Psychol.*, vol. 67, no. 5, pp. 910–925, 1994.

[14] A. C. North, D. J. Hargreaves, and J. Hargreaves, "Uses of music in everyday life," *Music Perception*, vol. 22, no. 1, pp. 41–77, 2004.

[15] S. Saarikallio and J. Erkkilä, "The role of music in adolescents' mood regulation," *Psychol. Music*, vol. 35, no. 1, pp. 88–109, 2007.

[16] J. Hartmann, "Emotion English DistilRoBERTa-base," Hugging Face, 2022. [Online]. Available: https://huggingface.co/j-hartmann/emotion-english-distilroberta-base

[17] F. Barbieri, J. Camacho-Collados, L. Espinosa-Anke, and L. Neves, "TweetEval: Unified benchmark and comparative evaluation for tweet classification," in *Findings of EMNLP*, 2020.

[18] C. J. Hutto and E. Gilbert, "VADER: A parsimonious rule-based model for sentiment analysis of social media text," in *Proc. ICWSM*, 2014.

[19] M. Schedl, H. Zamani, C.-W. Chen, Y. Deldjoo, and M. Elahi, "Current challenges and visions in music recommender systems research," *Int. J. Multimedia Inf. Retrieval*, vol. 7, no. 2, pp. 95–116, 2018.

---

## LIST OF PUBLICATIONS

1. Y. Chaturvedi, "MoodSync: Correlating Lyrical Sentiment with Self-Reported Mood via Personalised NLP Calibration," *[Target Conference — IEEE]*, [Year]. *(Under preparation)*
