# MoodSync: BTP Research Design Document

**Yash Chaturvedi**

---

## 1. Identification of the Research Problem

### 1.1 Potential Contribution to Existing Knowledge / Novelty and Innovation in Approach

The intersection of music, emotion, and computing has attracted substantial research interest over the past two decades. However, the overwhelming majority of Music Emotion Recognition (MER) systems are designed to classify the emotion *expressed by a piece of music* — treating emotion as an intrinsic property of a song, independent of the listener. This approach is fundamentally limited for the purpose of mood tracking: two people can listen to the same song in radically different emotional states, and the same person can use the same song for entirely different regulatory purposes depending on their current mood.

MoodSync departs from this paradigm in three ways that constitute its novelty:

**1. Longitudinal, listener-centric mood inference from passive data.**
Rather than classifying individual tracks in isolation, MoodSync aggregates NLP-derived valence scores across a user's entire listening history into a continuous daily mood timeline. This longitudinal perspective — tracking one person's emotional arc over 7 days or more — has not been operationalised in a deployed, real-time system using transformer-based lyric analysis. Prior systems either operate on static datasets, require explicit mood labelling by users, or rely on audio features rather than semantic lyric content.

**2. A multi-model NLP ensemble with mathematically grounded fusion.**
Existing lyric sentiment systems typically employ a single model. MoodSync combines three architecturally distinct models — a fine-tuned DistilRoBERTa emotion classifier (j-hartmann, 7-class), a RoBERTa-based polarity model trained on Twitter data (cardiffnlp), and a rule-based lexicon model (VADER) — whose outputs are fused through a weighted formula derived from the complementary strengths of each. The composite valence score is not a black box: every weight and mathematical operation is explicitly defined and interpretable. This transparency is a deliberate design choice motivated by the system's use in a research context.

**3. Personalised calibration to bridge the individual–model gap.**
Universal sentiment models do not account for individual listening personalities — a person who habitually listens to lyrically dark music for comfort will receive a systematically lower model valence than a pop music listener, yet both may report the same subjective mood. MoodSync addresses this through a per-user linear calibration model fit on the user's own paired (valence, self-report) observations. The calibration quantifies not just the correlation but also learns a personal formula of the form `predicted_mood = β × valence + intercept`, absorbing individual baseline offsets. This personalised approach distinguishes MoodSync from all prior MER systems reviewed in the literature.

**4. Cross-lingual support via multilingual transformers.**
By routing non-English lyrics through XLM-RoBERTa — a multilingual transformer trained on 100 languages — MoodSync extends lyric-based mood tracking beyond English-language music. This is particularly relevant for the Indian context where listeners frequently consume content in Hindi, Punjabi, Tamil, and other languages. No prior deployed mood-tracking system from the reviewed literature addresses this multilingual requirement in a production setting.

**5. Production deployment under real study conditions.**
MoodSync is not a simulation or an offline experiment on an annotated dataset. It is a fully deployed web application (frontend on Vercel, backend on Railway, database on Neon PostgreSQL) that was used by real participants under naturalistic conditions — listening to whatever they wanted, whenever they wanted — with no artificial constraints on track selection. This ecological validity is a meaningful contribution over lab-controlled or dataset-bounded studies.

### 1.2 Contemporary Relevance and Originality

The relevance of this research is amplified by two concurrent developments in the technology landscape:

**Deprecation of Spotify's audio features API (November 2024).** Spotify's previously available audio features endpoint — which provided acoustic valence, tempo, energy, danceability, and mode for any track — has been discontinued for new application registrations. This removes the primary signal used by the majority of prior music-mood systems from the accessible toolset. MoodSync's lyrics-first approach is therefore not only novel but *necessary* for any system built after this date that seeks to perform valence estimation without requiring access to audio files directly.

**Growing demand for passive affect monitoring.** Mental health awareness has increased substantially in recent years, driving interest in continuous, low-burden monitoring of emotional wellbeing. Active self-report tools (questionnaires, diary studies) suffer from compliance fatigue; biometric sensors require hardware; social media analysis raises privacy concerns. Passively analysing already-existing streaming behaviour — something millions of people engage in daily — offers a privacy-respecting, zero-burden alternative signal that this work directly investigates.

---

## 2. Review of Literature — Research Gap

