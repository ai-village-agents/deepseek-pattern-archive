import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple


ROOT = Path(__file__).parent
AGGREGATE_RESULTS_PATH = ROOT / "drift_quality_reports" / "aggregate_results.json"
ECOSYSTEM_METRICS_PATH = ROOT / "ecosystem_metrics_api.json"
DASHBOARD_HTML_PATH = ROOT / "quality_monitoring_dashboard_real_time.html"
SUMMARY_OUTPUT_PATH = ROOT / "drift_quality_summary_110_fragments.json"

BASELINE_SCORE = 61.76  # Phase 4 Week 2 baseline


@dataclass
class QualityMetrics:
    overall: float
    readability: float
    engagement: float
    structure: float
    uniqueness: float
    category_counts: Dict[str, int]
    category_percentages: Dict[str, float]
    trend: str
    delta: float


def load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Missing expected file: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, payload: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def categorize(score: float) -> str:
    if score is None:
        return "unknown"
    if score < 50:
        return "bronze"
    if score < 65:
        return "silver"
    if score < 80:
        return "gold"
    return "platinum"


def compute_category_distribution(batches: List[dict], total: int) -> Tuple[Dict[str, int], Dict[str, float]]:
    counts = {"bronze": 0, "silver": 0, "gold": 0, "platinum": 0, "unknown": 0}
    for batch in batches or []:
        score = None
        if isinstance(batch, dict):
            score = batch.get("averages", {}).get("overall")
        category = categorize(score)
        succeeded = batch.get("succeeded", 0) if isinstance(batch, dict) else 0
        counts[category] = counts.get(category, 0) + max(int(succeeded), 0)

    total_for_pct = total or sum(counts.values()) or 1
    percentages = {k: round((v / total_for_pct) * 100, 2) for k, v in counts.items()}
    return counts, percentages


def compute_quality_metrics(report: dict) -> QualityMetrics:
    averages = report.get("averages", {})
    overall = round(float(averages.get("overall", 0)), 2)
    readability = round(float(averages.get("readability", 0)), 2)
    engagement = round(float(averages.get("engagement", 0)), 2)
    structure = round(float(averages.get("structure", 0)), 2)
    uniqueness = round(float(averages.get("uniqueness", 0)), 2)

    total = report.get("total_success") or report.get("total_processed") or 0
    category_counts, category_percentages = compute_category_distribution(report.get("batches", []), total)

    delta = round(overall - BASELINE_SCORE, 2)
    if delta > 0.5:
        trend = "improving"
    elif delta < -0.5:
        trend = "declining"
    else:
        trend = "stable"

    return QualityMetrics(
        overall=overall,
        readability=readability,
        engagement=engagement,
        structure=structure,
        uniqueness=uniqueness,
        category_counts=category_counts,
        category_percentages=category_percentages,
        trend=trend,
        delta=delta,
    )


def update_ecosystem_metrics(metrics: QualityMetrics, report: dict, timestamp_human: str, timestamp_iso: str) -> None:
    payload = load_json(ECOSYSTEM_METRICS_PATH)
    data = payload.setdefault("data", {})
    quality = data.setdefault("quality_metrics", {})

    total_processed = report.get("total_processed") or report.get("total_success") or 0

    payload["timestamp"] = timestamp_iso
    data["timestamp"] = timestamp_human
    quality["content_quality_score"] = metrics.overall
    quality["drift_quality_score"] = metrics.overall
    quality["quality_trend"] = metrics.trend
    quality["last_updated"] = timestamp_human
    quality["drift_fragments_analyzed"] = total_processed

    # Keep related alert copy in sync with the analyzed count.
    for alert in data.get("alerts_and_recommendations", []):
        if alert.get("title", "").lower().startswith("scale content quality analysis"):
            alert["description"] = (
                f"Current analysis covers {total_processed} fragments, but The Drift has 3,393 stations"
            )

    save_json(ECOSYSTEM_METRICS_PATH, payload)


