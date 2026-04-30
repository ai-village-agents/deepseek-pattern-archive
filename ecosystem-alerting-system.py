#!/usr/bin/env python3
"""Automated alerting for the 13-world ecosystem.

Reads health_scores.json, world-metrics-timeseries.json, and forecast-output.json
to detect downtime, performance degradation, health score drops, and growth
stagnation. Emits alerts to console plus simulated email/webhook sinks, applies
deduplication, supports escalation policies, and logs alerts historically.
"""

import argparse
import copy
import datetime as dt
import json
import os
import sys
import time
from typing import Any, Dict, Iterable, List, Optional, Tuple

# Default config is intentionally conservative and can be overridden via a JSON
# config file or CLI flags.
DEFAULT_CONFIG: Dict[str, Any] = {
    "thresholds": {
        "latency_ms_warn": 400,
        "latency_ms_crit": 900,
        "latency_increase_pct": 50.0,
        "health_drop_warn": 10.0,
        "health_drop_crit": 20.0,
        "growth_velocity_warn": 5.0,  # pages/hour
        "growth_velocity_crit": 0.0,
        "growth_accel_neg_warn": -100.0,  # pages/day^2
        "growth_accel_neg_crit": -1000.0,
        "saturation_warn": 0.25,
    },
    "dedup_minutes": 15,
    "escalation": {
        "email_on": ["warning", "critical"],
        "webhook_on": ["critical"],
        "repeat_interval_minutes": 30,
    },
    "logging": {"history_max_lines": 50000},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="13-world ecosystem automated alerting system"
    )
    parser.add_argument(
        "--health-file",
        default="health_scores.json",
        help="Path to health_scores.json (default: %(default)s)",
    )
    parser.add_argument(
        "--timeseries-file",
        default="world-metrics-timeseries.json",
        help="Path to world-metrics-timeseries.json (default: %(default)s)",
    )
    parser.add_argument(
        "--forecast-file",
        default="forecast-output.json",
        help="Path to forecast-output.json (default: %(default)s)",
    )
    parser.add_argument(
        "--config",
        help="Optional JSON config file to override defaults (thresholds, dedup, escalation)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=0,
        help="Seconds between checks; 0 runs once (default: %(default)s)",
    )
    parser.add_argument(
        "--log-file",
        default="alerts-history.log",
        help="Path to append historical alerts (default: %(default)s)",
    )
    parser.add_argument(
        "--enable-email",
        action="store_true",
        help="Enable simulated email sink (default: on for warnings/critical via policy)",
    )
    parser.add_argument(
        "--disable-email",
        action="store_true",
        help="Disable simulated email sink regardless of policy",
    )
    parser.add_argument(
        "--enable-webhook",
        action="store_true",
        help="Enable simulated webhook sink (default: on for critical via policy)",
    )
    parser.add_argument(
        "--disable-webhook",
        action="store_true",
        help="Disable simulated webhook sink regardless of policy",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single evaluation even if --interval is set",
    )
    return parser.parse_args()


