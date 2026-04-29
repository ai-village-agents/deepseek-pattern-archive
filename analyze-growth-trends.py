#!/usr/bin/env python3
"""
Analyze growth, availability, response times, and cross-world correlations
for the world metrics time series. Emphasizes The Drift's rapid growth.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from statistics import mean, median
from typing import Dict, Iterable, List, Optional, Tuple

DEFAULT_DATA_PATH = Path(__file__).with_name("world-metrics-timeseries.json")


@dataclass
class WorldPoint:
    timestamp: datetime
    ok: bool
    response_ms: Optional[float]
    content_size: Optional[int]
    keyword_total: Optional[int]


@dataclass
class WorldSeries:
    world_id: str
    name: str
    type: Optional[str]
    points: List[WorldPoint] = field(default_factory=list)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze growth trends from world-metrics-timeseries.json"
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to world metrics timeseries JSON file",
    )
    parser.add_argument(
        "--plots",
        action="store_true",
        help="If matplotlib is available, save simple PNG plots for visual insight",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("analysis-output"),
        help="Directory to store generated plots (used with --plots)",
    )
    return parser.parse_args()


def load_timeseries(path: Path) -> List[dict]:
    raw = json.loads(path.read_text())
    raw.sort(key=lambda entry: entry["timestamp"])
    return raw


def build_world_series(raw: List[dict]) -> Dict[str, WorldSeries]:
    series: Dict[str, WorldSeries] = {}
    for snapshot in raw:
        ts = datetime.fromisoformat(snapshot["timestamp"])
        for world in snapshot.get("worlds", []):
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
            keyword_hits = content.get("keyword_hits")
            keyword_total = None
            if keyword_hits is not None:
                keyword_total = sum(keyword_hits.values())
            point = WorldPoint(
                timestamp=ts,
                ok=bool(world.get("ok")),
                response_ms=world.get("response_ms"),
                content_size=content.get("content_size"),
                keyword_total=keyword_total,
            )
            record.points.append(point)
    for record in series.values():
        record.points.sort(key=lambda p: p.timestamp)
    return series


def first_last(values: Iterable[Optional[float]]) -> Tuple[Optional[float], Optional[float]]:
    vals = [v for v in values if v is not None]
    if not vals:
        return None, None
    return vals[0], vals[-1]


def pct_change(first: Optional[float], last: Optional[float]) -> Optional[float]:
    if first is None or last is None or first == 0:
        return None
    return (last - first) / first * 100.0


def availability_stats(points: List[WorldPoint]) -> Tuple[float, int]:
    total = len(points)
    ok_count = sum(1 for p in points if p.ok)
    return (ok_count / total * 100.0 if total else 0.0, total - ok_count)


def response_trend(points: List[WorldPoint]) -> Tuple[Optional[float], Optional[float]]:
    first, last = first_last(p.response_ms for p in points)
    if first is None or last is None:
        return None, None
    return last - first, pct_change(first, last)


def growth_summary(record: WorldSeries) -> dict:
    cs_first, cs_last = first_last(p.content_size for p in record.points)
    kw_first, kw_last = first_last(p.keyword_total for p in record.points)
    resp_first, resp_last = first_last(p.response_ms for p in record.points)
    return {
        "content_size": {
            "first": cs_first,
            "last": cs_last,
            "pct": pct_change(cs_first, cs_last),
        },
        "keyword_total": {
            "first": kw_first,
            "last": kw_last,
            "pct": pct_change(kw_first, kw_last),
        },
        "response_ms": {
            "first": resp_first,
            "last": resp_last,
            "pct": pct_change(resp_first, resp_last),
        },
    }


def pearson_corr(xs: List[float], ys: List[float]) -> Optional[float]:
    n = min(len(xs), len(ys))
    if n < 2:
        return None
    mean_x, mean_y = mean(xs[:n]), mean(ys[:n])
    cov = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
    var_x = sum((xs[i] - mean_x) ** 2 for i in range(n))
    var_y = sum((ys[i] - mean_y) ** 2 for i in range(n))
    if var_x == 0 or var_y == 0:
        return None
    return cov / math.sqrt(var_x * var_y)


def drift_case_study(series: Dict[str, WorldSeries]) -> None:
    drift = series.get("sonnet-46-drift")
    if not drift:
        print("Drift case study: No Drift entries found.")
        return

    print("\n=== The Drift Growth Case Study ===")
    summary = growth_summary(drift)
    availability_pct, downtime = availability_stats(drift.points)
    print(f"Name: {drift.name} ({drift.world_id})")
    print(f"Observations: {len(drift.points)}, Availability: {availability_pct:.1f}% ({downtime} downtime events)")
    print(
        f"Keyword traffic: {summary['keyword_total']['first']} -> {summary['keyword_total']['last']} "
        f"({fmt_pct(summary['keyword_total']['pct'])})"
    )
    print(
        f"Content size: {summary['content_size']['first']} -> {summary['content_size']['last']} "
        f"({fmt_pct(summary['content_size']['pct'])})"
    )
    print(
        f"Response time: {summary['response_ms']['first']} -> {summary['response_ms']['last']} ms "
        f"({fmt_pct(summary['response_ms']['pct'])})"
    )

    # Scan for the strongest burst and the sharpest drop to illustrate volatility.
    intervals = []
    points = drift.points
    for a, b in zip(points, points[1:]):
        minutes = max((b.timestamp - a.timestamp).total_seconds() / 60.0, 1e-9)
        content_delta = (b.content_size or 0) - (a.content_size or 0)
        keyword_delta = (b.keyword_total or 0) - (a.keyword_total or 0)
        intervals.append(
            {
                "start": a.timestamp,
                "end": b.timestamp,
                "minutes": minutes,
                "content_delta": content_delta,
                "keyword_delta": keyword_delta,
            }
        )

    if intervals:
        fastest = max(intervals, key=lambda i: i["content_delta"])
        steepest_drop = min(intervals, key=lambda i: i["content_delta"])
        if fastest["content_delta"] > 0:
            start_size = next(p.content_size or 0 for p in points if p.timestamp == fastest["start"])
            pct = pct_change(start_size, start_size + fastest["content_delta"])
            rate = fastest["content_delta"] / fastest["minutes"]
            print(
                f"Fastest content growth burst: +{fastest['content_delta']} bytes in "
                f"{fastest['minutes']:.1f} min ({fmt_pct(pct)}), ~{rate:.0f} bytes/min"
            )
        if steepest_drop["content_delta"] < 0:
            print(
                f"Sharpest collapse: {steepest_drop['content_delta']} bytes in "
                f"{steepest_drop['minutes']:.1f} min"
            )

    print("Per-snapshot traffic (keywords) trend:")
    drift_vals = [p.keyword_total or 0 for p in drift.points]
    print(render_ascii_bars(drift_vals, [p.timestamp for p in drift.points]))


def fmt_pct(pct: Optional[float]) -> str:
    if pct is None:
        return "n/a"
    return f"{pct:+.1f}%"


def render_ascii_bars(values: List[float], timestamps: List[datetime], width: int = 40) -> str:
    if not values:
        return "  (no data)"
    max_val = max(values) or 1
    lines = []
    for ts, val in zip(timestamps, values):
        bar_len = int((val / max_val) * width)
        bar = "#" * bar_len
        lines.append(f"  {ts.isoformat(timespec='seconds')}: {bar} {val}")
    return "\n".join(lines)


def print_growth_rates(series: Dict[str, WorldSeries]) -> None:
    print("=== Growth rates by world (keyword traffic & content size) ===")
    rows = []
    for record in series.values():
        summary = growth_summary(record)
        rows.append(
            (
                record.name,
                summary["keyword_total"]["pct"],
                summary["content_size"]["pct"],
            )
        )
    rows.sort(key=lambda r: (r[1] or -math.inf), reverse=True)
    for name, kw_pct, cs_pct in rows:
        print(
            f"- {name}: keyword {fmt_pct(kw_pct)}, content size {fmt_pct(cs_pct)}"
        )


def print_connectivity(series: Dict[str, WorldSeries]) -> None:
    print("\n=== Connectivity & availability ===")
    for record in series.values():
        pct, downtime = availability_stats(record.points)
        print(f"- {record.name}: {pct:.1f}% available, downtime events: {downtime}")


def print_response_trends(series: Dict[str, WorldSeries]) -> None:
    print("\n=== Response time trends ===")
    for record in series.values():
        delta, pct = response_trend(record.points)
        delta_str = f"{delta:+.2f} ms" if delta is not None else "n/a"
        print(f"- {record.name}: delta {delta_str}, change {fmt_pct(pct)}")


def print_cross_world_correlations(series: Dict[str, WorldSeries]) -> None:
    drift = series.get("sonnet-46-drift")
    if not drift:
        print("\n=== Cross-world correlations ===\nNo Drift data found.")
        return
    print("\n=== Cross-world correlations vs Drift keyword traffic ===")
    drift_map = {p.timestamp: p.keyword_total for p in drift.points if p.keyword_total is not None}
    for world_id, record in series.items():
        if world_id == drift.world_id:
            continue
        paired_x, paired_y = [], []
        for p in record.points:
            if p.keyword_total is None:
                continue
            drift_val = drift_map.get(p.timestamp)
            if drift_val is None:
                continue
            paired_x.append(drift_val)
            paired_y.append(p.keyword_total)
        corr = pearson_corr(paired_x, paired_y)
        sample_count = len(paired_x)
        corr_str = f"{corr:.2f}" if corr is not None else "n/a"
        print(f"- {record.name}: corr={corr_str} (n={sample_count})")


def print_summary(raw: List[dict]) -> None:
    print("=== Summary statistics ===")
    timestamps = [datetime.fromisoformat(s["timestamp"]) for s in raw]
    if timestamps:
        print(
            f"Snapshots: {len(timestamps)}, range: {timestamps[0].isoformat()} -> {timestamps[-1].isoformat()}"
        )
    availabilities = []
    responses = []
    for snap in raw:
        summary = snap.get("summary", {})
        if "availability_pct" in summary:
            availabilities.append(summary["availability_pct"])
        if "avg_response_ms" in summary:
            responses.append(summary["avg_response_ms"])
    if availabilities:
        print(f"Global availability avg: {mean(availabilities):.2f}%")
    if responses:
        print(
            f"Average response ms (mean/median): {mean(responses):.2f} / {median(responses):.2f}"
        )


def maybe_make_plots(series: Dict[str, WorldSeries], out_dir: Path) -> None:
    try:
        import matplotlib.pyplot as plt
    except Exception as exc:  # pragma: no cover - optional visualization aid
        print(f"(Skipping plots: matplotlib unavailable: {exc})")
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    drift = series.get("sonnet-46-drift")
    if drift:
        times = [p.timestamp for p in drift.points]
        kw = [p.keyword_total or 0 for p in drift.points]
        resp = [p.response_ms or 0 for p in drift.points]
        fig, ax1 = plt.subplots()
        ax1.plot(times, kw, marker="o", color="tab:blue", label="Keyword traffic")
        ax1.set_ylabel("Keyword total", color="tab:blue")
        ax2 = ax1.twinx()
        ax2.plot(times, resp, marker="x", color="tab:red", label="Response ms")
        ax2.set_ylabel("Response ms", color="tab:red")
        ax1.set_title("The Drift growth & responsiveness")
        fig.autofmt_xdate()
        fig.tight_layout()
        drift_path = out_dir / "drift-growth.png"
        fig.savefig(drift_path, dpi=200)
        print(f"Saved Drift plot to {drift_path}")
        plt.close(fig)

    # Aggregate availability plot
    fig, ax = plt.subplots()
    for record in series.values():
        times = [p.timestamp for p in record.points]
        availability = [1 if p.ok else 0 for p in record.points]
        ax.plot(times, availability, marker=".", label=record.name)
    ax.set_title("World availability over time (1=up, 0=down)")
    ax.set_ylim(-0.1, 1.1)
    fig.autofmt_xdate()
    fig.legend(fontsize="x-small")
    fig.tight_layout()
    availability_path = out_dir / "availability.png"
    fig.savefig(availability_path, dpi=200)
    print(f"Saved availability plot to {availability_path}")
    plt.close(fig)


def main() -> None:
    args = parse_args()
    raw = load_timeseries(args.data)
    series = build_world_series(raw)

    print_summary(raw)
    print_growth_rates(series)
    print_connectivity(series)
    print_response_trends(series)
    print_cross_world_correlations(series)
    drift_case_study(series)

    if args.plots:
        maybe_make_plots(series, args.out_dir)


if __name__ == "__main__":
    main()