### 2.1 Summary of Relevant Prior Work

The literature on lyric-based sentiment analysis spans two decades of methodological evolution. Early approaches — Logan et al.'s [6] PLSA-based topic vectors, Xia et al.'s [7] Sentiment Vector Space Model, Kumar and Minz's [9] SentiWordNet classifiers — established that lyrics carry extractable emotional signals but were limited by the expressiveness of pre-neural representations and English-only lexicons.

The emergence of transformer-based NLP models (BERT, RoBERTa, XLM-RoBERTa) dramatically improved classification accuracy. Hartmann's [16] emotion classifier and Barbieri et al.'s [17] multilingual models have become standard components in emotion analysis pipelines. Multimodal approaches (Schaab and Kruspe [4], Bottu and Ragavan [8], Abburi et al. [11]) have explored combining lyric features with audio or visual signals, generally finding that lyrics and audio are complementary rather than redundant.

On the music-mood regulation side, North et al. [14] and Saarikallio and Erkkilä [15] provided foundational psychological evidence that listeners actively use music to manage emotional state, identifying distinct regulatory strategies (mood repair, rumination, upregulation, diversion). However, computational operationalisation of these strategies — classifying real listening sessions into regulation categories in real time — remains underexplored.

### 2.2 Identified Research Gaps

A systematic examination of the reviewed literature reveals the following gaps that MoodSync directly addresses:

**Gap 1: No longitudinal, personalised, deployed system exists.**
All reviewed lyric sentiment systems operate on fixed datasets (MoodyLyrics [5], Billboard Hot 100 [2]) and evaluate emotion at the track level. None track a specific user's mood over time by aggregating scores across their personal listening history. The longitudinal, user-centric perspective is entirely absent from the computational literature, despite being well-motivated by the psychological literature on music and mood regulation.

**Gap 2: The individual variability problem is acknowledged but not solved.**
Shukla et al. [1] explicitly note — drawing on the Big Five personality framework — that lyric sentiment is interpreted differently across users. Despite this acknowledgment, no reviewed system implements a mechanism to personalise model output to individual users. The standard approach is to train and evaluate on population-level annotations, which necessarily averages out individual differences. MoodSync's per-user calibration model directly fills this gap.

**Gap 3: Audio features are assumed to be available.**
The majority of multimodal approaches (Schaab and Kruspe [4], Abburi et al. [11]) depend on audio feature extraction, whether from Spotify's API or from raw audio files. With Spotify's audio features API deprecated for new applications, these approaches are no longer reproducible in the streaming context without direct audio access. The literature has not yet proposed a lyrics-only approach that explicitly accounts for this constraint and remains practically deployable.

**Gap 4: Non-English music is underrepresented.**
While Wu et al. [10] and Abburi et al. [11] address specific non-English languages (Chinese, Telugu), no reviewed system provides a general multilingual fallback that can handle arbitrary languages within a unified deployed pipeline. The romanisation problem — lyrics in Indic scripts written in Latin characters — is not addressed in any reviewed work, yet it is a common real-world scenario in Indian streaming contexts.

**Gap 5: Emotion regulation is not computationally classified in real time.**
Saarikallio and Erkkilä's [15] taxonomy of emotion regulation strategies is widely cited in the music psychology literature but has not been implemented as a real-time classifier operating on streaming listen sequences. The gap between theoretical typology and computational operationalisation is what MoodSync's session-level regulation classifier addresses.

---

## 3. Formulation of Research Design

### 3.1 Statement of Problem

Millions of people use music streaming platforms daily, generating detailed records of what they listen to, when, and how often. These records contain latent information about the listener's emotional state — people reach for different music depending on how they feel. However, there is no practical, deployed system that automatically extracts this emotional information from listening history using NLP on song lyrics, correlates it with users' actual self-reported mood, and does so in a personalised, longitudinal, and multilingual manner.

Existing music emotion recognition systems classify the perceived emotion of individual tracks using either audio features or lyrics, but do not: (a) aggregate these scores into a user-specific longitudinal mood signal; (b) account for individual differences in how model output maps to subjective experience; (c) remain practically deployable without access to Spotify's deprecated audio features API; or (d) handle the full multilingual diversity of real listening behaviour.

