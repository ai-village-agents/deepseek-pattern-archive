#!/usr/bin/env python3
"""
Collect health and content metrics for all SEED_WORLDS.

Features:
- Loads SEED_WORLDS from js/cross-world-api.js (no manual duplication).
- Measures HTTP status + response time and performs light content analysis.
- Persists time-series JSON with timestamped runs to track evolution.
- Computes per-run summary plus growth deltas vs. the previous run.
- Designed for periodic execution (cron/systemd every 5-10 minutes).
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

ROOT = Path(__file__).resolve().parent
CROSS_WORLD_FILE = ROOT / "js" / "cross-world-api.js"
DEFAULT_OUTPUT = ROOT / "world-metrics-timeseries.json"
USER_AGENT = "PatternArchive/metrics-collector/1.0"


def load_seed_worlds() -> List[Dict[str, Any]]:
    """Parse SEED_WORLDS from the JS source using a minimal literal parser."""
    text = CROSS_WORLD_FILE.read_text(encoding="utf-8")
    match = re.search(r"const\s+SEED_WORLDS\s*=\s*(\[[\s\S]*?\])", text)
    if not match:
        raise RuntimeError("SEED_WORLDS array not found in cross-world-api.js")
    literal = match.group(1)

    # Convert the JS object literal into a Python-friendly literal.
    key_pattern = re.compile(r"(^\s*|\{|\[|,)\s*([A-Za-z0-9_]+)\s*:", flags=re.MULTILINE)
    quoted_keys = key_pattern.sub(lambda m: f"{m.group(1)}'{m.group(2)}':", literal)

    try:
        return ast.literal_eval(quoted_keys)
    except Exception as exc:  # pragma: no cover - defensive guardrail
        raise RuntimeError(f"Failed to parse SEED_WORLDS: {exc}") from exc


def analyze_content(html: str) -> Dict[str, Any]:
    """Extract lightweight signals without heavy parsing."""
    if not html:
        return {"content_size": 0, "title": None, "keyword_hits": {}}

    title_match = re.search(r"<title>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    lower_html = html.lower()
    keywords = ["pattern", "world", "signal", "portal", "canvas", "archive", "drift"]
    keyword_hits = {k: lower_html.count(k) for k in keywords}

    return {
        "content_size": len(html),
        "title": title_match.group(1).strip() if title_match else None,
        "keyword_hits": keyword_hits,
    }


def fetch_world_metrics(world: Dict[str, Any], timeout: float = 10.0) -> Dict[str, Any]:
    url = world.get("homepage") or world.get("baseUrl")
    started = time.perf_counter()
    result: Dict[str, Any] = {
        "id": world.get("id"),
        "name": world.get("name"),
        "type": world.get("type"),
        "checked_url": url,
        "status_code": None,
        "ok": False,
        "response_ms": None,
        "error": None,
        "content": {},
    }

    try:
        resp = requests.get(
            url,
            timeout=timeout,
            allow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        result["status_code"] = resp.status_code
        result["response_ms"] = elapsed_ms
        result["ok"] = resp.status_code < 400

        if resp.ok and resp.text:
            # Only run light analysis to avoid heavy memory usage.
            result["content"] = analyze_content(resp.text[:200_000])
        else:
            result["content"] = {"content_size": len(resp.content), "title": None, "keyword_hits": {}}
    except requests.exceptions.Timeout:
        result["error"] = f"timeout after {timeout}s"
        result["response_ms"] = round((time.perf_counter() - started) * 1000, 2)
    except requests.exceptions.RequestException as exc:
        result["error"] = str(exc)
        result["response_ms"] = round((time.perf_counter() - started) * 1000, 2)
    except Exception as exc:  # pragma: no cover - unexpected edge
        result["error"] = f"unexpected error: {exc}"
        result["response_ms"] = round((time.perf_counter() - started) * 1000, 2)

    return result


def load_existing_series(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # pragma: no cover - recover from corrupted file
        backup = path.with_suffix(path.suffix + ".backup")
        path.rename(backup)
        print(f"Corrupted metrics file moved to {backup}")
        return []


def compute_summary(run: Dict[str, Any], previous: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    worlds = run["worlds"]
    response_times = [w["response_ms"] for w in worlds if isinstance(w.get("response_ms"), (int, float))]
    availability = sum(1 for w in worlds if w.get("ok"))

    summary: Dict[str, Any] = {
        "timestamp": run["timestamp"],
        "world_count": len(worlds),
        "available": availability,
        "availability_pct": round((availability / len(worlds)) * 100, 2) if worlds else 0.0,
        "avg_response_ms": round(statistics.mean(response_times), 2) if response_times else None,
        "median_response_ms": round(statistics.median(response_times), 2) if response_times else None,
    }

    if previous:
        prev_worlds = {w["id"]: w for w in previous.get("worlds", [])}
        deltas = []
        status_changes = 0

        for w in worlds:
            prev = prev_worlds.get(w["id"])
            if not prev:
                continue
            if isinstance(w.get("response_ms"), (int, float)) and isinstance(prev.get("response_ms"), (int, float)):
                deltas.append(w["response_ms"] - prev["response_ms"])
            if prev.get("ok") != w.get("ok"):
                status_changes += 1

        summary["avg_response_delta_ms"] = round(statistics.mean(deltas), 2) if deltas else None
        summary["status_change_count"] = status_changes
    else:
        summary["avg_response_delta_ms"] = None
        summary["status_change_count"] = 0

    return summary


def collect_metrics(concurrency: int = 6, timeout: float = 10.0) -> Dict[str, Any]:
    worlds = load_seed_worlds()
    results: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        future_to_world = {executor.submit(fetch_world_metrics, world, timeout): world for world in worlds}
        for future in as_completed(future_to_world):
            try:
                results.append(future.result())
            except Exception as exc:  # pragma: no cover - catch-all for thread errors
                world = future_to_world[future]
                results.append(
                    {
                        "id": world.get("id"),
                        "name": world.get("name"),
                        "type": world.get("type"),
                        "checked_url": world.get("homepage") or world.get("baseUrl"),
                        "status_code": None,
                        "ok": False,
                        "response_ms": None,
                        "error": f"unhandled: {exc}",
                        "content": {},
                    }
                )

    run = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "worlds": sorted(results, key=lambda w: (w.get("id") or "")),
    }
    return run


def main():
    parser = argparse.ArgumentParser(description="Collect metrics for Pattern Archive SEED_WORLDS.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Path to time-series JSON file (default: world-metrics-timeseries.json)",
    )
    parser.add_argument("--concurrency", type=int, default=6, help="Parallel fetch worker count")
    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="Per-request timeout in seconds",
    )
    args = parser.parse_args()

    prior_runs = load_existing_series(args.output)
    previous = prior_runs[-1] if prior_runs else None

    current_run = collect_metrics(concurrency=args.concurrency, timeout=args.timeout)
    current_run["summary"] = compute_summary(current_run, previous)

    if previous:
        current_run["trend_vs_previous"] = {
            "availability_change": current_run["summary"]["available"] - previous.get("summary", {}).get("available", 0),
            "avg_response_delta_ms": current_run["summary"]["avg_response_delta_ms"],
            "status_changes": current_run["summary"]["status_change_count"],
        }

    prior_runs.append(current_run)
    args.output.write_text(json.dumps(prior_runs, indent=2), encoding="utf-8")

    summary = current_run["summary"]
    print(f"Run at {summary['timestamp']}")
    print(f"Worlds checked: {summary['world_count']}")
    print(f"Availability: {summary['available']}/{summary['world_count']} ({summary['availability_pct']}%)")
    if summary.get("avg_response_ms") is not None:
        print(f"Avg response: {summary['avg_response_ms']} ms (median {summary['median_response_ms']} ms)")
    if previous:
        print(
            f"Delta vs previous: avg response change {summary['avg_response_delta_ms']} ms, "
            f"status changes {summary['status_change_count']}"
        )
    print(f"Saved to: {args.output}")


if __name__ == "__main__":
    main()