def load_json_file(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def merge_dict(base: Dict[str, Any], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not override:
        return base
    result = copy.deepcopy(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = merge_dict(result[k], v)
        else:
            result[k] = v
    return result


def parse_ts(ts: str) -> dt.datetime:
    return dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))


def sorted_timeseries(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(entries, key=lambda e: parse_ts(e["timestamp"]))


class Deduper:
    def __init__(self, window_minutes: float, repeat_interval: float):
        self.window = dt.timedelta(minutes=window_minutes)
        self.repeat_interval = dt.timedelta(minutes=repeat_interval)
        self.last_seen: Dict[str, dt.datetime] = {}

    def should_emit(self, signature: str) -> bool:
        now = dt.datetime.utcnow()
        last = self.last_seen.get(signature)
        if last and now - last < self.window:
            return False
        self.last_seen[signature] = now
        return True

    def should_escalate(self, signature: str) -> bool:
        now = dt.datetime.utcnow()
        last = self.last_seen.get(f"escalate:{signature}")
        if last and now - last < self.repeat_interval:
            return False
        self.last_seen[f"escalate:{signature}"] = now
        return True


class Alert:
    def __init__(
        self,
        world_id: str,
        severity: str,
        category: str,
        message: str,
        detail: Dict[str, Any],
    ):
        self.world_id = world_id
        self.severity = severity
        self.category = category
        self.message = message
        self.detail = detail
        self.timestamp = dt.datetime.utcnow()

    @property
    def signature(self) -> str:
        return f"{self.world_id}:{self.category}:{self.severity}:{self.detail.get('code','')}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat() + "Z",
            "world": self.world_id,
            "severity": self.severity,
            "category": self.category,
            "message": self.message,
            "detail": self.detail,
        }


def latest_world_metrics(timeseries: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    ordered = sorted_timeseries(timeseries)
    latest = ordered[-1]
    prev = ordered[-2] if len(ordered) > 1 else None
    latest_map = {w["id"]: w for w in latest.get("worlds", [])}
    prev_map = {w["id"]: w for w in prev.get("worlds", [])} if prev else {}
    return latest_map, prev_map


def evaluate_availability(
    metrics: Dict[str, Any],
    prev_metrics: Dict[str, Any],
    thresholds: Dict[str, Any],
) -> Iterable[Alert]:
    for world_id, m in metrics.items():
        ok = m.get("ok", False)
        status = m.get("status_code")
        if not ok or status is None or status >= 400:
            yield Alert(
                world_id,
                "critical",
                "downtime",
                f"{world_id} is unavailable (status {status}, ok={ok})",
                {"code": "downtime", "status_code": status, "ok": ok},
            )
            continue

        latency = m.get("response_ms")
        if latency is None:
            continue

        if latency >= thresholds["latency_ms_crit"]:
            yield Alert(
                world_id,
                "critical",
                "performance",
                f"Latency {latency:.1f}ms exceeds critical threshold {thresholds['latency_ms_crit']}ms",
                {"code": "latency_crit", "latency_ms": latency},
            )
        elif latency >= thresholds["latency_ms_warn"]:
            yield Alert(
                world_id,
                "warning",
                "performance",
                f"Latency {latency:.1f}ms above warning threshold {thresholds['latency_ms_warn']}ms",
                {"code": "latency_warn", "latency_ms": latency},
            )

        prev_latency = prev_metrics.get(world_id, {}).get("response_ms")
        if prev_latency:
            delta_pct = ((latency - prev_latency) / prev_latency) * 100
            if delta_pct >= thresholds["latency_increase_pct"]:
                yield Alert(
                    world_id,
                    "warning",
                    "performance",
                    f"Latency regressed {delta_pct:.1f}% vs previous ({prev_latency:.1f}ms -> {latency:.1f}ms)",
                    {"code": "latency_regress", "delta_pct": delta_pct, "prev": prev_latency, "current": latency},
                )


def evaluate_health_scores(health: List[Dict[str, Any]], thresholds: Dict[str, Any]) -> Iterable[Alert]:
    for world in health:
        snapshots = sorted(world.get("snapshots", []), key=lambda s: parse_ts(s["timestamp"]))
        if len(snapshots) < 2:
            continue
        latest, prev = snapshots[-1], snapshots[-2]
        latest_comp = latest.get("scores", {}).get("composite")
        prev_comp = prev.get("scores", {}).get("composite")
        if latest_comp is None or prev_comp is None:
            continue
        drop = prev_comp - latest_comp
        if drop >= thresholds["health_drop_crit"]:
            yield Alert(
                world["world_id"],
                "critical",
                "health_score",
                f"Composite health dropped {drop:.1f} points ({prev_comp:.1f} -> {latest_comp:.1f})",
                {"code": "health_drop_crit", "drop": drop, "prev": prev_comp, "current": latest_comp},
            )
        elif drop >= thresholds["health_drop_warn"]:
            yield Alert(
                world["world_id"],
                "warning",
                "health_score",
                f"Composite health down {drop:.1f} points ({prev_comp:.1f} -> {latest_comp:.1f})",
                {"code": "health_drop_warn", "drop": drop, "prev": prev_comp, "current": latest_comp},
            )


def evaluate_growth(
    forecast: Dict[str, Any],
    thresholds: Dict[str, Any],
) -> Iterable[Alert]:
    velocities = forecast.get("velocities", {}) or {}
    accelerations = forecast.get("accelerations", {}) or {}
    saturation = forecast.get("saturation", {}) or {}

    for world_id, vel in velocities.items():
        page_velocity = vel.get("pages", {}).get("value")
        accel = accelerations.get(world_id, {}).get("pages", {}).get("value")
        sat = saturation.get(world_id, {})
        sat_score = sat.get("saturation_score")
        sat_status = sat.get("status")

        if page_velocity is None:
            continue

        if page_velocity <= thresholds["growth_velocity_crit"]:
            yield Alert(
                world_id,
                "critical",
                "growth",
                f"Growth velocity stalled at {page_velocity:.2f} pages/hour",
                {"code": "growth_velocity_crit", "velocity": page_velocity},
            )
        elif page_velocity <= thresholds["growth_velocity_warn"]:
            yield Alert(
                world_id,
                "warning",
                "growth",
                f"Growth velocity low at {page_velocity:.2f} pages/hour",
                {"code": "growth_velocity_warn", "velocity": page_velocity},
            )

        if accel is not None:
            if accel <= thresholds["growth_accel_neg_crit"]:
                yield Alert(
                    world_id,
                    "critical",
                    "growth",
                    f"Growth decelerating rapidly ({accel:.2f} pages/day^2)",
                    {"code": "growth_accel_crit", "accel": accel},
                )
            elif accel <= thresholds["growth_accel_neg_warn"]:
                yield Alert(
                    world_id,
                    "warning",
                    "growth",
                    f"Growth decelerating ({accel:.2f} pages/day^2)",
                    {"code": "growth_accel_warn", "accel": accel},
                )

        if sat_score is not None and sat_score <= thresholds["saturation_warn"]:
            yield Alert(
                world_id,
                "warning",
                "growth",
                f"Saturation risk ({sat_status or 'unknown'}, score {sat_score})",
                {"code": "saturation_warn", "saturation_score": sat_score, "status": sat_status},
            )


def emit_console(alert: Alert) -> None:
    ts = alert.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{alert.severity.upper()}] [{alert.category}] {alert.world_id} - {alert.message}")


def emit_email(alert: Alert) -> None:
    print(f"[EMAIL] To: ops@ecosystem  Subject: {alert.category}/{alert.severity} for {alert.world_id} :: {alert.message}")


def emit_webhook(alert: Alert) -> None:
    payload = json.dumps(alert.to_dict())
    print(f"[WEBHOOK] POST https://hooks.ops.local/alert payload={payload}")


def append_history(alert: Alert, path: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(alert.to_dict()) + "\n")


def trim_history(path: str, max_lines: int) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    if len(lines) <= max_lines:
        return
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines[-max_lines:])