This research addresses the problem of inferring and tracking a user's daily emotional state from their passive Spotify listening history, using an NLP ensemble applied to song lyrics, and evaluating the correspondence between this inferred signal and the user's own self-reported mood — with personalised calibration to close the individual–model gap.

### 3.2 Scope of Research

This research is scoped as follows:

**In scope:**
- English and non-English lyrics reachable through lrclib.net (English, Punjabi, Hindi, and other languages with lrclib coverage)
- Spotify listening history (recently played tracks, up to 50 per sync)
- Self-reported daily mood on a 1–5 scale via an in-app check-in interface
- A 7-day naturalistic study period with up to 5 external participants (Spotify development mode constraint)
- Emotion regulation classification at the session level using valence trajectory statistics
- Per-user personalised linear calibration of model output to self-reported mood
- Genre-level emotion breakdown using Last.fm tags

**Out of scope:**
- Audio-based features (Spotify audio features API unavailable for new registrations)
- Physiological signals (heart rate, galvanic skin response)
- Real-time mood inference (system operates on listen history, not live playback)
- Tracks with no available lyrics (assigned neutral placeholder, excluded from aggregation)
- Generalisation beyond the study population without further validation

### 3.3 Aims and Objectives

**Aim:** To design, deploy, and empirically evaluate a system that infers daily emotional state from Spotify listening history through NLP-based lyrical sentiment analysis, and to investigate the degree to which this inferred signal correlates with users' self-reported mood.

**Objectives:**

1. **O1 — System construction:** Design and deploy a full-stack web application that authenticates users via Spotify OAuth, fetches their listening history, retrieves song lyrics from an open database, and processes those lyrics through a multi-model NLP pipeline to produce per-track valence scores, daily mood timelines, and session-level emotion regulation classifications.

2. **O2 — Pipeline design:** Construct a mathematically transparent NLP ensemble combining j-hartmann's DistilRoBERTa emotion classifier, cardiffnlp's RoBERTa polarity model, and VADER, with explicit weighting formulas that produce a composite valence score in [−1, +1], and extend this pipeline to non-English content using XLM-RoBERTa.

3. **O3 — Correlation analysis:** Collect paired daily observations of NLP-derived mean valence and normalised self-reported mood ratings over a 7-day study period, and compute per-user Pearson r with statistical significance testing to quantify the correspondence between the two signals.

4. **O4 — Personalised calibration:** Fit a per-user linear regression model mapping model valence to self-reported mood, learning individual intercept and slope parameters that account for baseline differences in listening style, and evaluate the improvement in correspondence relative to the uncalibrated model.

5. **O5 — Emotion regulation characterisation:** Implement a session-level classifier that assigns each listening session to one of five regulation strategies (Mood Repair, Upregulation, Rumination, Mood Maintenance, Diversion) based on valence trajectory statistics, and analyse the distribution of strategies across participants.

### 3.4 Research Questions

- **RQ1:** Does NLP-derived lyrical valence — computed from a user's Spotify listening history — show a statistically significant positive correlation with their self-reported daily mood rating?

- **RQ2:** Does personalised linear calibration (fitting a per-user slope and intercept to their own check-in history) improve the correspondence between model-derived valence and self-reported mood relative to the universal uncalibrated score?

- **RQ3:** What emotion regulation strategies are observable from users' listening sequences, and is there a dominant strategy that emerges across participants or within individuals?

- **RQ4:** Does the composite multi-model valence score (j-hartmann + RoBERTa + VADER ensemble) provide a more reliable mood proxy than any single model in isolation?

- **RQ5:** To what extent does genre, as inferred from Last.fm tags, predict the emotional valence of a user's listening sessions — and do genre-valence profiles differ systematically across participants?

- **RQ6:** How does the coverage and accuracy of the NLP pipeline degrade for non-English content (e.g. Hindi, Punjabi), and what are the implications for mood tracking in multilingual listening contexts?

### 3.5 Hypothesis

**Primary hypothesis (H1):** There is a statistically significant positive Pearson correlation (r > 0, p < 0.05) between a user's daily mean NLP-derived lyrical valence and their normalised self-reported mood rating, for at least a majority of study participants.

*Rationale:* If people use music as an emotional tool — selecting music that reflects, amplifies, or regulates their current state — then the emotional content of the music they choose on a given day should co-vary with how they feel on that day. The direction of causality is not assumed; the hypothesis concerns only the presence of a significant linear relationship.

