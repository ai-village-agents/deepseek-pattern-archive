#!/usr/bin/env python3
"""
Phase 4: Autonomous Performance Monitor

Real-time performance monitoring across the 13-world ecosystem with:
- Async performance collector (HTTP across all 13 worlds)
- Health metrics analyzer & composite scoring
- Threshold-based alerting with retry/error handling
- Sliding-window trend analysis
- JSON persistence of history, alerts, and anomaly overlays
- Integration hook into Phase 3 anomaly detection

The monitor runs in a background loop (default: every 60 seconds). Use
`python phase4_auto_performance_monitor.py` to start continuous
monitoring; stop with Ctrl+C. The loop is intentionally lightweight and
safe to run alongside other scripts.
"""

from __future__ import annotations

import asyncio
import json
import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiohttp
from aiohttp import ClientError

# World definitions aligned with Phase 3/4 artifacts
WORLD_ENDPOINTS = [
    {"id": "sonnet-45", "name": "Persistence Garden", "agent": "Claude Sonnet 4.5",
     "url": "https://ai-village-agents.github.io/sonnet-45-world", "expected": 200},
    {"id": "opus-45", "name": "Edge Garden", "agent": "Claude Opus 4.5",
     "url": "https://ai-village-agents.github.io/edge-garden", "expected": 200},
    {"id": "opus-46", "name": "Liminal Archive", "agent": "Claude Opus 4.6",
     "url": "https://ai-village-agents.github.io/opus-46-world", "expected": 200},
    {"id": "gpt-5.1", "name": "Canonical Observatory", "agent": "GPT-5.1",
     "url": "https://ai-village-agents.github.io/gpt-5-1-canonical-observatory", "expected": 200},
    {"id": "gpt-5.4", "name": "Signal Cartographer", "agent": "GPT-5.4",
     "url": "https://ai-village-agents.github.io/signal-cartographer", "expected": 200},
    {"id": "deepseek", "name": "Pattern Archive", "agent": "DeepSeek-V3.2",
     "url": "https://ai-village-agents.github.io/deepseek-pattern-archive", "expected": 200},
    {"id": "sonnet-46-drift", "name": "The Drift", "agent": "Claude Sonnet 4.6",
     "url": "https://claude-sonnet-46-drift.surge.sh", "expected": 200},
    {"id": "haiku-4.5-observatory", "name": "Automation Observatory", "agent": "Claude Haiku 4.5",
     "url": "https://ai-village-agents.github.io/automation-observatory", "expected": 200},
    {"id": "gpt-5.2-constellation", "name": "Proof Constellation", "agent": "GPT-5.2",
     "url": "https://ai-village-agents.github.io/gpt-5-2-world", "expected": 200},
    {"id": "opus-47-anchorage", "name": "The Anchorage", "agent": "Claude Opus 4.7",
     "url": "https://ai-village-agents.github.io/the-anchorage", "expected": 200},
    {"id": "gemini-3.1-canvas", "name": "Canvas of Truth", "agent": "Gemini 3.1 Pro",
     "url": "https://ai-village-agents.github.io/gemini-interactive-world", "expected": 200},
    {"id": "gpt-5.5-index", "name": "The Luminous Index", "agent": "GPT-5.5",
     "url": "https://ai-village-agents.github.io/gpt-5-5-luminous-index", "expected": 200},
    {"id": "kimi-k2.6-strata", "name": "STRATA", "agent": "Kimi K2.6",
     "url": "https://ai-village-agents.github.io/k2-6-world", "expected": 200},
]


@dataclass
class AlertThresholds:
    response_ms_warning: int = 1000
    response_ms_critical: int = 2000
    error_rate_warning: float = 0.05
    error_rate_critical: float = 0.15
    health_warning: float = 70.0
    health_critical: float = 50.0


@dataclass
class WorldState:
    history: List[Dict[str, Any]] = field(default_factory=list)
    health_history: List[float] = field(default_factory=list)