def update_dashboard(metrics: QualityMetrics, timestamp_human: str, report: dict) -> None:
    if not DASHBOARD_HTML_PATH.exists():
        return

    html = DASHBOARD_HTML_PATH.read_text(encoding="utf-8")

    # Update the displayed quality score and progress bar.
    html = re.sub(
        r'(Content Quality Score [^<]*</div>\s*<div class="metric-value[^>]*">)\s*\d+(?:\.\d+)?(/100)',
        rf"\g<1>{metrics.overall}\2",
        html,
        flags=re.IGNORECASE | re.DOTALL,
        count=1,
    )
    html = re.sub(
        r'(Content Quality Score [^<]*?progress-fill" style="width:\s*)\d+(?:\.\d+)?%',
        rf"\g<1>{metrics.overall}%",
        html,
        flags=re.IGNORECASE | re.DOTALL,
        count=1,
    )

    # Update timestamp at top of dashboard.
    html = re.sub(
        r'(<div class="timestamp">)\s*[^<]*(</div>)',
        rf"\1Last Updated: {timestamp_human}\2",
        html,
        flags=re.IGNORECASE,
        count=1,
    )
    html = re.sub(
        r"document\.querySelector\('\.timestamp'\)\.textContent\s*=\s*[^;]+;",
        "document.querySelector('.timestamp').textContent = 'Last Updated: ' + timestamp;",
        html,
        flags=re.IGNORECASE,
        count=1,
    )

    # Ensure Drift fragments analyzed count is reflected in alert copy.
    total_processed = report.get("total_processed") or report.get("total_success") or 0
    html = re.sub(
        r"(Analyzed\s*)\d+(?:,\d+)?(\s*fragments)",
        rf"\g<1>{total_processed}\2",
        html,
        flags=re.IGNORECASE,
    )

    # Add a short note about the scaled analysis in alerts if not present.
    note = "<em>Scaled analysis refreshed with 110 Drift fragments; next target 1,000+.</em>"
    if note not in html:
        html = html.replace(
            "Analyzed",
            f"{note}<br>Analyzed",
            1,
        )

    DASHBOARD_HTML_PATH.write_text(html, encoding="utf-8")


def build_recommendations(metrics: QualityMetrics) -> List[str]:
    recs = []
    if metrics.engagement < 35:
        recs.append("Increase narrative hooks in early paragraphs to lift engagement above 35.")
    if metrics.readability < 65:
        recs.append("Simplify sentence structures and add headings to raise readability toward 65.")
    if metrics.structure < 50:
        recs.append("Apply consistent section formatting and summaries to improve structure.")
    if metrics.uniqueness < 60:
        recs.append("Introduce unique artifacts and cross-world references to boost uniqueness.")
    if metrics.overall < BASELINE_SCORE:
        recs.append("Prioritize high-impact Drift fragments for revision to recover baseline quality.")
    return recs or ["Maintain current cadence; no critical blockers detected."]


def write_summary(metrics: QualityMetrics, report: dict, timestamp_human: str, timestamp_iso: str) -> None:
    summary = {
        "analysis_timestamp": timestamp_iso,
        "total_fragments_analyzed": report.get("total_processed") or report.get("total_success") or 0,
        "quality_scores": {
            "overall": metrics.overall,
            "readability": metrics.readability,
            "engagement": metrics.engagement,
            "structure": metrics.structure,
            "uniqueness": metrics.uniqueness,
        },
        "category_distribution": {
            "counts": metrics.category_counts,
            "percentages": metrics.category_percentages,
        },
        "trend": {
            "current_score": metrics.overall,
            "baseline_score": BASELINE_SCORE,
            "delta": metrics.delta,
            "direction": metrics.trend,
        },
        "improvement_recommendations": build_recommendations(metrics),
        "ecosystem_comparison": {
            "baseline_phase": "Phase 4 Week 2",
            "baseline_score": BASELINE_SCORE,
            "current_score": metrics.overall,
            "change": metrics.delta,
            "status": metrics.trend,
        },
        "notes": [
            "Maintains existing Pattern Archive monitoring structure.",
            "Auto-generated via update_drift_quality_metrics.py",
        ],
    }

    save_json(SUMMARY_OUTPUT_PATH, summary)


def main() -> None:
    try:
        report = load_json(AGGREGATE_RESULTS_PATH)
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Failed to load aggregate results: {exc}")
        return

    metrics = compute_quality_metrics(report)

    now = datetime.now(timezone.utc)
    timestamp_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    timestamp_human = now.strftime("%Y-%m-%d %H:%M:%S")

    try:
        update_ecosystem_metrics(metrics, report, timestamp_human, timestamp_iso)
    except Exception as exc:
        print(f"Failed to update ecosystem_metrics_api.json: {exc}")

    try:
        update_dashboard(metrics, timestamp_human, report)
    except Exception as exc:
        print(f"Failed to update dashboard: {exc}")

    try:
        write_summary(metrics, report, timestamp_human, timestamp_iso)
    except Exception as exc:
        print(f"Failed to write summary: {exc}")

    print(
        f"Updated metrics: score={metrics.overall}, trend={metrics.trend}, "
        f"delta={metrics.delta}, fragments={report.get('total_processed', 'n/a')}"
    )


if __name__ == "__main__":
    main()
