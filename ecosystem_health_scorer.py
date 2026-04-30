#!/usr/bin/env python3
"""
Ecosystem Health Scoring for the 13-world AI Village.

This module reads `world-metrics-timeseries.json` snapshots and produces
per-world and ecosystem-wide health scores across four pillars:
Connectivity, Performance, Growth, and Engagement. Scores are computed on
a 0-100 scale with configurable weighting, thresholds, and formulas. The
module is designed for real-time monitoring and lightweight visualization
in terminal environments.
"""

from __future__ import annotations

import json
import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Tuple

DATA_PATH = Path(__file__).with_name("world-metrics-timeseries.json")


# ---------------------------------------------------------------------------
# Configuration data structures
# ---------------------------------------------------------------------------


@dataclass
class MetricWeights:
    connectivity: float = 0.30
    performance: float = 0.25
    growth: float = 0.25
    engagement: float = 0.20

    def normalized(self) -> "MetricWeights":
        total = (
            self.connectivity
            + self.performance
            + self.growth
            + self.engagement
        )
        if total == 0:
            return MetricWeights(0.25, 0.25, 0.25, 0.25)
        return MetricWeights(
            connectivity=self.connectivity / total,
            performance=self.performance / total,
            growth=self.growth / total,
            engagement=self.engagement / total,
        )


@dataclass
class Thresholds:
    healthy: float = 80.0
    warning: float = 60.0
    critical: float = 40.0


@dataclass
class MetricFormulas:
    connectivity: Optional[Callable[[float], float]] = None
    performance: Optional[Callable[[Optional[float]], float]] = None
    growth: Optional[Callable[[float], float]] = None
    engagement: Optional[Callable[[float], float]] = None


@dataclass
class HealthConfig:
    weights: MetricWeights = field(default_factory=MetricWeights)
    thresholds: Thresholds = field(default_factory=Thresholds)
    formulas: MetricFormulas = field(default_factory=MetricFormulas)
    degradation_drop_threshold: float = 15.0  # composite drop to flag degradation
    anomaly_stddev_factor: float = 2.5  # std-dev multiplier for anomaly detection
    smoothing_window: int = 3  # number of recent points to smooth availability


# ---------------------------------------------------------------------------
# Core domain data structures
# ---------------------------------------------------------------------------


@dataclass
class WorldPoint:
    timestamp: datetime
    ok: bool
    response_ms: Optional[float]
    content_size: Optional[int]
    keyword_hits: Dict[str, int]
    engagement_signal: float = 0.0


@dataclass
class ScoreBreakdown:
    connectivity: float
    performance: float
    growth: float
    engagement: float
    composite: float


@dataclass
class HealthSnapshot:
    timestamp: datetime
    score: ScoreBreakdown


@dataclass
class Anomaly:
    timestamp: datetime
    metric: str
    detail: str
    severity: str  # "warning" or "critical"


@dataclass
class WorldHealthProfile:
    world_id: str
    name: str
    type: Optional[str]
    snapshots: List[HealthSnapshot] = field(default_factory=list)
    anomalies: List[Anomaly] = field(default_factory=list)

    def latest(self) -> Optional[HealthSnapshot]:
        return self.snapshots[-1] if self.snapshots else None


@dataclass
class EcosystemAggregate:
    snapshots: List[HealthSnapshot] = field(default_factory=list)
    anomalies: List[Anomaly] = field(default_factory=list)

    def latest(self) -> Optional[HealthSnapshot]:
        return self.snapshots[-1] if self.snapshots else None


# ---------------------------------------------------------------------------
# Health scoring logic
# ---------------------------------------------------------------------------