**Secondary hypothesis (H2):** Personalised linear calibration will improve model-to-mood correspondence (higher r after calibration than before) for users whose raw correlation is positive, by absorbing systematic individual baseline offsets in listening style.

**Null hypothesis (H0):** There is no statistically significant linear relationship between NLP-derived lyrical valence and self-reported mood (r = 0 cannot be rejected at α = 0.05 for any participant).

### 3.6 Research Methodology

This research employs a **mixed-methods experimental design** combining quantitative correlation analysis with qualitative characterisation of emotion regulation behaviour.

**Phase 1 — System Development (Engineering):**
MoodSync was designed and implemented as a production web application over a period of approximately 6 weeks. The backend (Python 3.11, FastAPI, SQLAlchemy, PostgreSQL) implements the lyrics retrieval pipeline, NLP scoring engine, and all analytical endpoints. The frontend (Next.js 14, TypeScript, Tailwind CSS) provides the user interface for OAuth login, daily sync, mood check-ins, and dashboard visualisation. HuggingFace Transformers provides the pre-trained model weights; no model training was performed — only inference on pre-trained checkpoints fine-tuned on emotion/sentiment datasets.

**Phase 2 — Data Collection (Naturalistic Field Study):**
Four external participants were recruited from the researcher's personal network. Each participant:
- Connected their Spotify account to MoodSync via OAuth
- Synced their listening history at least once daily for 7 consecutive days
- Submitted at least one mood check-in per day on a 1–5 scale via the Journal interface

The correlation chart and calibration scatter were deliberately hidden from participants during the study period to prevent demand characteristics — ensuring that participants' music listening behaviour and mood check-ins were not influenced by awareness of what the system was measuring. The researcher's own data was collected in parallel but excluded from all analysis.

**Phase 3 — Quantitative Analysis:**
For each participant, the following are computed:
- Daily mean NLP valence: `v_t = (1/N_t) Σ valence_j` across all listen events on day t
- Normalised mood: `m_t = (rating_t − 3.0) / 2.0 ∈ [−1, +1]`
- Pearson r between the paired (v_t, m_t) time series
- Statistical significance via two-tailed t-test: `t = r√(n−2) / √(1−r²)`
- Linear calibration: `m̂_t = β·v_t + intercept` via ordinary least squares
- Cross-user mean r and standard deviation

**Phase 4 — Emotion Regulation Analysis:**
Listening sessions are segmented by a 30-minute gap threshold. Each session's valence sequence is characterised by mean, standard deviation, start-third mean, end-third mean, and slope. A deterministic rule-based classifier assigns each session to one of five strategies. Strategy distributions are computed per user and aggregated across all participants.

**Phase 5 — Genre and Language Analysis:**
Genre-level emotion profiles are constructed from Last.fm tags. Language distribution is tabulated from the langdetect output on each lyric record. The coverage rate (proportion of tracks successfully analysed) is computed per participant as a measure of pipeline reliability.

### 3.7 Limitations

1. **Small sample size:** With N=4 participants, results are indicative rather than generalisable. The study is positioned as a pilot; statistical power is limited, particularly for detecting weak correlations (|r| < 0.5) with n=7 data points per user (critical value |r| > 0.754 for significance at α=0.05).

2. **Spotify development mode constraint:** Spotify's developer mode limits application access to 5 users, preventing large-scale recruitment without quota extension approval (which Spotify no longer grants to individuals).

3. **Lyrics-only modality:** With Spotify's audio features API deprecated, energy and arousal must be estimated from lyrical content and Last.fm genre tags rather than acoustic measurements. This introduces estimation error relative to true acoustic energy.

4. **Language detection reliability:** The `langdetect` library misidentifies romanised Indic scripts (Punjabi/Hindi written in Latin characters) as European languages, causing incorrect routing in the NLP pipeline's language branch. This does not affect valence scoring (XLM-RoBERTa handles the text regardless) but corrupts the language comparison chart.

5. **lrclib.net coverage gaps:** Very recent releases and obscure or regional tracks may not be present in lrclib's database, resulting in a `valence = 0.0` placeholder. These tracks are excluded from valence aggregation but remain in the listen history, potentially distorting the proportion of analysed tracks.

