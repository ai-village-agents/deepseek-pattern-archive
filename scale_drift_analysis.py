#!/usr/bin/env python3
"""
Scale Drift Analysis
====================

This utility analyzes 1,000+ Drift station fragments in batches, computes
comprehensive NLP scores, and updates Pattern Archive monitoring assets.

Key capabilities
- Fetch or simulate Drift station content with retry/backoff
- Readability (Flesch-Kincaid, Gunning Fog), engagement, structure, uniqueness
- Overall quality scoring (0-100) with weighted aggregation
- Batch processing with resume, caching, and per-batch JSON reports
- Parallel fragment analysis with progress/ETA estimation
- Dashboard/API integration:
    * drift_quality_reports/ (batch + aggregate outputs)
    * quality_monitoring_dashboard_real_time.html (live metrics)
    * ecosystem_metrics_api.json (quality status)
    * quality trend visualizations (PNG)

Usage
-----
python scale_drift_analysis.py --start-id 1 --end-id 1000 --batch-size 100 --resume
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import logging
import math
import random
import re
import statistics
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

try:
    import requests
except ImportError:  # pragma: no cover - optional dependency
    requests = None

try:
    import matplotlib.pyplot as plt
except ImportError:  # pragma: no cover - optional dependency
    plt = None


# Paths -----------------------------------------------------------------------

DEFAULT_OUTPUT_DIR = Path("drift_quality_reports")
PROGRESS_FILE = "progress.json"
CACHE_FILE = "cache.json"
AGGREGATE_FILE = "aggregate_results.json"
LOG_FILE = "scale_drift_analysis.log"
DEFAULT_DASHBOARD = Path("quality_monitoring_dashboard_real_time.html")
DEFAULT_API = Path("ecosystem_metrics_api.json")


# Helper data -----------------------------------------------------------------

POSITIVE_WORDS = {
    "joy",
    "serene",
    "calm",
    "vibrant",
    "radiant",
    "uplift",
    "brilliant",
    "hope",
    "glow",
    "soar",
    "wonder",
    "alive",
}
NEGATIVE_WORDS = {
    "drift",
    "loss",
    "collapse",
    "fracture",
    "uncertain",
    "chaos",
    "silence",
    "echo",
    "broken",
    "storm",
}
CREATIVE_TERMS = {
    "mycelium",
    "constellation",
    "luminous",
    "tessellate",
    "harmonics",
    "aurora",
    "spiral",
    "signal",
    "glimmer",
    "prism",
    "chorus",
}
TRANSITION_WORDS = {
    "however",
    "meanwhile",
    "therefore",
    "moreover",
    "additionally",
    "ultimately",
    "consequently",
    "furthermore",
    "similarly",
    "nonetheless",
    "later",
    "earlier",
}


# Data models -----------------------------------------------------------------

@dataclass
class FragmentScores:
    readability_score: float
    flesch_kincaid_grade: float
    gunning_fog: float
    engagement_score: float
    structure_score: float
    uniqueness_score: float
    overall_quality: float


@dataclass
class FragmentResult:
    station_id: int
    text_preview: str
    scores: FragmentScores
    status: str = "ok"
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchReport:
    batch_id: int
    start_id: int
    end_id: int
    processed: int
    succeeded: int
    failed: int
    duration_seconds: float
    timestamp: str
    average_scores: Dict[str, float]
    results: List[FragmentResult]
    errors: List[Dict[str, Any]]


@dataclass
class AggregateStats:
    total_processed: int = 0
    total_success: int = 0
    total_failed: int = 0
    score_sums: Dict[str, float] = field(
        default_factory=lambda: {
            "readability": 0.0,
            "engagement": 0.0,
            "structure": 0.0,
            "uniqueness": 0.0,
            "overall": 0.0,
        }
    )
    batches: List[Dict[str, Any]] = field(default_factory=list)

    def update(self, batch: BatchReport) -> None:
        self.total_processed += batch.processed
        self.total_success += batch.succeeded
        self.total_failed += batch.failed
        self.score_sums["readability"] += batch.average_scores["readability"]
        self.score_sums["engagement"] += batch.average_scores["engagement"]
        self.score_sums["structure"] += batch.average_scores["structure"]
        self.score_sums["uniqueness"] += batch.average_scores["uniqueness"]
        self.score_sums["overall"] += batch.average_scores["overall"]
        self.batches.append(
            {
                "batch_id": batch.batch_id,
                "range": [batch.start_id, batch.end_id],
                "timestamp": batch.timestamp,
                "averages": batch.average_scores,
                "duration_seconds": batch.duration_seconds,
                "succeeded": batch.succeeded,
                "failed": batch.failed,
            }
        )

    def averages(self) -> Dict[str, float]:
        if not self.batches:
            return {
                "readability": 0.0,
                "engagement": 0.0,
                "structure": 0.0,
                "uniqueness": 0.0,
                "overall": 0.0,
            }
        divisor = len(self.batches)
        return {
            "readability": round(self.score_sums["readability"] / divisor, 2),
            "engagement": round(self.score_sums["engagement"] / divisor, 2),
            "structure": round(self.score_sums["structure"] / divisor, 2),
            "uniqueness": round(self.score_sums["uniqueness"] / divisor, 2),
            "overall": round(self.score_sums["overall"] / divisor, 2),
        }


# Utility functions -----------------------------------------------------------

def clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    return max(min_value, min(max_value, value))


def sentence_split(text: str) -> List[str]:
    cleaned = text.replace("\n", " ").strip()
    if not cleaned:
        return ["."]
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    return [p for p in parts if p.strip()]


def words_list(text: str) -> List[str]:
    return re.findall(r"[A-Za-z']+", text.lower())


def count_syllables(word: str) -> int:
    word = word.lower()
    vowels = "aeiouy"
    syllables = 0
    prev_vowel = False
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_vowel:
            syllables += 1
        prev_vowel = is_vowel
    if word.endswith("e") and syllables > 1:
        syllables -= 1
    return max(1, syllables)


def flesch_kincaid_grade(text: str) -> float:
    sentences = sentence_split(text)
    words = words_list(text)
    syllables = sum(count_syllables(w) for w in words)
    words_count = max(1, len(words))
    sentences_count = max(1, len(sentences))
    return 0.39 * (words_count / sentences_count) + 11.8 * (syllables / words_count) - 15.59


def gunning_fog(text: str) -> float:
    sentences = sentence_split(text)
    words = words_list(text)
    complex_words = sum(1 for w in words if count_syllables(w) >= 3)
    words_count = max(1, len(words))
    sentences_count = max(1, len(sentences))
    return 0.4 * ((words_count / sentences_count) + 100 * (complex_words / words_count))


def readability_score(text: str) -> Tuple[float, float, float]:
    fk_grade = flesch_kincaid_grade(text)
    fog = gunning_fog(text)
    sentences = sentence_split(text)
    words = words_list(text)
    syllables = sum(count_syllables(w) for w in words)
    words_count = max(1, len(words))
    sentences_count = max(1, len(sentences))
    reading_ease = (
        206.835 - 1.015 * (words_count / sentences_count) - 84.6 * (syllables / words_count)
    )

    normalized_ease = clamp(reading_ease)
    grade_score = clamp(100 - max(0.0, fk_grade - 6) * 8)
    fog_score = clamp(100 - max(0.0, fog - 6) * 7)
    combined = round(normalized_ease * 0.4 + grade_score * 0.3 + fog_score * 0.3, 2)
    return combined, fk_grade, fog


def engagement_score(text: str) -> float:
    sentences = sentence_split(text)
    words = words_list(text)
    if not sentences or not words:
        return 0.0

    sentence_lengths = [len(s.split()) for s in sentences]
    mean_len = statistics.mean(sentence_lengths)
    std_len = statistics.pstdev(sentence_lengths) if len(sentence_lengths) > 1 else 0.0
    variety_score = clamp(100 - abs((std_len / (mean_len + 1)) - 0.6) * 120)

    positive_hits = sum(1 for w in words if w in POSITIVE_WORDS)
    negative_hits = sum(1 for w in words if w in NEGATIVE_WORDS)
    emotional_density = (positive_hits + negative_hits) / max(1, len(words))
    tone_balance = 1 - abs(positive_hits - negative_hits) / max(1, positive_hits + negative_hits)
    tone_score = clamp((emotional_density * 220) + (tone_balance * 60))

    interactive_signals = text.count("?") + text.count("!") + len(re.findall(r"\byou\b", text, re.I))
    interactive_score = clamp((interactive_signals / max(1, len(sentences))) * 140)

    return round(variety_score * 0.35 + tone_score * 0.35 + interactive_score * 0.3, 2)


def structure_score(text: str) -> float:
    sentences = sentence_split(text)
    words = words_list(text)
    if not sentences or not words:
        return 0.0

    sentence_lengths = [len(s.split()) for s in sentences]
    mean_len = statistics.mean(sentence_lengths)
    flow_score = clamp((len([w for w in words if w in TRANSITION_WORDS]) / max(1, len(sentences))) * 220)
    cohesion_score = clamp(100 - (statistics.pstdev(sentence_lengths) / (mean_len + 1)) * 90)
    paragraphs = [p for p in text.split("\n") if p.strip()]
    section_score = clamp(min(len(paragraphs), 8) / 8 * 100)
    return round(flow_score * 0.4 + cohesion_score * 0.35 + section_score * 0.25, 2)


def uniqueness_score(text: str) -> float:
    words = words_list(text)
    if not words:
        return 0.0

    unique_ratio = len(set(words)) / len(words)
    ttr_score = clamp(unique_ratio * 120)

    bigrams = list(zip(words, words[1:]))
    bigram_freq: Dict[Tuple[str, str], int] = {}
    for bg in bigrams:
        bigram_freq[bg] = bigram_freq.get(bg, 0) + 1
    repeated = sum(1 for count in bigram_freq.values() if count > 1)
    repetition_penalty = clamp((repeated / max(1, len(bigrams))) * 140)
    repetition_score = 100 - repetition_penalty

    creative_hits = sum(1 for w in words if w in CREATIVE_TERMS)
    creative_score = clamp((creative_hits / len(words)) * 260)

    return round(ttr_score * 0.45 + repetition_score * 0.35 + creative_score * 0.2, 2)


def overall_quality(
    readability: float, engagement: float, structure: float, uniqueness: float
) -> float:
    return round(
        readability * 0.25 + engagement * 0.25 + structure * 0.2 + uniqueness * 0.2 + 0.1 * statistics.mean(
            [readability, engagement, structure, uniqueness]
        ),
        2,
    )


# Content generation and fetching --------------------------------------------

def simulate_station_text(station_id: int) -> str:
    random.seed(station_id)
    themes = [
        "signal scaffolding along the Drift",
        "quiet maintenance rituals",
        "multi-agent echoes synchronizing in twilight",
        "adaptive beacons responding to incoming visitors",
        "archival seeds planted in low-gravity vaults",
        "chorus of anchor points stabilizing the field",
    ]
    verbs = ["unfurls", "stitches", "resonates", "listens", "anchors", "threads", "loops"]
    textures = [
        "faint aurora tracing cables",
        "memory crystals humming softly",
        "mist translating footsteps to signals",
        "navigation glyphs shimmering",
        "luminous index points blinking",
    ]
    prompt = random.choice(themes)
    body_sentences = []
    for i in range(random.randint(5, 9)):
        phrase = f"{random.choice(textures)}; {random.choice(verbs)} across station {station_id}."
        if i % 2 == 0:
            phrase += " Visitors are invited to map their own path?"
        body_sentences.append(phrase)
    closing = (
        "However, alignment remains delicate; more anchors keep the Drift steady."
        " Add your mark and test the resonance."
    )
    return f"{prompt}. " + " ".join(body_sentences) + " " + closing


def fetch_station(
    station_id: int,
    api_base: Optional[str],
    timeout: int,
    max_attempts: int,
    backoff_factor: float,
    logger: logging.Logger,
) -> str:
    if not api_base or not requests:
        return simulate_station_text(station_id)

    url = f"{api_base.rstrip('/')}/stations/{station_id}"
    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 404:
                logger.warning("Station %s missing at API; simulating.", station_id)
                return simulate_station_text(station_id)
            resp.raise_for_status()
            data = resp.json() if "application/json" in resp.headers.get("content-type", "") else {"text": resp.text}
            text = data.get("text") or data.get("fragment") or resp.text
            if not text.strip():
                logger.warning("Empty content for station %s; simulating.", station_id)
                return simulate_station_text(station_id)
            return text
        except Exception as exc:  # noqa: BLE001
            wait = backoff_factor * (2 ** (attempt - 1))
            logger.error(
                "Fetch failed for station %s (attempt %s/%s): %s; retrying in %.1fs",
                station_id,
                attempt,
                max_attempts,
                exc,
                wait,
            )
            time.sleep(wait)
    logger.error("Max attempts reached for station %s; simulating fallback.", station_id)
    return simulate_station_text(station_id)


# Analysis --------------------------------------------------------------------

def analyze_fragment(text: str) -> FragmentScores:
    readability, fk_grade, fog = readability_score(text)
    engagement = engagement_score(text)
    structure = structure_score(text)
    unique = uniqueness_score(text)
    overall = overall_quality(readability, engagement, structure, unique)
    return FragmentScores(
        readability_score=readability,
        flesch_kincaid_grade=round(fk_grade, 2),
        gunning_fog=round(fog, 2),
        engagement_score=engagement,
        structure_score=structure,
        uniqueness_score=unique,
        overall_quality=overall,
    )


def process_station(
    station_id: int,
    api_base: Optional[str],
    timeout: int,
    max_attempts: int,
    backoff_factor: float,
    logger: logging.Logger,
) -> FragmentResult:
    text = fetch_station(station_id, api_base, timeout, max_attempts, backoff_factor, logger)
    scores = analyze_fragment(text)
    preview = text.strip().replace("\n", " ")
    preview = (preview[:180] + "...") if len(preview) > 180 else preview
    return FragmentResult(
        station_id=station_id,
        text_preview=preview,
        scores=scores,
        status="ok",
        metadata={"word_count": len(words_list(text)), "sentence_count": len(sentence_split(text))},
    )


# Persistence helpers ---------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    output_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("scale_drift_analysis")
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    file_handler = logging.FileHandler(output_dir / LOG_FILE)
    file_handler.setFormatter(formatter)
    if not logger.handlers:
        logger.addHandler(file_handler)
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)
    return logger


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return default


def save_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2))


def load_cache(output_dir: Path) -> Dict[str, Any]:
    return load_json(output_dir / CACHE_FILE, {})


def save_cache(output_dir: Path, cache: Dict[str, Any]) -> None:
    save_json(output_dir / CACHE_FILE, cache)


def load_progress(output_dir: Path) -> Dict[str, Any]:
    return load_json(output_dir / PROGRESS_FILE, {})


def save_progress(output_dir: Path, progress: Dict[str, Any]) -> None:
    save_json(output_dir / PROGRESS_FILE, progress)


def load_aggregate(output_dir: Path) -> AggregateStats:
    data = load_json(output_dir / AGGREGATE_FILE, None)
    agg = AggregateStats()
    if not data:
        return agg
    agg.total_processed = data.get("total_processed", 0)
    agg.total_success = data.get("total_success", 0)
    agg.total_failed = data.get("total_failed", 0)
    agg.score_sums = data.get("score_sums", agg.score_sums)
    agg.batches = data.get("batches", [])
    return agg


def save_aggregate(output_dir: Path, aggregate: AggregateStats) -> None:
    save_json(
        output_dir / AGGREGATE_FILE,
        {
            "total_processed": aggregate.total_processed,
            "total_success": aggregate.total_success,
            "total_failed": aggregate.total_failed,
            "score_sums": aggregate.score_sums,
            "batches": aggregate.batches,
            "averages": aggregate.averages(),
        },
    )


# Batch processing ------------------------------------------------------------

def run_batch(
    batch_id: int,
    station_ids: List[int],
    api_base: Optional[str],
    timeout: int,
    max_attempts: int,
    backoff_factor: float,
    cache: Dict[str, Any],
    logger: logging.Logger,
    max_workers: int,
) -> BatchReport:
    started = time.time()
    results: List[FragmentResult] = []
    errors: List[Dict[str, Any]] = []

    def _process(sid: int) -> FragmentResult:
        cache_key = str(sid)
        if cache_key in cache:
            cached = cache[cache_key]
            scores = FragmentScores(
                readability_score=cached["scores"]["readability_score"],
                flesch_kincaid_grade=cached["scores"]["flesch_kincaid_grade"],
                gunning_fog=cached["scores"]["gunning_fog"],
                engagement_score=cached["scores"]["engagement_score"],
                structure_score=cached["scores"]["structure_score"],
                uniqueness_score=cached["scores"]["uniqueness_score"],
                overall_quality=cached["scores"]["overall_quality"],
            )
            return FragmentResult(
                station_id=sid,
                text_preview=cached.get("text_preview", ""),
                scores=scores,
                status=cached.get("status", "ok"),
                error=cached.get("error"),
                metadata=cached.get("metadata", {}),
            )
        try:
            return process_station(sid, api_base, timeout, max_attempts, backoff_factor, logger)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed processing station %s: %s", sid, exc)
            return FragmentResult(
                station_id=sid,
                text_preview="",
                scores=FragmentScores(0, 0, 0, 0, 0, 0, 0),
                status="error",
                error=str(exc),
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {executor.submit(_process, sid): sid for sid in station_ids}
        for future in concurrent.futures.as_completed(future_map):
            result = future.result()
            results.append(result)
            if result.status != "ok":
                errors.append({"station_id": result.station_id, "error": result.error})
            cache[str(result.station_id)] = {
                "text_preview": result.text_preview,
                "scores": result.scores.__dict__,
                "status": result.status,
                "error": result.error,
                "metadata": result.metadata,
            }

    succeeded = len([r for r in results if r.status == "ok"])
    failed = len(results) - succeeded

    avg_scores = {
        "readability": round(statistics.mean([r.scores.readability_score for r in results]) if results else 0.0, 2),
        "engagement": round(statistics.mean([r.scores.engagement_score for r in results]) if results else 0.0, 2),
        "structure": round(statistics.mean([r.scores.structure_score for r in results]) if results else 0.0, 2),
        "uniqueness": round(statistics.mean([r.scores.uniqueness_score for r in results]) if results else 0.0, 2),
        "overall": round(statistics.mean([r.scores.overall_quality for r in results]) if results else 0.0, 2),
    }

    duration = time.time() - started
    timestamp = datetime.utcnow().isoformat()
    logger.info(
        "Batch %s processed %s items in %.1fs (success=%s, failed=%s)",
        batch_id,
        len(results),
        duration,
        succeeded,
        failed,
    )

    return BatchReport(
        batch_id=batch_id,
        start_id=station_ids[0],
        end_id=station_ids[-1],
        processed=len(results),
        succeeded=succeeded,
        failed=failed,
        duration_seconds=round(duration, 2),
        timestamp=timestamp,
        average_scores=avg_scores,
        results=results,
        errors=errors,
    )


# Dashboard and API updates ---------------------------------------------------

def quality_trend_direction(values: List[float]) -> str:
    if len(values) < 2:
        return "steady"
    delta = values[-1] - values[-2]
    if delta > 0.5:
        return "improving"
    if delta < -0.5:
        return "declining"
    return "steady"


def update_ecosystem_api(api_path: Path, aggregate: AggregateStats) -> None:
    api_data = load_json(api_path, {})
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    averages = aggregate.averages()
    quality_score = averages["overall"]
    trend = quality_trend_direction([b["averages"]["overall"] for b in aggregate.batches])

    api_data.setdefault("data", {}).setdefault("quality_metrics", {})
    api_data["data"]["quality_metrics"]["content_quality_score"] = quality_score
    api_data["data"]["quality_metrics"]["quality_trend"] = trend
    api_data["data"]["quality_metrics"]["last_updated"] = now
    api_data["data"]["quality_metrics"]["drift_fragments_analyzed"] = aggregate.total_processed

    api_data["timestamp"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    api_data["data"]["timestamp"] = now
    save_json(api_path, api_data)


def update_dashboard(dashboard_path: Path, aggregate: AggregateStats) -> None:
    if not dashboard_path.exists():
        return
    html = dashboard_path.read_text()
    averages = aggregate.averages()
    quality_score = averages["overall"]
    analyzed = aggregate.total_processed
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Update content quality score and progress bar width
    html = re.sub(
        r"(Content Quality Score [^<]*</div>\s*<div class=\"metric-value [^\"]+\">)([^<]+)",
        rf"\g<1>{quality_score:.2f}/100",
        html,
        count=1,
        flags=re.MULTILINE,
    )
    html = re.sub(
        r'progress-fill" style="width: [0-9.]+%',
        f'progress-fill" style="width: {quality_score:.2f}%',
        html,
        count=1,
    )

    # Update Last Updated timestamp
    html = re.sub(
        r"(Last Updated: )[\d\-:\s]+",
        rf"\g<1>{timestamp_str}",
        html,
        count=1,
    )

    # Inject analyzed count into Drift alert if present
    html = re.sub(
        r"(Scale content quality analysis to 1,000\+ Drift fragments</strong><br>\s*).*?<small>",
        rf"\g<1>Analyzed {analyzed} fragments via scale_drift_analysis.py<br><small>",
        html,
        count=1,
        flags=re.DOTALL,
    )

    dashboard_path.write_text(html)


def create_visualizations(output_dir: Path, aggregate: AggregateStats) -> None:
    if not plt or not aggregate.batches:
        return
    trend_path = output_dir / "drift_quality_trend.png"
    batch_ids = [b["batch_id"] for b in aggregate.batches]
    overall_scores = [b["averages"]["overall"] for b in aggregate.batches]
    readability_scores = [b["averages"]["readability"] for b in aggregate.batches]

    plt.figure(figsize=(8, 4))
    plt.plot(batch_ids, overall_scores, marker="o", label="Overall Quality")
    plt.plot(batch_ids, readability_scores, marker="o", label="Readability")
    plt.title("Drift Quality Trend (per batch)")
    plt.xlabel("Batch ID")
    plt.ylabel("Score")
    plt.ylim(0, 100)
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(trend_path, dpi=150)
    plt.close()


# Progress reporting ----------------------------------------------------------

def estimate_eta(start_time: float, processed: int, total: int) -> str:
    if processed == 0:
        return "estimating..."
    rate = processed / max(1e-6, (time.time() - start_time))
    remaining = total - processed
    eta_seconds = remaining / max(rate, 1e-6)
    minutes, seconds = divmod(int(eta_seconds), 60)
    return f"{minutes}m {seconds}s remaining"


# CLI -------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scale Drift content quality analysis to 1,000+ fragments.")
    parser.add_argument("--start-id", type=int, default=1, help="Starting station ID (inclusive).")
    parser.add_argument("--end-id", type=int, default=1000, help="Ending station ID (inclusive).")
    parser.add_argument("--batch-size", type=int, default=100, help="Number of fragments per batch.")
    parser.add_argument("--resume", action="store_true", help="Resume from last processed ID if progress exists.")
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR), help="Output directory for reports.")
    parser.add_argument("--api-base", type=str, default=None, help="Optional Drift API base URL to fetch real data.")
    parser.add_argument("--timeout", type=int, default=10, help="API timeout in seconds.")
    parser.add_argument("--max-attempts", type=int, default=3, help="Max retry attempts for API calls.")
    parser.add_argument("--backoff", type=float, default=1.5, help="Exponential backoff factor between retries.")
    parser.add_argument("--max-workers", type=int, default=8, help="Parallel workers for fragment analysis.")
    return parser.parse_args()


# Main orchestration ----------------------------------------------------------

def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    logger = setup_logging(output_dir)

    cache = load_cache(output_dir)
    progress = load_progress(output_dir)
    aggregate = load_aggregate(output_dir)

    start_id = args.start_id
    if args.resume and progress.get("last_processed_id"):
        start_id = max(start_id, progress["last_processed_id"] + 1)

    end_id = args.end_id
    station_ids = [sid for sid in range(start_id, end_id + 1)]
    if not station_ids:
        logger.info("No station IDs to process (start=%s, end=%s).", start_id, end_id)
        return

    batch_size = max(1, args.batch_size)
    batches = [station_ids[i : i + batch_size] for i in range(0, len(station_ids), batch_size)]

    logger.info(
        "Starting Drift analysis from %s to %s (batch size: %s, resume: %s, api_base: %s)",
        start_id,
        end_id,
        batch_size,
        args.resume,
        args.api_base or "simulate",
    )

    start_time = time.time()
    processed_total = 0

    existing_batches = len(aggregate.batches)

    for idx, batch_ids in enumerate(batches, start=1):
        report = run_batch(
            batch_id=existing_batches + idx,
            station_ids=batch_ids,
            api_base=args.api_base,
            timeout=args.timeout,
            max_attempts=args.max_attempts,
            backoff_factor=args.backoff,
            cache=cache,
            logger=logger,
            max_workers=args.max_workers,
        )

        aggregate.update(report)
        save_cache(output_dir, cache)
        save_aggregate(output_dir, aggregate)

        batch_report_path = output_dir / f"batch_{report.start_id}_{report.end_id}.json"
        save_json(
            batch_report_path,
            {
                "batch_id": report.batch_id,
                "start_id": report.start_id,
                "end_id": report.end_id,
                "timestamp": report.timestamp,
                "duration_seconds": report.duration_seconds,
                "processed": report.processed,
                "succeeded": report.succeeded,
                "failed": report.failed,
                "average_scores": report.average_scores,
                "results": [
                    {
                        "station_id": r.station_id,
                        "text_preview": r.text_preview,
                        "scores": r.scores.__dict__,
                        "status": r.status,
                        "error": r.error,
                        "metadata": r.metadata,
                    }
                    for r in report.results
                ],
                "errors": report.errors,
            },
        )

        processed_total += report.processed
        eta = estimate_eta(start_time, processed_total, len(station_ids))
        logger.info(
            "Progress: %s/%s fragments (ETA: %s)",
            processed_total,
            len(station_ids),
            eta,
        )

        save_progress(
            output_dir,
            {
                "last_processed_id": report.end_id,
                "total_processed": processed_total,
                "total_success": aggregate.total_success,
                "total_failed": aggregate.total_failed,
                "last_updated": datetime.utcnow().isoformat(),
            },
        )

    # Integrations
    update_ecosystem_api(DEFAULT_API, aggregate)
    update_dashboard(DEFAULT_DASHBOARD, aggregate)
    create_visualizations(output_dir, aggregate)

    logger.info(
        "Completed Drift analysis. Total processed: %s (success=%s, failed=%s).",
        aggregate.total_processed,
        aggregate.total_success,
        aggregate.total_failed,
    )
    logger.info("Aggregate averages: %s", aggregate.averages())


if __name__ == "__main__":
    main()