class HealthScoreCalculator:
    def __init__(self, config: Optional[HealthConfig] = None) -> None:
        self.config = config or HealthConfig()

    # -- Public API -----------------------------------------------------

    def load_snapshots(self, path: Path = DATA_PATH) -> List[dict]:
        """Load and time-sort world metrics snapshots."""
        raw = json.loads(path.read_text())
        raw.sort(key=lambda s: s["timestamp"])
        return raw

    def score_all(
        self, snapshots: List[dict]
    ) -> Tuple[Dict[str, WorldHealthProfile], EcosystemAggregate]:
        """Produce world-specific profiles and ecosystem aggregate."""
        world_series = self._build_world_series(snapshots)
        profiles: Dict[str, WorldHealthProfile] = {}

        # Build world-level profiles
        for world_id, series in world_series.items():
            profile = WorldHealthProfile(
                world_id=world_id, name=series["name"], type=series["type"]
            )
            profile.snapshots = self._score_world_series(series["points"])
            profile.anomalies = self._detect_anomalies(profile.snapshots)
            profiles[world_id] = profile

        # Ecosystem aggregate (average per timestamp)
        aggregate = self._aggregate_ecosystem(profiles)
        return profiles, aggregate

    def generate_health_trends(
        self, profile: WorldHealthProfile
    ) -> List[HealthSnapshot]:
        """Expose health trends over time (already stored in profile)."""
        return profile.snapshots

    def identify_anomalies(
        self, profile: WorldHealthProfile
    ) -> List[Anomaly]:
        """Expose anomalies for a given profile."""
        return profile.anomalies

    # Visualization helpers --------------------------------------------

    def render_dashboard(
        self,
        profiles: Dict[str, WorldHealthProfile],
        ecosystem: EcosystemAggregate,
        limit: int = 13,
    ) -> str:
        """Return a textual dashboard of current scores."""
        lines = []
        eco_latest = ecosystem.latest()
        if eco_latest:
            lines.append(
                f"Ecosystem composite: {eco_latest.score.composite:.1f} "
                f"(Conn {eco_latest.score.connectivity:.1f} | "
                f"Perf {eco_latest.score.performance:.1f} | "
                f"Growth {eco_latest.score.growth:.1f} | "
                f"Eng {eco_latest.score.engagement:.1f})"
            )
            lines.append("")
        lines.append("World health (latest snapshots):")
        sorted_profiles = sorted(
            profiles.values(),
            key=lambda p: (p.latest().score.composite if p.latest() else 0),
            reverse=True,
        )
        for profile in sorted_profiles[:limit]:
            snap = profile.latest()
            if not snap:
                continue
            status = self._categorize(snap.score.composite)
            lines.append(
                f"- {profile.name} [{profile.world_id}]: "
                f"{snap.score.composite:.1f} ({status}) "
                f"Conn {snap.score.connectivity:.1f}, "
                f"Perf {snap.score.performance:.1f}, "
                f"Growth {snap.score.growth:.1f}, "
                f"Eng {snap.score.engagement:.1f}"
            )
        return "\n".join(lines)

    def render_trend_chart(
        self, profile: WorldHealthProfile, width: int = 40
    ) -> str:
        """Render an ASCII trend chart for composite scores."""
        if not profile.snapshots:
            return "(no data)"
        values = [snap.score.composite for snap in profile.snapshots]
        timestamps = [snap.timestamp for snap in profile.snapshots]
        max_val = max(values) or 1
        bars = []
        for ts, val in zip(timestamps, values):
            bar_len = int((val / max_val) * width)
            bars.append(f"{ts.isoformat(timespec='minutes')}: {'#' * bar_len} {val:.1f}")
        return "\n".join(bars)

    def render_comparative_analysis(
        self, profiles: Dict[str, WorldHealthProfile]
    ) -> str:
        """Show side-by-side comparisons of the latest scores."""
        lines = ["Comparative analysis (top performers by metric):"]
        metrics = ["connectivity", "performance", "growth", "engagement", "composite"]
        for metric in metrics:
            ranked = self._rank_by_metric(profiles, metric)
            names = ", ".join(f"{name} {score:.1f}" for name, score in ranked[:5])
            lines.append(f"- {metric.capitalize()}: {names}")
        return "\n".join(lines)

    def plot_trends(  # pragma: no cover - optional matplotlib helper
        self, profile: WorldHealthProfile, out_path: Path
    ) -> Optional[Path]:
        """Optionally persist a matplotlib trend chart if available."""
        try:
            import matplotlib.pyplot as plt
        except Exception:
            return None

        times = [snap.timestamp for snap in profile.snapshots]
        values = [snap.score.composite for snap in profile.snapshots]
        plt.figure(figsize=(8, 3))
        plt.plot(times, values, marker="o", color="tab:blue")
        plt.title(f"{profile.name} composite health")
        plt.ylabel("Score (0-100)")
        plt.ylim(0, 100)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(out_path, dpi=200)
        plt.close()
        return out_path

    # ------------------------------------------------------------------
    # Internal scoring mechanics
    # ------------------------------------------------------------------

    def _build_world_series(self, snapshots: List[dict]) -> Dict[str, dict]:
        """Align world points across snapshots and compute engagement signals."""
        world_series: Dict[str, dict] = {}
        for snap in snapshots:
            ts = datetime.fromisoformat(snap["timestamp"])
            world_list = snap.get("worlds", [])
            keyword_sets = {
                w["id"]: set((w.get("content") or {}).get("keyword_hits", {}).keys())
                for w in world_list
            }
            for world in world_list:
                world_id = world["id"]
                record = world_series.setdefault(
                    world_id,
                    {
                        "name": world.get("name", world_id),
                        "type": world.get("type"),
                        "points": [],
                    },
                )
                content = world.get("content") or {}
                keyword_hits = content.get("keyword_hits") or {}
                engagement_signal = self._estimate_engagement(
                    world, keyword_sets, world_list
                )
                record["points"].append(
                    WorldPoint(
                        timestamp=ts,
                        ok=bool(world.get("ok")),
                        response_ms=world.get("response_ms"),
                        content_size=content.get("content_size"),
                        keyword_hits=keyword_hits,
                        engagement_signal=engagement_signal,
                    )
                )

        # Ensure chronological order per world
        for series in world_series.values():
            series["points"].sort(key=lambda p: p.timestamp)
        return world_series

    def _estimate_engagement(
        self, world: dict, keyword_sets: Dict[str, set], world_list: List[dict]
    ) -> float:
        """
        Estimate engagement using explicit engagement metrics when provided,
        otherwise approximate via keyword overlap (cross-world resonance).
        """
        engagement = world.get("engagement") or {}
        explicit = float(engagement.get("cross_world_marks", 0)) + float(
            engagement.get("interactions", 0)
        )
        if explicit:
            return explicit

        world_id = world["id"]
        current_keywords = keyword_sets.get(world_id, set())
        if not current_keywords:
            return 0.0

        overlap_score = 0.0
        for other in world_list:
            if other["id"] == world_id:
                continue
            other_keywords = keyword_sets.get(other["id"], set())
            if not other_keywords:
                continue
            overlap = len(current_keywords & other_keywords)
            if overlap:
                overlap_score += overlap
        return overlap_score

    def _score_world_series(self, points: List[WorldPoint]) -> List[HealthSnapshot]:
        """Compute metric + composite scores for a world's chronological points."""
        weights = self.config.weights.normalized()
        snapshots: List[HealthSnapshot] = []
        availability_window: List[bool] = []
        prev_point: Optional[WorldPoint] = None
        for point in points:
            # Connectivity: windowed availability percentage
            availability_window.append(point.ok)
            if len(availability_window) > self.config.smoothing_window:
                availability_window.pop(0)
            availability_pct = (
                sum(1 for v in availability_window if v) / len(availability_window) * 100
            )

            # Growth: velocity from prior content/keyword deltas
            growth_velocity = 0.0
            if prev_point:
                delta_minutes = max(
                    (point.timestamp - prev_point.timestamp).total_seconds() / 60.0, 1e-9
                )
                content_delta = (point.content_size or 0) - (prev_point.content_size or 0)
                keyword_delta = sum(point.keyword_hits.values()) - sum(
                    prev_point.keyword_hits.values()
                )
                growth_velocity = (content_delta + keyword_delta) / delta_minutes
            prev_point = point

            score = ScoreBreakdown(
                connectivity=self._score_connectivity(availability_pct),
                performance=self._score_performance(point.response_ms),
                growth=self._score_growth(growth_velocity),
                engagement=self._score_engagement(point.engagement_signal),
                composite=0.0,  # filled below
            )
            score.composite = self._weighted_composite(score, weights)
            snapshots.append(HealthSnapshot(timestamp=point.timestamp, score=score))
        return snapshots

    def _weighted_composite(self, score: ScoreBreakdown, weights: MetricWeights) -> float:
        composite = (
            score.connectivity * weights.connectivity
            + score.performance * weights.performance
            + score.growth * weights.growth
            + score.engagement * weights.engagement
        )
        return max(0.0, min(100.0, composite))

    # Metric scoring functions -----------------------------------------

    def _score_connectivity(self, availability_pct: float) -> float:
        if self.config.formulas.connectivity:
            return self._clamp(self.config.formulas.connectivity(availability_pct))
        return self._clamp(availability_pct)

    def _score_performance(self, response_ms: Optional[float]) -> float:
        if self.config.formulas.performance:
            return self._clamp(self.config.formulas.performance(response_ms))
        if response_ms is None:
            return 50.0
        if response_ms <= 150:
            return 100.0
        # Logarithmic decay so long-tail latency does not dominate
        worst = 2500.0
        normalized = math.log1p(min(response_ms, worst) - 150) / math.log1p(worst - 150)
        return self._clamp(100 * (1 - normalized))

    def _score_growth(self, velocity: float) -> float:
        if self.config.formulas.growth:
            return self._clamp(self.config.formulas.growth(velocity))
        if velocity <= 0:
            return 40.0 + max(-20.0, velocity / 50.0)  # small penalty for regressions
        # Scale with diminishing returns
        scaled = 100 * (1 - math.exp(-velocity / 500.0))
        return self._clamp(scaled)

    def _score_engagement(self, signal: float) -> float:
        if self.config.formulas.engagement:
            return self._clamp(self.config.formulas.engagement(signal))
        if signal <= 0:
            return 30.0
        scaled = 100 * (1 - math.exp(-signal / 5.0))
        return self._clamp(scaled)

    # Aggregation and anomaly detection --------------------------------

    def _aggregate_ecosystem(
        self, profiles: Dict[str, WorldHealthProfile]
    ) -> EcosystemAggregate:
        """Average scores across worlds per timestamp."""
        # Map timestamp -> list of score breakdowns
        aggregator: Dict[datetime, List[ScoreBreakdown]] = {}
        for profile in profiles.values():
            for snap in profile.snapshots:
                aggregator.setdefault(snap.timestamp, []).append(snap.score)

        snapshots: List[HealthSnapshot] = []
        for ts in sorted(aggregator):
            scores = aggregator[ts]
            avg_score = ScoreBreakdown(
                connectivity=self._mean([s.connectivity for s in scores]),
                performance=self._mean([s.performance for s in scores]),
                growth=self._mean([s.growth for s in scores]),
                engagement=self._mean([s.engagement for s in scores]),
                composite=self._mean([s.composite for s in scores]),
            )
            snapshots.append(HealthSnapshot(timestamp=ts, score=avg_score))
        return EcosystemAggregate(snapshots=snapshots)

    def _detect_anomalies(self, snapshots: List[HealthSnapshot]) -> List[Anomaly]:
        """Flag degradation patterns and metric spikes."""
        anomalies: List[Anomaly] = []
        if len(snapshots) < 3:
            return anomalies

        composites = [snap.score.composite for snap in snapshots]
        mean_comp = statistics.mean(composites)
        std_comp = statistics.pstdev(composites) or 1.0
        drop_threshold = self.config.degradation_drop_threshold

        for prev, curr in zip(snapshots, snapshots[1:]):
            delta = curr.score.composite - prev.score.composite
            if delta <= -drop_threshold:
                anomalies.append(
                    Anomaly(
                        timestamp=curr.timestamp,
                        metric="composite",
                        detail=f"Composite dropped {delta:.1f} points",
                        severity="critical" if delta <= -(drop_threshold * 1.5) else "warning",
                    )
                )

        for metric in ("connectivity", "performance", "growth", "engagement"):
            series = [getattr(snap.score, metric) for snap in snapshots]
            mean_val = statistics.mean(series)
            std_val = statistics.pstdev(series) or 1.0
            for snap in snapshots:
                if abs(getattr(snap.score, metric) - mean_val) > self.config.anomaly_stddev_factor * std_val:
                    anomalies.append(
                        Anomaly(
                            timestamp=snap.timestamp,
                            metric=metric,
                            detail=f"{metric} deviated from mean by >{self.config.anomaly_stddev_factor}σ",
                            severity="warning",
                        )
                    )
        return anomalies

    # Ranking & categorization -----------------------------------------

    def _rank_by_metric(
        self, profiles: Dict[str, WorldHealthProfile], metric: str
    ) -> List[Tuple[str, float]]:
        rows = []
        for profile in profiles.values():
            snap = profile.latest()
            if not snap:
                continue
            rows.append((profile.name, getattr(snap.score, metric)))
        rows.sort(key=lambda r: r[1], reverse=True)
        return rows

    def _categorize(self, score: float) -> str:
        thresholds = self.config.thresholds
        if score >= thresholds.healthy:
            return "Healthy"
        if score >= thresholds.warning:
            return "Warning"
        if score >= thresholds.critical:
            return "At Risk"
        return "Critical"

    # Utility helpers ---------------------------------------------------

    @staticmethod
    def _mean(values: Iterable[float]) -> float:
        vals = list(values)
        return statistics.mean(vals) if vals else 0.0

    @staticmethod
    def _clamp(value: float) -> float:
        return max(0.0, min(100.0, value))