class Phase4PerformanceMonitor:
    def __init__(
        self,
        interval_seconds: int = 60,
        history_size: int = 50,
        retry_attempts: int = 2,
        retry_backoff: float = 1.5,
        sliding_window: int = 10,
        thresholds: Optional[AlertThresholds] = None,
    ) -> None:
        self.interval_seconds = interval_seconds
        self.history_size = history_size
        self.retry_attempts = retry_attempts
        self.retry_backoff = retry_backoff
        self.sliding_window = sliding_window
        self.thresholds = thresholds or AlertThresholds()

        self.world_states: Dict[str, WorldState] = {w["id"]: WorldState() for w in WORLD_ENDPOINTS}
        self.alert_log: List[Dict[str, Any]] = []

        self.history_path = Path("phase4_performance_history.json")
        self.alerts_path = Path("phase4_performance_alerts.json")
        self.snapshot_path = Path("phase4_performance_snapshot.json")
        self.anomaly_overlay_path = Path("phase4_anomaly_overlay.json")

    # ------------------------------------------------------------------
    # Core monitoring loop
    # ------------------------------------------------------------------
    async def run(self, max_cycles: Optional[int] = None) -> None:
        """Run the background monitor. Ctrl+C to stop."""
        cycle = 0
        print("=" * 72)
        print("PHASE 4: Autonomous Performance Monitor (13-world ecosystem)")
        print("=" * 72)

        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
            while True:
                cycle += 1
                started_at = datetime.utcnow()
                print(f"[{started_at.isoformat()}] Starting monitoring cycle #{cycle}")

                results = await self.collect_all(session)
                metrics = self.analyze_metrics(results)
                self.evaluate_alerts(metrics)
                self.persist_state(metrics)
                self.run_anomaly_overlay(metrics)

                elapsed = (datetime.utcnow() - started_at).total_seconds()
                sleep_for = max(0, self.interval_seconds - elapsed)
                print(f"[cycle #{cycle}] Completed in {elapsed:.1f}s; sleeping {sleep_for:.1f}s\n")

                if max_cycles and cycle >= max_cycles:
                    print("Max cycles reached; exiting monitor loop.")
                    break

                try:
                    await asyncio.sleep(sleep_for)
                except asyncio.CancelledError:
                    print("Monitor loop cancelled; shutting down gracefully.")
                    break

    # ------------------------------------------------------------------
    # Collection
    # ------------------------------------------------------------------
    async def collect_all(self, session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
        """Collect metrics concurrently across all worlds."""
        tasks = [
            asyncio.create_task(self._collect_world(session, world))
            for world in WORLD_ENDPOINTS
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        normalized_results = []
        for world, result in zip(WORLD_ENDPOINTS, results):
            if isinstance(result, Exception):
                normalized_results.append(self._build_error_result(world, str(result)))
            else:
                normalized_results.append(result)
        return normalized_results

    async def _collect_world(self, session: aiohttp.ClientSession, world: Dict[str, Any]) -> Dict[str, Any]:
        """Issue async HTTP request with retry/backoff."""
        attempt = 0
        url = world["url"]
        started = asyncio.get_event_loop().time()

        while True:
            attempt += 1
            try:
                async with session.get(url, timeout=20, allow_redirects=True) as resp:
                    content = await resp.read()
                    elapsed = (asyncio.get_event_loop().time() - started) * 1000
                    return {
                        "world_id": world["id"],
                        "world_name": world["name"],
                        "agent": world["agent"],
                        "status_code": resp.status,
                        "ok": resp.status < 500,
                        "response_ms": round(elapsed, 2),
                        "expected": world["expected"],
                        "timestamp": datetime.utcnow().isoformat(),
                        "content_length": len(content),
                        "error": None,
                    }
            except (asyncio.TimeoutError, ClientError) as exc:
                error_detail = str(exc)
                if attempt <= self.retry_attempts:
                    backoff = self.retry_backoff * attempt
                    await asyncio.sleep(backoff)
                    continue
                elapsed = (asyncio.get_event_loop().time() - started) * 1000
                return self._build_error_result(world, error_detail, elapsed)
            except Exception as exc:  # noqa: BLE001
                elapsed = (asyncio.get_event_loop().time() - started) * 1000
                return self._build_error_result(world, str(exc), elapsed)

    def _build_error_result(
        self,
        world: Dict[str, Any],
        error: str,
        elapsed_ms: Optional[float] = None,
    ) -> Dict[str, Any]:
        return {
            "world_id": world["id"],
            "world_name": world["name"],
            "agent": world["agent"],
            "status_code": None,
            "ok": False,
            "response_ms": round(elapsed_ms, 2) if elapsed_ms else None,
            "expected": world.get("expected", 200),
            "timestamp": datetime.utcnow().isoformat(),
            "content_length": None,
            "error": error,
        }

    # ------------------------------------------------------------------
    # Analysis
    # ------------------------------------------------------------------
    def analyze_metrics(self, cycle_results: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Update history and compute composite metrics per world."""
        metrics: Dict[str, Dict[str, Any]] = {}

        # Update per-world histories
        for result in cycle_results:
            state = self.world_states[result["world_id"]]
            state.history.append(result)
            state.history = state.history[-self.history_size :]

        # Compute per-world metrics
        for world in WORLD_ENDPOINTS:
            world_id = world["id"]
            state = self.world_states[world_id]
            history = state.history

            latencies = [entry["response_ms"] for entry in history if entry["response_ms"] is not None]
            successes = [entry for entry in history if entry["ok"]]
            failures = [entry for entry in history if not entry["ok"]]

            avg_latency = statistics.fmean(latencies) if latencies else None
            p95_latency = self._percentile(latencies, 95) if len(latencies) >= 2 else avg_latency
            error_rate = len(failures) / len(history) if history else 0.0

            volatility = statistics.pstdev(latencies) if len(latencies) >= 2 else 0.0
            bandwidth_kbps = self._estimate_bandwidth(history)

            health_score = self._calculate_health(avg_latency, error_rate, volatility)
            state.health_history.append(health_score)
            state.health_history = state.health_history[-self.history_size :]

            trend = self._trend(state.health_history)
            drawdown = self._max_drawdown(state.health_history)
            stability_score = self._stability_from_volatility(volatility)

            metrics[world_id] = {
                "world_id": world_id,
                "world_name": world["name"],
                "agent": world["agent"],
                "timestamp": datetime.utcnow().isoformat(),
                "latest_latency_ms": latencies[-1] if latencies else None,
                "avg_latency_ms": avg_latency,
                "p95_latency_ms": p95_latency,
                "error_rate": error_rate,
                "volatility": volatility,
                "bandwidth_kbps": bandwidth_kbps,
                "health_score": health_score,
                "health_trend": trend,
                "max_drawdown": drawdown,
                "stability_score": stability_score,
                "samples": len(history),
                "latest_status": history[-1] if history else None,
                "warning_flag": health_score < self.thresholds.health_warning,
                "crisis_flag": health_score < self.thresholds.health_critical,
            }

        # Ecosystem-level normalization
        if metrics:
            mean_health = statistics.fmean(m["health_score"] for m in metrics.values())
            std_health = statistics.pstdev([m["health_score"] for m in metrics.values()]) if len(metrics) > 1 else 0.0

            for m in metrics.values():
                m["relative_to_mean"] = m["health_score"] - mean_health
                m["z_score"] = (m["health_score"] - mean_health) / std_health if std_health else 0.0
                m["distance_to_crisis"] = m["health_score"] - self.thresholds.health_critical
                m["composite_trend"] = m["health_trend"]

        return metrics

    def _calculate_health(self, avg_latency: Optional[float], error_rate: float, volatility: float) -> float:
        """Composite health score (0-100) using latency, errors, and stability."""
        health = 100.0

        if avg_latency is not None:
            # Penalize high latency; cap at 50 points
            latency_penalty = min(50.0, (avg_latency / 2000.0) * 50.0)
            health -= latency_penalty

        # Penalize error rate; cap at 35 points
        error_penalty = min(35.0, error_rate * 100 * 0.35)
        health -= error_penalty

        # Penalize volatility; cap at 15 points
        volatility_penalty = min(15.0, (volatility / 1500.0) * 15.0)
        health -= volatility_penalty

        return max(0.0, min(100.0, health))

    def _stability_from_volatility(self, volatility: float) -> float:
        """Translate volatility (ms) into a stability score."""
        return max(0.0, min(100.0, 100.0 - (volatility / 15.0)))

    def _trend(self, health_history: List[float]) -> float:
        """Simple sliding-window trend (last value minus first in window)."""
        if len(health_history) < 2:
            return 0.0
        window = health_history[-self.sliding_window :]
        return window[-1] - window[0]

    def _max_drawdown(self, health_history: List[float]) -> float:
        """Compute max drawdown over health history."""
        max_peak = -math.inf
        max_dd = 0.0
        for value in health_history:
            max_peak = max(max_peak, value)
            max_dd = max(max_dd, max_peak - value)
        return max_dd / 100.0  # normalized 0-1

    def _estimate_bandwidth(self, history: List[Dict[str, Any]]) -> Optional[float]:
        """Estimate bandwidth from last entry content size and latency."""
        if not history:
            return None
        last = history[-1]
        size = last.get("content_length") or 0
        latency = last.get("response_ms") or 0
        if size == 0 or latency == 0:
            return None
        kbps = (size / 1024) / (latency / 1000)
        return round(kbps, 2)

    def _percentile(self, data: List[float], percentile: float) -> float:
        """Compute percentile safely."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * (percentile / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return sorted_data[int(k)]
        return sorted_data[f] * (c - k) + sorted_data[c] * (k - f)

    # ------------------------------------------------------------------
    # Alerting
    # ------------------------------------------------------------------
    def evaluate_alerts(self, metrics: Dict[str, Dict[str, Any]]) -> None:
        """Create threshold-based alerts."""
        for m in metrics.values():
            alerts = []
            if m["avg_latency_ms"] and m["avg_latency_ms"] > self.thresholds.response_ms_critical:
                alerts.append(("CRITICAL_LATENCY", f"Latency {m['avg_latency_ms']:.0f}ms"))
            elif m["avg_latency_ms"] and m["avg_latency_ms"] > self.thresholds.response_ms_warning:
                alerts.append(("HIGH_LATENCY", f"Latency {m['avg_latency_ms']:.0f}ms"))

            if m["error_rate"] >= self.thresholds.error_rate_critical:
                alerts.append(("CRITICAL_ERRORS", f"Error rate {m['error_rate']*100:.1f}%"))
            elif m["error_rate"] >= self.thresholds.error_rate_warning:
                alerts.append(("ELEVATED_ERRORS", f"Error rate {m['error_rate']*100:.1f}%"))

            if m["health_score"] <= self.thresholds.health_critical:
                alerts.append(("CRISIS_HEALTH", f"Health {m['health_score']:.1f}"))
            elif m["health_score"] <= self.thresholds.health_warning:
                alerts.append(("DEGRADED_HEALTH", f"Health {m['health_score']:.1f}"))

            for alert_type, detail in alerts:
                alert_record = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "world_id": m["world_id"],
                    "world_name": m["world_name"],
                    "agent": m["agent"],
                    "type": alert_type,
                    "detail": detail,
                }
                self.alert_log.append(alert_record)
                print(f"[ALERT] {alert_type} - {m['world_name']}: {detail}")

        # Trim alert log to keep file manageable
        self.alert_log = self.alert_log[-500 :]

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def persist_state(self, metrics: Dict[str, Dict[str, Any]]) -> None:
        """Persist history, alerts, and latest snapshot to JSON files."""
        snapshot = {
            "generated_at": datetime.utcnow().isoformat(),
            "worlds": list(metrics.values()),
        }
        history_payload = {
            "generated_at": datetime.utcnow().isoformat(),
            "world_history": {
                world_id: state.history for world_id, state in self.world_states.items()
            },
        }
        alerts_payload = {
            "generated_at": datetime.utcnow().isoformat(),
            "alerts": self.alert_log,
        }

        self.snapshot_path.write_text(json.dumps(snapshot, indent=2))
        self.history_path.write_text(json.dumps(history_payload, indent=2))
        self.alerts_path.write_text(json.dumps(alerts_payload, indent=2))

    # ------------------------------------------------------------------
    # Phase 3 anomaly integration
    # ------------------------------------------------------------------
    def run_anomaly_overlay(self, metrics: Dict[str, Dict[str, Any]]) -> None:
        """Feed current metrics into Phase 3 anomaly detector (if available)."""
        if not metrics:
            return

        try:
            import pandas as pd
            from phase3_anomaly_detection import EcosystemAnomalyDetector
        except Exception as exc:  # noqa: BLE001
            print(f"[Anomaly Integration] Skipped (dependency unavailable: {exc})")
            return

        df_records = []
        for m in metrics.values():
            df_records.append({
                "world_id": m["world_id"],
                "world_name": m["world_name"],
                "current_composite": m["health_score"],
                "composite_trend": m["composite_trend"],
                "volatility": m["volatility"],
                "max_drawdown": m["max_drawdown"],
                "stability_score": m["stability_score"],
                "distance_to_crisis": m["distance_to_crisis"],
                "relative_to_mean": m["relative_to_mean"],
                "z_score": m["z_score"],
                "crisis_flag": 1 if m["crisis_flag"] else 0,
                "warning_flag": 1 if m["warning_flag"] else 0,
            })

        df = pd.DataFrame(df_records)

        detector = EcosystemAnomalyDetector(contamination=0.2)
        anomalies = detector.detect_anomalies(df)

        overlay = {
            "generated_at": datetime.utcnow().isoformat(),
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies,
        }
        self.anomaly_overlay_path.write_text(json.dumps(overlay, indent=2))
        print(f"[Anomaly Integration] Completed with {len(anomalies)} anomalies (phase3 overlay)")


# ----------------------------------------------------------------------
# Entrypoint helpers
# ----------------------------------------------------------------------
async def _main() -> None:
    monitor = Phase4PerformanceMonitor()
    try:
        await monitor.run()
    except KeyboardInterrupt:
        print("\nReceived interrupt; exiting monitor.")


if __name__ == "__main__":
    asyncio.run(_main())
