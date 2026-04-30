#!/usr/bin/env python3
"""
Predictive analytics engine for the 13-world ecosystem.

Capabilities
------------
* Time-series forecasting: linear regression, exponential smoothing, seasonal
  decomposition (with graceful fallbacks), and ARIMA modeling when available.
* Growth projections: 7- and 30-day projections for pages, lines, and feature
  counts with velocity and acceleration signals plus simple curve fitting to
  highlight saturation.
* Ecosystem health forecasting: composite health score projections, early
  warnings, trend confidence intervals, and anomaly detection.
* Integration: consumes `world-metrics-timeseries.json`, reuses
  `ecosystem_health_scorer.py`, exports JSON for dashboards, and provides
  lightweight visualization helpers.

This module favors resilience: sparse or noisy data triggers conservative
fallbacks instead of exceptions. All outputs are JSON-serializable and safe to
feed into dashboards or CLI summaries.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from ecosystem_health_scorer import HealthScoreCalculator

DATA_PATH = Path(__file__).with_name("world-metrics-timeseries.json")


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class TimeSeriesPoint:
    timestamp: datetime
    value: float


@dataclass
class ForecastEnvelope:
    """Container for a single model forecast and optional confidence bounds."""

    label: str
    model: str
    values: List[Tuple[datetime, float]]
    lower: Optional[List[Tuple[datetime, float]]] = None
    upper: Optional[List[Tuple[datetime, float]]] = None
    diagnostics: Dict[str, float] = field(default_factory=dict)

    def to_json(self) -> dict:
        def encode(series: Optional[List[Tuple[datetime, float]]]) -> Optional[List[dict]]:
            if series is None:
                return None
            return [
                {"timestamp": ts.isoformat(), "value": val}
                for ts, val in series
            ]

        return {
            "label": self.label,
            "model": self.model,
            "values": encode(self.values),
            "lower": encode(self.lower),
            "upper": encode(self.upper),
            "diagnostics": self.diagnostics,
        }


@dataclass
class GrowthSnapshot:
    timestamp: datetime
    pages: Optional[float]
    lines: Optional[float]
    features: Optional[float]
    response_ms: Optional[float]
    available: bool
    engagement: float


@dataclass
class WorldSeries:
    world_id: str
    name: str
    type: Optional[str]
    points: List[GrowthSnapshot] = field(default_factory=list)

    def metric_series(self, attr: str) -> List[TimeSeriesPoint]:
        series: List[TimeSeriesPoint] = []
        for p in self.points:
            val = getattr(p, attr)
            if val is None:
                continue
            series.append(TimeSeriesPoint(p.timestamp, float(val)))
        return series


@dataclass
class HealthForecast:
    ecosystem: ForecastEnvelope
    per_world: Dict[str, ForecastEnvelope]
    warnings: List[str] = field(default_factory=list)


@dataclass
class ForecastBundle:
    """Aggregated forecasts for dashboards."""

    generated_at: datetime
    growth: Dict[str, Dict[str, ForecastEnvelope]]
    velocities: Dict[str, dict]
    accelerations: Dict[str, dict]
    saturation: Dict[str, dict]
    health: HealthForecast

    def to_json(self) -> dict:
        def encode_forecasts(obj: Dict[str, Dict[str, ForecastEnvelope]]) -> dict:
            return {
                k: {name: env.to_json() for name, env in inner.items()}
                for k, inner in obj.items()
            }

        return {
            "generated_at": self.generated_at.isoformat(),
            "growth": encode_forecasts(self.growth),
            "velocities": self.velocities,
            "accelerations": self.accelerations,
            "saturation": self.saturation,
            "health": {
                "ecosystem": self.health.ecosystem.to_json(),
                "per_world": {k: env.to_json() for k, env in self.health.per_world.items()},
                "warnings": self.health.warnings,
            },
        }


# ---------------------------------------------------------------------------
# Core predictive engine
# ---------------------------------------------------------------------------


class EcosystemPredictor:
    def __init__(self, data_path: Path = DATA_PATH) -> None:
        self.data_path = data_path
        self.health_calculator = HealthScoreCalculator()

    # -- Loading and preprocessing -------------------------------------

    def load_timeseries(self, path: Optional[Path] = None) -> List[dict]:
        target = path or self.data_path
        raw = json.loads(target.read_text())
        raw.sort(key=lambda entry: entry["timestamp"])
        return raw

    def build_world_series(self, snapshots: List[dict]) -> Dict[str, WorldSeries]:
        """Convert raw snapshots into per-world growth-friendly structures."""
        series: Dict[str, WorldSeries] = {}
        for snap in snapshots:
            ts = datetime.fromisoformat(snap["timestamp"])
            world_list = snap.get("worlds", [])
            keyword_sets = {
                w["id"]: set((w.get("content") or {}).get("keyword_hits", {}).keys())
                for w in world_list
            }
            for world in world_list:
                world_id = world["id"]
                record = series.setdefault(
                    world_id,
                    WorldSeries(
                        world_id=world_id,
                        name=world.get("name", world_id),
                        type=world.get("type"),
                    ),
                )
                content = world.get("content") or {}
                keyword_hits = content.get("keyword_hits") or {}
                keyword_total = sum(keyword_hits.values()) if keyword_hits else None
                # Heuristics: treat content_size as "pages" proxy, keywords as "lines",
                # and unique keywords as "features".
                pages = content.get("content_size")
                lines = keyword_total
                features = float(len(keyword_hits)) if keyword_hits else None
                engagement = self._estimate_engagement(world, keyword_sets, world_list)
                record.points.append(
                    GrowthSnapshot(
                        timestamp=ts,
                        pages=pages,
                        lines=lines,
                        features=features,
                        response_ms=world.get("response_ms"),
                        available=bool(world.get("ok")),
                        engagement=engagement,
                    )
                )
        for record in series.values():
            record.points.sort(key=lambda p: p.timestamp)
        return series

    # -- Time-series primitives ----------------------------------------

    @staticmethod
    def _linear_regression(points: List[TimeSeriesPoint]) -> Tuple[float, float, float]:
        """
        Return slope, intercept, and the base timestamp (seconds since epoch).
        Values are computed relative to the base to improve numerical stability.
        """
        if len(points) < 2:
            val = points[0].value if points else 0.0
            base = points[0].timestamp.timestamp() if points else 0.0
            return 0.0, val, base
        xs_raw = [p.timestamp.timestamp() for p in points]
        base = xs_raw[0]
        xs = [x - base for x in xs_raw]
        ys = [p.value for p in points]
        mean_x, mean_y = statistics.mean(xs), statistics.mean(ys)
        denom = sum((x - mean_x) ** 2 for x in xs)
        if denom == 0:
            return 0.0, mean_y, base
        slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denom
        intercept = mean_y - slope * mean_x
        return slope, intercept, base

    @staticmethod
    def _exponential_smoothing(values: List[float], alpha: float, horizon: int) -> List[float]:
        if not values:
            return [0.0] * horizon
        smoothed = values[0]
        for val in values[1:]:
            smoothed = alpha * val + (1 - alpha) * smoothed
        return [smoothed for _ in range(horizon)]

    @staticmethod
    def _seasonal_decompose(values: List[float], period: int) -> Tuple[List[float], List[float]]:
        """
        Simple seasonal decomposition using moving average for trend and
        residual = values - trend. If data is sparse, returns flat trend.
        """
        if not values or period <= 1:
            return [values[-1] if values else 0.0] * len(values), [0.0] * len(values)
        trend: List[float] = []
        half = max(period // 2, 1)
        for i in range(len(values)):
            window = values[max(0, i - half) : min(len(values), i + half + 1)]
            trend.append(statistics.mean(window))
        residual = [v - t for v, t in zip(values, trend)]
        return trend, residual

    @staticmethod
    def _arima_forecast(values: List[float], horizon: int) -> Tuple[List[float], Optional[List[float]], Optional[List[float]], str]:
        """
        Try ARIMA(1,1,1); fallback to linear regression or persistence when
        statsmodels is unavailable or data is too short.
        """
        model_used = "arima"
        if len(values) < 4:
            model_used = "persistence"
            last = values[-1] if values else 0.0
            return [last for _ in range(horizon)], None, None, model_used

        try:
            from statsmodels.tsa.arima.model import ARIMA  # type: ignore

            fit = ARIMA(values, order=(1, 1, 1)).fit()
            forecast_res = fit.get_forecast(steps=horizon)
            mean_forecast = list(forecast_res.predicted_mean)
            conf_int = forecast_res.conf_int(alpha=0.2)  # 80% interval
            lower = [row[0] for row in conf_int.values]
            upper = [row[1] for row in conf_int.values]
            return mean_forecast, lower, upper, model_used
        except Exception:
            slope, intercept, base = EcosystemPredictor._linear_regression(
                [TimeSeriesPoint(datetime.fromtimestamp(i), v) for i, v in enumerate(values)]
            )
            model_used = "linear-fallback"
            last_idx = len(values) - 1
            preds = [slope * ((last_idx + i + 1) - base) + intercept for i in range(horizon)]
            return preds, None, None, model_used

    # -- Growth projections ---------------------------------------------

    def project_growth(
        self, record: WorldSeries, horizon_days: List[int] = [7, 30]
    ) -> Dict[str, ForecastEnvelope]:
        forecasts: Dict[str, ForecastEnvelope] = {}
        metrics = ("pages", "lines", "features")
        for metric in metrics:
            series = record.metric_series(metric)
            if not series:
                forecasts[metric] = ForecastEnvelope(
                    label=metric,
                    model="sparse-data",
                    values=[],
                    diagnostics={"note": "insufficient data"},
                )
                continue

            slope, intercept, base = self._linear_regression(series)
            last_ts = series[-1].timestamp
            values: List[Tuple[datetime, float]] = []
            diagnostics = {"slope_per_sec": slope, "intercept": intercept}
            for days in horizon_days:
                target_ts = last_ts + timedelta(days=days)
                pred = slope * (target_ts.timestamp() - base) + intercept
                values.append((target_ts, max(pred, 0.0)))
            forecasts[metric] = ForecastEnvelope(
                label=f"{metric}-projection",
                model="linear-regression",
                values=values,
                diagnostics=diagnostics,
            )
        return forecasts

    def velocity_and_acceleration(self, record: WorldSeries) -> Tuple[dict, dict]:
        velocities: Dict[str, dict] = {}
        accelerations: Dict[str, dict] = {}
        for metric in ("pages", "features"):
            series = record.metric_series(metric)
            if len(series) < 2:
                velocities[metric] = {"value": 0.0, "units": "per_hour", "note": "sparse"}
                accelerations[metric] = {"value": 0.0, "units": "per_day2", "trend": "flat"}
                continue

            slope, _, _ = self._linear_regression(series)
            velocity_per_hour = slope * 3600.0  # timestamp slope is per second
            # Acceleration via slope difference across halves.
            mid = len(series) // 2
            first_slope, _, _ = self._linear_regression(series[: max(mid, 2)])
            second_slope, _, _ = self._linear_regression(series[mid:])
            accel = (second_slope - first_slope) * 3600.0 * 24.0
            trend = "increasing" if accel > 0 else ("decreasing" if accel < 0 else "flat")
            velocities[metric] = {"value": velocity_per_hour, "units": f"{metric}/hour"}
            accelerations[metric] = {
                "value": accel,
                "units": f"{metric}/day^2",
                "trend": trend,
            }
        return velocities, accelerations

    def fit_growth_curve(self, record: WorldSeries) -> dict:
        """
        Lightweight curve fitting to signal saturation: compares recent slope to
        historical max to estimate slowdown ratio.
        """
        series = record.metric_series("pages")
        if len(series) < 3:
            return {"saturation_score": 0.0, "status": "unknown"}
        slope, _, _ = self._linear_regression(series)
        window = max(3, len(series) // 3)
        recent_slope, _, _ = self._linear_regression(series[-window:])
        ratio = recent_slope / slope if slope else 0.0
        status = "accelerating" if ratio > 1.1 else "steady" if 0.8 <= ratio <= 1.1 else "saturating"
        return {"saturation_score": ratio, "status": status}

    # -- Health forecasting ---------------------------------------------

    def forecast_health(self, snapshots: List[dict], horizon_days: int = 14) -> HealthForecast:
        profiles, ecosystem = self.health_calculator.score_all(snapshots)
        health_envs: Dict[str, ForecastEnvelope] = {}
        warnings: List[str] = []

        for world_id, profile in profiles.items():
            series = [
                TimeSeriesPoint(s.timestamp, s.score.composite)
                for s in profile.snapshots
            ]
            env = self._forecast_with_ci(
                series,
                label=f"{world_id}-health",
                threshold=self.health_calculator.config.thresholds.warning,
                horizon_days=horizon_days,
            )
            if env.diagnostics.get("breach_warning"):
                warnings.append(env.diagnostics["breach_warning"])
            health_envs[world_id] = env

        eco_series = [
            TimeSeriesPoint(s.timestamp, s.score.composite) for s in ecosystem.snapshots
        ]
        eco_env = self._forecast_with_ci(
            eco_series,
            label="ecosystem-health",
            threshold=self.health_calculator.config.thresholds.warning,
            horizon_days=horizon_days,
        )
        if eco_env.diagnostics.get("breach_warning"):
            warnings.append(eco_env.diagnostics["breach_warning"])

        return HealthForecast(ecosystem=eco_env, per_world=health_envs, warnings=warnings)

    def _forecast_with_ci(
        self,
        series: List[TimeSeriesPoint],
        label: str,
        threshold: float,
        horizon_days: int,
    ) -> ForecastEnvelope:
        if not series:
            return ForecastEnvelope(
                label=label,
                model="sparse-data",
                values=[],
                diagnostics={"note": "no history"},
            )
        slope, intercept, base = self._linear_regression(series)
        last_ts = series[-1].timestamp
        preds: List[Tuple[datetime, float]] = []
        lower: List[Tuple[datetime, float]] = []
        upper: List[Tuple[datetime, float]] = []

        # Residual-based confidence interval (naive, avoids heavy deps).
        residuals = [
            p.value - (slope * (p.timestamp.timestamp() - base) + intercept)
            for p in series
        ]
        std = statistics.pstdev(residuals) if len(residuals) > 1 else 5.0
        for day in range(1, horizon_days + 1):
            ts = last_ts + timedelta(days=day)
            pred = slope * (ts.timestamp() - base) + intercept
            pred = max(0.0, min(100.0, pred))
            preds.append((ts, pred))
            lower.append((ts, max(0.0, min(100.0, pred - 1.28 * std))))
            upper.append((ts, max(0.0, min(100.0, pred + 1.28 * std))))

        breach = next((p for p in preds if p[1] < threshold), None)
        diagnostics = {
            "model": "linear-regression",
            "slope_per_sec": slope,
            "intercept": intercept,
            "std_residual": std,
        }
        if breach:
            diagnostics["breach_warning"] = (
                f"{label} expected to cross warning threshold {threshold:.1f} on {breach[0].date()}"
            )
        return ForecastEnvelope(
            label=label,
            model="linear-regression",
            values=preds,
            lower=lower,
            upper=upper,
            diagnostics=diagnostics,
        )

    # -- Response time and seasonal analysis ---------------------------

    def forecast_response_time(self, record: WorldSeries, horizon_hours: int = 24) -> ForecastEnvelope:
        series = record.metric_series("response_ms")
        values = [p.value for p in series]
        smoothed = self._exponential_smoothing(values, alpha=0.35, horizon=horizon_hours)
        trend, residual = self._seasonal_decompose(values, period=min(len(values), 7))
        arima_pred, lower, upper, model_used = self._arima_forecast(values, horizon_hours)
        last_ts = series[-1].timestamp if series else datetime.utcnow()
        horizon = [last_ts + timedelta(hours=i + 1) for i in range(horizon_hours)]
        values_out = list(zip(horizon, arima_pred or smoothed))
        lower_out = list(zip(horizon, lower)) if lower else None
        upper_out = list(zip(horizon, upper)) if upper else None
        diagnostics = {
            "model_used": model_used,
            "smoothed_tail": smoothed[-1] if smoothed else None,
            "residual_std": statistics.pstdev(residual) if residual else 0.0,
        }
        return ForecastEnvelope(
            label=f"{record.world_id}-response",
            model="arima" if arima_pred else "exp-smoothing",
            values=values_out,
            lower=lower_out,
            upper=upper_out,
            diagnostics=diagnostics,
        )

    # -- Use cases -----------------------------------------------------

    def predict_milestone_eta(
        self, record: WorldSeries, metric: str, target_value: float
    ) -> Optional[datetime]:
        series = record.metric_series(metric)
        if not series:
            return None
        slope, intercept, base = self._linear_regression(series)
        if slope <= 0:
            return None
        ts_seconds = base + (target_value - intercept) / slope
        return (
            datetime.fromtimestamp(ts_seconds)
            if ts_seconds > series[-1].timestamp.timestamp()
            else None
        )

    def forecast_availability(self, record: WorldSeries, horizon_days: int = 14) -> ForecastEnvelope:
        points = [
            TimeSeriesPoint(p.timestamp, 100.0 if p.available else 0.0)
            for p in record.points
        ]
        return self._forecast_with_ci(
            points,
            label=f"{record.world_id}-availability",
            threshold=90.0,
            horizon_days=horizon_days,
        )

    def project_cross_world_engagement(self, series: Dict[str, WorldSeries]) -> Dict[str, float]:
        """
        Correlate engagement trajectories across worlds to highlight shared patterns.
        Returns a map of world_id -> mean engagement correlation against others.
        """
        correlations: Dict[str, float] = {}
        for world_id, record in series.items():
            base = [p.engagement for p in record.points]
            if len(base) < 2:
                correlations[world_id] = 0.0
                continue
            peers = []
            for other_id, other in series.items():
                if other_id == world_id:
                    continue
                other_vals = [p.engagement for p in other.points]
                if len(other_vals) < 2 or len(base) != len(other_vals):
                    continue
                corr = self._pearson(base, other_vals)
                if corr is not None:
                    peers.append(corr)
            correlations[world_id] = statistics.mean(peers) if peers else 0.0
        return correlations

    # -- Export and visualization --------------------------------------

    @staticmethod
    def export_forecasts(bundle: ForecastBundle, out_path: Path) -> Path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(bundle.to_json(), indent=2))
        return out_path

    @staticmethod
    def ascii_chart(env: ForecastEnvelope, width: int = 40) -> str:
        if not env.values:
            return "(no data)"
        vals = [v for _, v in env.values]
        max_val = max(vals) or 1.0
        lines = []
        for ts, val in env.values:
            bar_len = int((val / max_val) * width)
            lines.append(f"{ts.isoformat(timespec='minutes')}: {'#' * bar_len} {val:.1f}")
        return "\n".join(lines)

    @staticmethod
    def plot_forecast(env: ForecastEnvelope, out_path: Path) -> Optional[Path]:
        """Optional matplotlib helper; returns None when dependency is missing."""
        try:
            import matplotlib.pyplot as plt
        except Exception:
            return None

        times = [ts for ts, _ in env.values]
        vals = [v for _, v in env.values]
        plt.figure(figsize=(8, 3))
        plt.plot(times, vals, label=env.model, marker="o")
        if env.lower and env.upper:
            plt.fill_between(
                times,
                [v for _, v in env.lower],
                [v for _, v in env.upper],
                color="tab:blue",
                alpha=0.15,
                label="CI",
            )
        plt.title(env.label)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(out_path, dpi=200)
        plt.close()
        return out_path

    # -- Helpers -------------------------------------------------------

    def _estimate_engagement(
        self, world: dict, keyword_sets: Dict[str, set], world_list: List[dict]
    ) -> float:
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

    @staticmethod
    def _pearson(xs: List[float], ys: List[float]) -> Optional[float]:
        n = min(len(xs), len(ys))
        if n < 2:
            return None
        mean_x, mean_y = statistics.mean(xs[:n]), statistics.mean(ys[:n])
        cov = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
        var_x = sum((xs[i] - mean_x) ** 2 for i in range(n))
        var_y = sum((ys[i] - mean_y) ** 2 for i in range(n))
        if var_x == 0 or var_y == 0:
            return None
        return cov / math.sqrt(var_x * var_y)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _build_bundle(predictor: EcosystemPredictor, data_path: Path) -> ForecastBundle:
    snapshots = predictor.load_timeseries(data_path)
    series = predictor.build_world_series(snapshots)

    growth_forecasts: Dict[str, Dict[str, ForecastEnvelope]] = {}
    velocities: Dict[str, dict] = {}
    accelerations: Dict[str, dict] = {}
    saturation: Dict[str, dict] = {}
    for world_id, record in series.items():
        growth_forecasts[world_id] = predictor.project_growth(record)
        vel, accel = predictor.velocity_and_acceleration(record)
        velocities[world_id] = vel
        accelerations[world_id] = accel
        saturation[world_id] = predictor.fit_growth_curve(record)

    health = predictor.forecast_health(snapshots)
    return ForecastBundle(
        generated_at=datetime.utcnow(),
        growth=growth_forecasts,
        velocities=velocities,
        accelerations=accelerations,
        saturation=saturation,
        health=health,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Predictive analytics engine for the 13-world ecosystem."
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DATA_PATH,
        help="Path to world-metrics-timeseries.json",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("forecast-output.json"),
        help="Where to write JSON forecasts for dashboards",
    )
    parser.add_argument(
        "--chart",
        action="store_true",
        help="Print ASCII charts for ecosystem health forecast",
    )
    args = parser.parse_args()

    predictor = EcosystemPredictor(data_path=args.data)
    bundle = _build_bundle(predictor, args.data)
    EcosystemPredictor.export_forecasts(bundle, args.out)

    print(f"Forecasts exported to {args.out}")
    print(f"Warnings: {bundle.health.warnings or 'none'}")
    if args.chart:
        print("\nEcosystem health forecast (next 14 days):")
        print(EcosystemPredictor.ascii_chart(bundle.health.ecosystem))


if __name__ == "__main__":
    main()