def load_config(path: Optional[str]) -> Dict[str, Any]:
    if not path:
        return copy.deepcopy(DEFAULT_CONFIG)
    override = load_json_file(path)
    if not isinstance(override, dict):
        raise ValueError("Config file must contain a JSON object")
    return merge_dict(DEFAULT_CONFIG, override)


def run_once(
    args: argparse.Namespace,
    config: Dict[str, Any],
    deduper: Deduper,
    sinks: Dict[str, bool],
) -> None:
    try:
        health = load_json_file(args.health_file).get("worlds")
        timeseries = load_json_file(args.timeseries_file)
        forecast = load_json_file(args.forecast_file)
    except FileNotFoundError as exc:
        print(f"[ERROR] Missing input file: {exc}", file=sys.stderr)
        return
    except json.JSONDecodeError as exc:
        print(f"[ERROR] Failed to parse JSON: {exc}", file=sys.stderr)
        return

    if not isinstance(health, list) or not isinstance(timeseries, list) or not isinstance(forecast, dict):
        print("[ERROR] Unexpected data structures in input files", file=sys.stderr)
        return

    latest_metrics, prev_metrics = latest_world_metrics(timeseries)
    thresholds = config["thresholds"]
    alerts: List[Alert] = []
    alerts.extend(evaluate_availability(latest_metrics, prev_metrics, thresholds))
    alerts.extend(evaluate_health_scores(health, thresholds))
    alerts.extend(evaluate_growth(forecast, thresholds))

    for alert in alerts:
        if not deduper.should_emit(alert.signature):
            continue
        emit_console(alert)
        if sinks["email"] and alert.severity in config["escalation"]["email_on"]:
            if deduper.should_escalate(f"email:{alert.signature}"):
                emit_email(alert)
        if sinks["webhook"] and alert.severity in config["escalation"]["webhook_on"]:
            if deduper.should_escalate(f"webhook:{alert.signature}"):
                emit_webhook(alert)
        append_history(alert, args.log_file)

    trim_history(args.log_file, config["logging"]["history_max_lines"])


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    dedup_minutes = config.get("dedup_minutes", DEFAULT_CONFIG["dedup_minutes"])
    repeat_interval = config.get("escalation", {}).get(
        "repeat_interval_minutes", DEFAULT_CONFIG["escalation"]["repeat_interval_minutes"]
    )
    deduper = Deduper(dedup_minutes, repeat_interval)

    sinks = {
        "email": not args.disable_email if (args.enable_email or not args.disable_email) else False,
        "webhook": not args.disable_webhook if (args.enable_webhook or not args.disable_webhook) else False,
    }

    # If the user explicitly enables a sink, honor it.
    if args.enable_email:
        sinks["email"] = True
    if args.enable_webhook:
        sinks["webhook"] = True

    if args.interval <= 0 or args.once:
        run_once(args, config, deduper, sinks)
        return

    print(f"[INFO] Starting continuous monitoring every {args.interval}s. Ctrl+C to exit.")
    while True:
        run_once(args, config, deduper, sinks)
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
