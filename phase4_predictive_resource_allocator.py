#!/usr/bin/env python3
"""
Phase 4: Predictive Resource Allocator for the 13-world ecosystem.

Features
--------
1) Time-series forecasting (Prophet or ARIMA with graceful fallbacks) on historical
   performance metrics to anticipate load and latency risk.
2) Load pattern analysis to surface peak usage windows and bottlenecked worlds.
3) Resource optimization recommendations spanning CDN allocation, cache strategies,
   and compute scaling for each world.
4) Cross-world dependency analysis using response-time correlations to focus effort
   where shared infrastructure pressure is highest.
5) Cost-benefit scoring that estimates expected performance improvement per unit
   resource invested.
6) Automated alerting for forecasted threshold breaches.

Running the module writes an actionable JSON plan to disk and also prints a compact
summary to stdout. All outputs are JSON-serializable and safe to feed into dashboards.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

# Optional forecasting backends
try:  # Prophet is preferred when available
    from prophet import Prophet  # type: ignore

    HAVE_PROPHET = True
except Exception:  # pragma: no cover - optional dependency
    HAVE_PROPHET = False

try:  # Lightweight ARIMA fallback
    from statsmodels.tsa.arima.model import ARIMA  # type: ignore

    HAVE_ARIMA = True
except Exception:  # pragma: no cover - optional dependency
    HAVE_ARIMA = False

# Paths
DEFAULT_HISTORY_PATH = Path("world-metrics-timeseries.json")
DEFAULT_OUTPUT_PATH = Path("phase4_predictive_resource_plan.json")


@dataclass
class ForecastResult:
    world_id: str
    model_used: str
    horizon: int
    forecast: List[Dict[str, Any]]
    diagnostics: Dict[str, Any]


@dataclass
class LoadPatternSummary:
    peak_hours_utc: List[int]
    world_peaks: Dict[str, List[int]]
    bottlenecks: List[Dict[str, Any]]


@dataclass
class DependencySignal:
    dependency_centrality: List[Dict[str, Any]]
    strong_pairs: List[Dict[str, Any]]


class PredictiveResourceAllocator:
    def __init__(
        self,
        history_path: Path = DEFAULT_HISTORY_PATH,
        output_path: Path = DEFAULT_OUTPUT_PATH,
        horizon: int = 6,
        forecast_metric: str = "response_ms",
        warning_threshold_ms: int = 1500,
        critical_threshold_ms: int = 2500,
    ) -> None:
        self.history_path = history_path
        self.output_path = output_path
        self.horizon = horizon
        self.forecast_metric = forecast_metric
        self.warning_threshold_ms = warning_threshold_ms
        self.critical_threshold_ms = critical_threshold_ms

    # ------------------------------------------------------------------
    # Public entrypoints
    # ------------------------------------------------------------------
    def build_plan(self) -> Dict[str, Any]:
        history = self._load_history()
        timeseries = self._build_timeseries(history)

        forecasts = {
            world_id: self._forecast_world(world_id, samples)
            for world_id, samples in timeseries.items()
            if samples
        }

        load_patterns = self._analyze_load_patterns(timeseries)
        dependency_signal = self._cross_world_dependencies(timeseries)
        recommendations = self._recommend_resources(forecasts, load_patterns, dependency_signal)
        alerts = self._generate_alerts(forecasts)
        cost_benefit = self._cost_benefit_summary(recommendations)

        plan = {
            "generated_at": datetime.utcnow().isoformat(),
            "source_history": str(self.history_path),
            "forecast_horizon_intervals": self.horizon,
            "forecasts": {k: vars(v) for k, v in forecasts.items()},
            "load_patterns": load_patterns.__dict__,
            "dependencies": dependency_signal.__dict__,
            "recommendations": recommendations,
            "cost_benefit_summary": cost_benefit,
            "alerts": alerts,
            "models_available": {"prophet": HAVE_PROPHET, "arima": HAVE_ARIMA},
        }
        return plan

    def write_plan(self) -> Dict[str, Any]:
        plan = self.build_plan()
        self.output_path.write_text(json.dumps(plan, indent=2))
        return plan

    # ------------------------------------------------------------------
    # Loading and preprocessing
    # ------------------------------------------------------------------
    def _load_history(self) -> List[dict]:
        raw = json.loads(self.history_path.read_text())
        raw.sort(key=lambda r: r["timestamp"])
        return raw

    def _build_timeseries(self, history: List[dict]) -> Dict[str, List[Dict[str, Any]]]:
        timeseries: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for entry in history:
            ts = datetime.fromisoformat(entry["timestamp"])
            for world in entry.get("worlds", []):
                metric_val = world.get(self.forecast_metric)
                if metric_val is None:
                    continue
                timeseries[world["id"]].append(
                    {
                        "timestamp": ts,
                        self.forecast_metric: float(metric_val),
                        "ok": bool(world.get("ok", True)),
                        "content_size": (world.get("content") or {}).get("content_size"),
                    }
                )

        # Keep each series sorted and deduplicated by timestamp
        for samples in timeseries.values():
            samples.sort(key=lambda s: s["timestamp"])
        return timeseries

    # ------------------------------------------------------------------
    # Forecasting
    # ------------------------------------------------------------------
    def _forecast_world(self, world_id: str, samples: List[Dict[str, Any]]) -> ForecastResult:
        timestamps = [s["timestamp"] for s in samples]
        values = [s[self.forecast_metric] for s in samples]
        freq_seconds = self._infer_frequency_seconds(timestamps) or 3600
        future_timestamps = [
            timestamps[-1] + timedelta(seconds=freq_seconds * (i + 1))
            for i in range(self.horizon)
        ]

        model_used = "naive_mean"
        diagnostics: Dict[str, Any] = {"n_observations": len(values)}
        forecast_values: List[float] = []

        if HAVE_PROPHET:
            try:
                import pandas as pd  # Local import to avoid hard dependency

                df = pd.DataFrame({"ds": timestamps, "y": values})
                model = Prophet(
                    daily_seasonality=True,
                    weekly_seasonality=True,
                    seasonality_mode="additive",
                )
                model.fit(df)
                future_df = pd.DataFrame({"ds": future_timestamps})
                forecast_df = model.predict(future_df)
                forecast_values = forecast_df["yhat"].tolist()
                model_used = "prophet"
                diagnostics.update({"model": "Prophet", "freq_seconds": freq_seconds})
            except Exception as exc:  # pragma: no cover - optional path
                diagnostics["prophet_error"] = str(exc)

        if not forecast_values and HAVE_ARIMA and len(values) >= 6:
            try:
                model = ARIMA(values, order=(2, 1, 1)).fit()
                forecast_values = model.forecast(steps=self.horizon).tolist()
                model_used = "arima(2,1,1)"
                diagnostics.update(
                    {
                        "aic": getattr(model, "aic", None),
                        "bic": getattr(model, "bic", None),
                        "freq_seconds": freq_seconds,
                    }
                )
            except Exception as exc:  # pragma: no cover - optional path
                diagnostics["arima_error"] = str(exc)

        if not forecast_values:
            trend = self._linear_trend(values)
            last_val = values[-1] if values else 0.0
            forecast_values = [max(0.0, last_val + trend * (i + 1)) for i in range(self.horizon)]
            model_used = "naive_trend"
            diagnostics.update({"trend": trend})

        forecast = [
            {"timestamp": future_timestamps[i].isoformat(), self.forecast_metric: float(val)}
            for i, val in enumerate(forecast_values)
        ]
        return ForecastResult(
            world_id=world_id,
            model_used=model_used,
            horizon=self.horizon,
            forecast=forecast,
            diagnostics=diagnostics,
        )

    @staticmethod
    def _infer_frequency_seconds(timestamps: Sequence[datetime]) -> Optional[int]:
        if len(timestamps) < 2:
            return None
        deltas = [
            (t2 - t1).total_seconds()
            for t1, t2 in zip(timestamps[:-1], timestamps[1:])
            if (t2 - t1).total_seconds() > 0
        ]
        if not deltas:
            return None
        median_delta = statistics.median(deltas)
        return int(median_delta)

    @staticmethod
    def _linear_trend(values: Sequence[float]) -> float:
        if len(values) < 2:
            return 0.0
        x = list(range(len(values)))
        mean_x = statistics.mean(x)
        mean_y = statistics.mean(values)
        numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, values))
        denominator = sum((xi - mean_x) ** 2 for xi in x) or 1.0
        slope = numerator / denominator
        return slope

    # ------------------------------------------------------------------
    # Load pattern & dependency analysis
    # ------------------------------------------------------------------
    def _analyze_load_patterns(self, timeseries: Dict[str, List[Dict[str, Any]]]) -> LoadPatternSummary:
        hour_counts: Dict[int, List[float]] = defaultdict(list)
        world_peaks: Dict[str, Dict[int, List[float]]] = defaultdict(lambda: defaultdict(list))
        bottlenecks: List[Dict[str, Any]] = []

        for world_id, samples in timeseries.items():
            response_vals = [s[self.forecast_metric] for s in samples]
            error_rate = 1.0 - (sum(1 for s in samples if s.get("ok", True)) / len(samples))
            avg_resp = statistics.mean(response_vals) if response_vals else 0.0
            p95_resp = (
                statistics.quantiles(response_vals, n=20)[18] if len(response_vals) >= 20 else max(response_vals, default=0.0)
            )
            bottlenecks.append(
                {
                    "world_id": world_id,
                    "avg_response_ms": round(avg_resp, 2),
                    "p95_response_ms": round(p95_resp, 2),
                    "error_rate": round(error_rate, 3),
                    "bottleneck_score": round(avg_resp * (1 + error_rate), 2),
                }
            )

            for sample in samples:
                hour = sample["timestamp"].hour
                hour_counts[hour].append(sample[self.forecast_metric])
                world_peaks[world_id][hour].append(sample[self.forecast_metric])

        peak_hours_utc = self._top_hours(hour_counts, top_n=4)
        world_peak_map = {wid: self._top_hours(hours, top_n=3) for wid, hours in world_peaks.items()}

        bottlenecks.sort(key=lambda b: b["bottleneck_score"], reverse=True)
        return LoadPatternSummary(
            peak_hours_utc=peak_hours_utc,
            world_peaks=world_peak_map,
            bottlenecks=bottlenecks,
        )

    @staticmethod
    def _top_hours(hour_map: Dict[int, List[float]], top_n: int = 3) -> List[int]:
        scored = []
        for hour, values in hour_map.items():
            mean_val = statistics.mean(values) if values else 0.0
            scored.append((hour, mean_val))
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return [hour for hour, _ in scored[:top_n]]

    def _cross_world_dependencies(self, timeseries: Dict[str, List[Dict[str, Any]]]) -> DependencySignal:
        # Align samples by timestamp for rough correlation checks
        by_timestamp: Dict[datetime, Dict[str, float]] = defaultdict(dict)
        for world_id, samples in timeseries.items():
            for sample in samples:
                by_timestamp[sample["timestamp"]][world_id] = sample[self.forecast_metric]

        worlds = list(timeseries.keys())
        correlations: Dict[Tuple[str, str], float] = {}
        for i, w1 in enumerate(worlds):
            for w2 in worlds[i + 1 :]:
                v1, v2 = self._aligned_pairs(by_timestamp, w1, w2)
                if len(v1) < 3:
                    corr = 0.0
                else:
                    corr = self._pearson_correlation(v1, v2)
                correlations[(w1, w2)] = corr

        # Centrality = mean absolute correlation with peers
        centrality: Dict[str, List[float]] = defaultdict(list)
        for (w1, w2), corr in correlations.items():
            centrality[w1].append(abs(corr))
            centrality[w2].append(abs(corr))

        dependency_centrality = [
            {
                "world_id": wid,
                "dependency_score": round(statistics.mean(vals), 3) if vals else 0.0,
            }
            for wid, vals in centrality.items()
        ]
        dependency_centrality.sort(key=lambda e: e["dependency_score"], reverse=True)

        strong_pairs = [
            {"pair": list(pair), "correlation": round(corr, 3)}
            for pair, corr in correlations.items()
            if abs(corr) >= 0.5
        ]
        strong_pairs.sort(key=lambda e: abs(e["correlation"]), reverse=True)

        return DependencySignal(
            dependency_centrality=dependency_centrality,
            strong_pairs=strong_pairs,
        )

    @staticmethod
    def _aligned_pairs(
        by_timestamp: Dict[datetime, Dict[str, float]],
        w1: str,
        w2: str,
    ) -> Tuple[List[float], List[float]]:
        v1, v2 = [], []
        for ts, worlds in by_timestamp.items():
            if w1 in worlds and w2 in worlds:
                v1.append(worlds[w1])
                v2.append(worlds[w2])
        return v1, v2

    @staticmethod
    def _pearson_correlation(v1: Sequence[float], v2: Sequence[float]) -> float:
        if len(v1) != len(v2) or len(v1) < 2:
            return 0.0
        mean1, mean2 = statistics.mean(v1), statistics.mean(v2)
        num = sum((a - mean1) * (b - mean2) for a, b in zip(v1, v2))
        den = math.sqrt(sum((a - mean1) ** 2 for a in v1) * sum((b - mean2) ** 2 for b in v2))
        if den == 0:
            return 0.0
        return num / den

    # ------------------------------------------------------------------
    # Recommendations & ROI
    # ------------------------------------------------------------------
    def _recommend_resources(
        self,
        forecasts: Dict[str, ForecastResult],
        load_patterns: LoadPatternSummary,
        dependency_signal: DependencySignal,
    ) -> List[Dict[str, Any]]:
        bottleneck_lookup = {b["world_id"]: b for b in load_patterns.bottlenecks}
        dependency_lookup = {d["world_id"]: d["dependency_score"] for d in dependency_signal.dependency_centrality}

        recommendations: List[Dict[str, Any]] = []
        for world_id, forecast in forecasts.items():
            projected_peak = max((pt[self.forecast_metric] for pt in forecast.forecast), default=0.0)
            bottleneck = bottleneck_lookup.get(world_id, {})
            dependency_score = dependency_lookup.get(world_id, 0.0)
            peak_hours = load_patterns.world_peaks.get(world_id, [])

            actions = self._build_actions(world_id, projected_peak, bottleneck, dependency_score, peak_hours)
            total_cost = sum(action["cost_units"] for action in actions) or 1
            total_gain = sum(action["expected_gain_ms"] for action in actions)
            recommendations.append(
                {
                    "world_id": world_id,
                    "priority": self._priority(projected_peak, bottleneck, dependency_score),
                    "projected_peak_response_ms": round(projected_peak, 2),
                    "peak_hours_utc": peak_hours,
                    "dependency_score": dependency_score,
                    "actions": actions,
                    "roi_ms_per_unit": round(total_gain / total_cost, 2),
                }
            )

        recommendations.sort(key=lambda r: (r["priority"], -r["roi_ms_per_unit"]))
        return recommendations

    def _build_actions(
        self,
        world_id: str,
        projected_peak: float,
        bottleneck: Dict[str, Any],
        dependency_score: float,
        peak_hours: List[int],
    ) -> List[Dict[str, Any]]:
        actions: List[Dict[str, Any]] = []

        # CDN allocation
        if projected_peak >= 1200 or dependency_score >= 0.4:
            gain = self._estimate_gain(projected_peak, reduction_ratio=0.25)
            actions.append(
                {
                    "type": "cdn_allocation",
                    "description": "Shift hot paths to edge/CDN nodes during peaks.",
                    "cost_units": 3,
                    "expected_gain_ms": gain,
                    "impact": "high" if projected_peak >= 1800 else "medium",
                }
            )

        # Cache strategy
        if peak_hours:
            gain = self._estimate_gain(projected_peak, reduction_ratio=0.18)
            actions.append(
                {
                    "type": "cache_strategy",
                    "description": f"Pre-warm caches for peak hours {peak_hours}.",
                    "cost_units": 2,
                    "expected_gain_ms": gain,
                    "impact": "medium",
                }
            )

        # Compute resources
        if bottleneck.get("error_rate", 0.0) > 0.05 or projected_peak >= self.warning_threshold_ms:
            gain = self._estimate_gain(projected_peak, reduction_ratio=0.22)
            actions.append(
                {
                    "type": "compute_scaling",
                    "description": "Burst compute capacity around predicted peaks.",
                    "cost_units": 4,
                    "expected_gain_ms": gain,
                    "impact": "high",
                }
            )

        # Cross-world prioritization
        if dependency_score >= 0.6:
            gain = self._estimate_gain(projected_peak, reduction_ratio=0.12)
            actions.append(
                {
                    "type": "cross_world_priority",
                    "description": "Prioritize shared services and routing for this world due to dependency centrality.",
                    "cost_units": 1,
                    "expected_gain_ms": gain,
                    "impact": "medium",
                }
            )

        if not actions:
            actions.append(
                {
                    "type": "steady_state",
                    "description": "Maintain current allocation; monitor for drift.",
                    "cost_units": 0,
                    "expected_gain_ms": 0,
                    "impact": "low",
                }
            )
        return actions

    @staticmethod
    def _estimate_gain(projected_peak: float, reduction_ratio: float) -> int:
        reduced = projected_peak * reduction_ratio
        return int(reduced)

    def _priority(
        self,
        projected_peak: float,
        bottleneck: Dict[str, Any],
        dependency_score: float,
    ) -> str:
        error_rate = bottleneck.get("error_rate", 0.0)
        if projected_peak >= self.critical_threshold_ms or error_rate >= 0.15 or dependency_score >= 0.75:
            return "critical"
        if projected_peak >= self.warning_threshold_ms or error_rate >= 0.08:
            return "high"
        if dependency_score >= 0.4:
            return "medium"
        return "low"

    # ------------------------------------------------------------------
    # Alerts & ROI summary
    # ------------------------------------------------------------------
    def _generate_alerts(self, forecasts: Dict[str, ForecastResult]) -> List[Dict[str, Any]]:
        alerts: List[Dict[str, Any]] = []
        for world_id, forecast in forecasts.items():
            for point in forecast.forecast:
                value = point[self.forecast_metric]
                severity = None
                threshold = None
                if value >= self.critical_threshold_ms:
                    severity = "critical"
                    threshold = self.critical_threshold_ms
                elif value >= self.warning_threshold_ms:
                    severity = "warning"
                    threshold = self.warning_threshold_ms
                if severity:
                    alerts.append(
                        {
                            "world_id": world_id,
                            "severity": severity,
                            "metric": self.forecast_metric,
                            "value": round(value, 2),
                            "threshold": threshold,
                            "timestamp": point["timestamp"],
                        }
                    )
        return alerts

    @staticmethod
    def _cost_benefit_summary(recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_cost = 0
        total_gain = 0
        for rec in recommendations:
            for action in rec["actions"]:
                total_cost += action["cost_units"]
                total_gain += action["expected_gain_ms"]
        roi = round(total_gain / total_cost, 2) if total_cost else 0.0
        return {
            "total_expected_gain_ms": total_gain,
            "total_cost_units": total_cost,
            "roi_ms_per_unit": roi,
        }


# ----------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Phase 4 predictive resource allocator")
    parser.add_argument(
        "--history",
        type=Path,
        default=DEFAULT_HISTORY_PATH,
        help="Path to historical performance data (world-metrics-timeseries.json)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Where to write the optimization plan JSON",
    )
    parser.add_argument(
        "--horizon",
        type=int,
        default=6,
        help="Number of forecast intervals to generate",
    )
    parser.add_argument(
        "--warning-ms",
        type=int,
        default=1500,
        help="Warning threshold for forecasted response time (ms)",
    )
    parser.add_argument(
        "--critical-ms",
        type=int,
        default=2500,
        help="Critical threshold for forecasted response time (ms)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    allocator = PredictiveResourceAllocator(
        history_path=args.history,
        output_path=args.output,
        horizon=args.horizon,
        warning_threshold_ms=args.warning_ms,
        critical_threshold_ms=args.critical_ms,
    )
    plan = allocator.write_plan()

    # Compact summary to stdout
    print(f"[phase4] Predictive resource plan generated -> {allocator.output_path}")
    print(f"  models: prophet={HAVE_PROPHET} arima={HAVE_ARIMA}")
    print(f"  alerts: {len(plan['alerts'])} | recommendations: {len(plan['recommendations'])}")
    if plan["recommendations"]:
        top = plan["recommendations"][0]
        print(
            f"  top priority: {top['world_id']} ({top['priority']}), "
            f"roi={top['roi_ms_per_unit']} ms/unit, actions={len(top['actions'])}"
        )


if __name__ == "__main__":
    main()