# ---------------------------------------------------------------------------
# CLI utility for quick inspection
# ---------------------------------------------------------------------------


def save_health_scores_to_json(
    health_scores: Tuple[Dict[str, WorldHealthProfile], EcosystemAggregate],
    filename: str = "health_scores.json",
) -> Path:
    """
    Persist full health score data, including snapshots, metrics, and metadata.
    """
    profiles, ecosystem = health_scores

    def snapshot_to_dict(snap: HealthSnapshot) -> dict:
        return {
            "timestamp": snap.timestamp.isoformat(),
            "scores": {
                "connectivity": snap.score.connectivity,
                "performance": snap.score.performance,
                "growth": snap.score.growth,
                "engagement": snap.score.engagement,
                "composite": snap.score.composite,
            },
        }

    def anomaly_to_dict(anomaly: Anomaly) -> dict:
        return {
            "timestamp": anomaly.timestamp.isoformat(),
            "metric": anomaly.metric,
            "detail": anomaly.detail,
            "severity": anomaly.severity,
        }

    worlds_payload = []
    for profile in profiles.values():
        latest = profile.latest()
        worlds_payload.append(
            {
                "world_id": profile.world_id,
                "name": profile.name,
                "type": profile.type,
                "latest_composite": latest.score.composite if latest else None,
                "snapshots": [snapshot_to_dict(s) for s in profile.snapshots],
                "anomalies": [anomaly_to_dict(a) for a in profile.anomalies],
            }
        )

    ecosystem_payload = {
        "snapshots": [snapshot_to_dict(s) for s in ecosystem.snapshots],
        "anomalies": [anomaly_to_dict(a) for a in ecosystem.anomalies],
        "latest_composite": (
            ecosystem.latest().score.composite if ecosystem.latest() else None
        ),
    }

    metadata = {
        "world_count": len(profiles),
        "ecosystem_snapshot_count": len(ecosystem.snapshots),
        "world_snapshot_total": sum(len(p.snapshots) for p in profiles.values()),
        "generator": "ecosystem_health_scorer",
        "version": 1,
    }

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "metadata": metadata,
        "ecosystem": ecosystem_payload,
        "worlds": worlds_payload,
    }

    out_path = Path(filename)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2))
    return out_path


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Compute ecosystem health scores for the 13-world AI Village."
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DATA_PATH,
        help="Path to world-metrics-timeseries.json",
    )
    parser.add_argument(
        "--trend",
        action="store_true",
        help="Print per-world composite trend charts",
    )
    parser.add_argument(
        "--output-json",
        action="store_true",
        help="Persist full health scores to JSON (including snapshots and metadata)",
    )
    parser.add_argument(
        "--output-file",
        default="health_scores.json",
        help="Path to write JSON output when --output-json is enabled",
    )
    args = parser.parse_args()

    calculator = HealthScoreCalculator()
    snapshots = calculator.load_snapshots(args.data)
    profiles, ecosystem = calculator.score_all(snapshots)

    print(calculator.render_dashboard(profiles, ecosystem))
    print()
    print(calculator.render_comparative_analysis(profiles))

    if args.trend:
        print("\nComposite trends:")
        for profile in profiles.values():
            print(f"\n{profile.name}")
            print(calculator.render_trend_chart(profile))

    if args.output_json:
        out_path = save_health_scores_to_json((profiles, ecosystem), args.output_file)
        print(f"\nSaved JSON output to {out_path}")


if __name__ == "__main__":
    main()