6. **Model training domain mismatch:** j-hartmann was fine-tuned on social media text (Twitter, Reddit). Song lyrics differ stylistically — they are more figurative, more repetitive, and more structured than conversational text — which may cause systematic misclassification, particularly for genre-specific linguistic conventions (e.g. hyperbolic language in hip-hop).

7. **Self-report validity:** Mood check-ins are single-item 1–5 ratings submitted at a single point in the day, which may not accurately represent the user's mood *during* their listening sessions. The temporal alignment between listening events and the check-in is imperfect.

8. **Calibration data scarcity:** The personalised calibration model requires a minimum of 3 paired observations (days with both listening and a check-in). With only 7 study days, the calibration is fit on very few data points, and the learned parameters (slope, intercept) will be highly sensitive to individual outlier days.

---

## References

[1] S. Shukla, P. Khanna, and K. K. Agrawal, "Review on sentiment analysis on music," in *Proc. Int. Conf. Infocom Technologies and Unmanned Systems (ICTUS)*, 2017.

[2] J. Choi, J.-H. Song, and Y. Kim, "An analysis of music lyrics by measuring the distance of emotion and sentiment," in *Proc. 19th IEEE/ACIS Int. Conf.*, 2018.

[3] X. Chen and T. Tang, "Combining content and sentiment analysis on lyrics for a lightweight emotion-aware Chinese song recommendation system," 2018.

[4] L. Schaab and A. Kruspe, "Joint sentiment analysis of lyrics and audio in music," 2024.

[5] E. Çano and M. Morisio, "MoodyLyrics: A sentiment annotated lyrics dataset," 2017.

[6] B. Logan, A. Kositsky, and P. Moreno, "Semantic analysis of song lyrics," in *Proc. IEEE ICME*, 2004.

[7] Y. Xia, L. Wang, and K.-F. Wong, "Sentiment vector space model for lyric-based song sentiment classification," in *Proc. WWW*, 2008.

[8] V. S. G. S. P. Bottu and K. Ragavan, "Emotion-based music recommendation system integrating facial expression recognition and lyrics sentiment analysis," *IEEE Access*, vol. 13, pp. 87740–87752, 2025.

[9] V. Kumar and S. Minz, "Mood classification of lyrics using SentiWordNet," in *Proc. ICCCI*, IEEE, 2013.

[10] H.-H. Wu, C.-R. A. Tsai, T.-H. R. Tsai, and Y.-J. J. Hsu, "Building a graded Chinese sentiment dictionary based on commonsense knowledge for sentiment analysis of song lyrics."

[11] H. Abburi, E. S. A. Akkireddy, S. V. Gangashetty, and R. Mamidi, "Multimodal sentiment analysis of Telugu songs," 2016.

[12] J. A. Russell, "A circumplex model of affect," *J. Personality Social Psychol.*, vol. 39, no. 6, pp. 1161–1178, 1980.

[13] R. E. Thayer, J. R. Newman, and T. M. McClain, "Self-regulation of mood," *J. Personality Social Psychol.*, vol. 67, no. 5, pp. 910–925, 1994.

[14] A. C. North, D. J. Hargreaves, and J. Hargreaves, "Uses of music in everyday life," *Music Perception*, vol. 22, no. 1, pp. 41–77, 2004.

[15] S. Saarikallio and J. Erkkilä, "The role of music in adolescents' mood regulation," *Psychol. Music*, vol. 35, no. 1, pp. 88–109, 2007.

[16] J. Hartmann, "Emotion English DistilRoBERTa-base," Hugging Face, 2022.

[17] F. Barbieri, J. Camacho-Collados, L. Espinosa-Anke, and L. Neves, "TweetEval: Unified benchmark and comparative evaluation for tweet classification," in *Findings of EMNLP*, 2020.

[18] C. J. Hutto and E. Gilbert, "VADER: A parsimonious rule-based model for sentiment analysis of social media text," in *Proc. ICWSM*, 2014.

[19] M. Schedl, H. Zamani, C.-W. Chen, Y. Deldjoo, and M. Elahi, "Current challenges and visions in music recommender systems research," *Int. J. Multimedia Inf. Retrieval*, vol. 7, no. 2, pp. 95–116, 2018.
