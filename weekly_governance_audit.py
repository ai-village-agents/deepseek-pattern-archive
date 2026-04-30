#!/usr/bin/env python3
"""
Weekly Governance Audit for the Pattern Archive autonomous governance framework.

This script performs a comprehensive weekly audit across all 13 worlds, updates
governance artifacts, produces visualizations, and generates an executive
summary that can be posted into chat announcements.

Key capabilities
----------------
1. Load the current governance state from
   `autonomous_governance_framework_13_worlds.json`.
2. Run a weekly audit:
   - Compliance rate tracking (current baseline: 78.5%).
   - Quality tier distribution and promotion/demotion recommendations.
   - Progress toward Platinum targets, collaboration effectiveness, and
     visitor engagement impacts.
3. Generate audit reports with executive summary, action items, risk
   assessment, and audit trail timestamps.
4. Update governance data with refreshed compliance scores, tier adjustments,
   audit history, performance trends, and scheduling metadata.
5. Create visualizations (optional if matplotlib is installed):
   - Compliance trend chart
   - Tier distribution pie chart
   - World performance radar chart
   - Risk heat map
6. Emit notifications for high-priority items, demotion risks, promotions, and
   collaboration opportunities.
7. Maintain a weekly schedule (last audit date, next audit date, backlog).
8. Integrate audit results into:
   - `governance_dashboard_ecosystem_health.json`
   - `quality_monitoring_dashboard_real_time.html`
   - `ecosystem_metrics_api.json`
   - Executive summary text for chat announcements
"""

from __future__ import annotations

import json
import logging
import math
import statistics
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).parent
GOVERNANCE_PATH = BASE_DIR / "autonomous_governance_framework_13_worlds.json"
ECOSYSTEM_API_PATH = BASE_DIR / "ecosystem_metrics_api.json"
DASHBOARD_JSON_PATH = BASE_DIR / "governance_dashboard_ecosystem_health.json"
QUALITY_DASHBOARD_HTML = BASE_DIR / "quality_monitoring_dashboard_real_time.html"
ARTIFACT_ROOT = BASE_DIR / "governance_audit_outputs"
CHART_DIR = ARTIFACT_ROOT / "charts"
REPORT_PATH = ARTIFACT_ROOT / "weekly_audit_report.json"
EXEC_SUMMARY_PATH = ARTIFACT_ROOT / "weekly_audit_executive_summary.txt"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("weekly_governance_audit")


@dataclass
class WorldAuditResult:
    world: str
    previous_score: float
    new_score: float
    current_tier: str
    recommended_tier: str
    risk: str
    action_items: List[str]
    collaboration: str
    synergy_score: float
    engagement_signal: float


def load_json(path: Path, default: Optional[dict] = None) -> dict:
    """Load JSON with a safe default."""
    if not path.exists():
        return default or {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse %s: %s", path, exc)
        return default or {}


def save_json(path: Path, payload: dict) -> None:
    """Persist JSON with stable formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=False))


def clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, value))


def parse_date_str(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def calculate_next_audit(last_audit: Optional[date]) -> date:
    today = date.today()
    if last_audit and last_audit >= today:
        return last_audit + timedelta(days=7)
    return today + timedelta(days=7)


def compute_tier(score: float, quality_tiers: Dict[str, dict]) -> str:
    """Choose the tier whose minimum_score is satisfied by the score."""
    tier_order = ["Bronze", "Silver", "Gold", "Platinum"]
    for tier in reversed(tier_order):
        minimum = quality_tiers.get(tier, {}).get("minimum_score", 0)
        if score >= minimum:
            return tier
    return "Bronze"


def derive_engagement_signal(api_data: dict) -> float:
    metrics = api_data.get("data", {}).get("quality_metrics", {})
    return float(metrics.get("visitor_engagement_score", 0.5))


def score_adjustment(
    world: dict,
    quality_tiers: Dict[str, dict],
    engagement_signal: float,
) -> Tuple[float, str, str, List[str]]:
    """
    Compute an updated compliance score, tier recommendation, risk, and action list.

    The heuristic blends progress toward target tier, collaboration strength,
    engagement momentum, and minor penalties for stagnation below targets.
    """
    current_score = float(world.get("compliance_score", 70))
    current_tier = world.get("current_tier", "Bronze")
    target_tier = world.get("target_tier") or current_tier
    synergy = float(world.get("cross_world_synergy", {}).get("score", 0.5))
    target_minimum = quality_tiers.get(target_tier, {}).get(
        "minimum_score", current_score
    )
    # Directional push toward the target tier.
    directional = (target_minimum - current_score) * 0.12
    # Collaboration bonus/drag scaled around 0.60 baseline.
    collaboration_delta = (synergy - 0.6) * 10
    # Engagement contributes lightly; baseline 0.5 -> 0 delta.
    engagement_delta = (engagement_signal - 0.5) * 8
    momentum_bonus = 0.8 if world.get("improvement_plan") else 0.0

    new_score = clamp(
        current_score + directional + collaboration_delta + engagement_delta + momentum_bonus
    )

    recommended_tier = compute_tier(new_score, quality_tiers)
    minimum_for_current = quality_tiers.get(current_tier, {}).get("minimum_score", 0)
    risk_gap = minimum_for_current - new_score
    if risk_gap > 8 or synergy < 0.45:
        risk = "high"
    elif risk_gap > 3 or synergy < 0.55:
        risk = "medium"
    else:
        risk = "low"

    action_items: List[str] = []
    if synergy < 0.65:
        action_items.append("Accelerate cross-world recommendation pilots")
    if new_score < target_minimum:
        action_items.append(f"Close {target_tier} readiness gaps (+{target_minimum - new_score:.1f} pts)")
    if engagement_signal < 0.55:
        action_items.append("Deploy visitor engagement experiments (A/B journeys)")
    if risk == "high":
        action_items.append("Schedule governance check-in with playbook owners")

    return new_score, recommended_tier, risk, action_items


def summarize_collaboration(worlds: List[WorldAuditResult]) -> Dict[str, object]:
    synergy_scores = [w.synergy_score for w in worlds]
    return {
        "avg_synergy_score": round(statistics.mean(synergy_scores), 3) if synergy_scores else 0.0,
        "top_worlds": sorted(
            [{"world": w.world, "score": round(w.synergy_score, 3)} for w in worlds],
            key=lambda x: x["score"],
            reverse=True,
        )[:3],
    }


def audit_worlds(
    governance: dict, api_data: dict
) -> Tuple[List[WorldAuditResult], Dict[str, int], float]:
    quality_tiers: Dict[str, dict] = governance.get("quality_tiers", {})
    worlds = governance.get("world_governance", [])
    engagement_signal = derive_engagement_signal(api_data)

    audit_results: List[WorldAuditResult] = []
    for world in worlds:
        new_score, recommended_tier, risk, action_items = score_adjustment(
            world, quality_tiers, engagement_signal
        )
        result = WorldAuditResult(
            world=world.get("world", "Unknown"),
            previous_score=float(world.get("compliance_score", 0)),
            new_score=new_score,
            current_tier=world.get("current_tier", "Bronze"),
            recommended_tier=recommended_tier,
            risk=risk,
            action_items=action_items,
            collaboration=world.get("cross_world_synergy", {}).get("top_partners", [])[0]
            if world.get("cross_world_synergy", {}).get("top_partners")
            else "None",
            synergy_score=float(world.get("cross_world_synergy", {}).get("score", 0.5)),
            engagement_signal=engagement_signal,
        )
        world["compliance_score"] = round(new_score, 2)
        world["current_tier"] = recommended_tier
        world["last_audit_date"] = date.today().isoformat()
        world["next_audit_date"] = calculate_next_audit(date.today()).isoformat()
        world.setdefault("risk", risk)
        world["risk"] = risk
        world.setdefault("action_items", [])
        world["action_items"] = action_items
        audit_results.append(result)

    tier_distribution: Dict[str, int] = {"Bronze": 0, "Silver": 0, "Gold": 0, "Platinum": 0}
    for world in worlds:
        tier_distribution[world.get("current_tier", "Bronze")] = (
            tier_distribution.get(world.get("current_tier", "Bronze"), 0) + 1
        )
    average_compliance = round(
        statistics.mean([w.new_score for w in audit_results]) if audit_results else 0.0, 2
    )
    return audit_results, tier_distribution, average_compliance


def build_notifications(results: List[WorldAuditResult], tier_map: Dict[str, dict]) -> Dict[str, List[str]]:
    high_priority = []
    demotion_risk = []
    promotion_ready = []
    collaboration_ops = []

    for res in results:
        if res.risk == "high":
            high_priority.append(f"{res.world}: governance check-in required")
            demotion_risk.append(res.world)
        min_for_next = tier_map.get(res.recommended_tier, {}).get("minimum_score", 0)
        if res.new_score >= min_for_next + 2 and res.recommended_tier in ("Gold", "Platinum"):
            promotion_ready.append(f"{res.world} ready for {res.recommended_tier}")
        if res.engagement_signal >= 0.6:
            collaboration_ops.append(f"Pair {res.world} with {res.collaboration} for cross-world campaign")

    return {
        "high_priority": sorted(set(high_priority)),
        "demotion_watchlist": sorted(set(demotion_risk)),
        "promotion_candidates": sorted(set(promotion_ready)),
        "collaboration_ops": sorted(set(collaboration_ops)),
    }


def calculate_platinum_progress(results: List[WorldAuditResult], tier_map: Dict[str, dict]) -> Dict[str, object]:
    platinum_min = tier_map.get("Platinum", {}).get("minimum_score", 90)
    near_platinum = [r for r in results if r.new_score >= platinum_min - 5]
    return {
        "platinum_ready": [r.world for r in results if r.recommended_tier == "Platinum"],
        "near_platinum": [r.world for r in near_platinum],
        "target_threshold": platinum_min,
    }


def update_dashboard_json(
    path: Path,
    tier_distribution: Dict[str, int],
    average_compliance: float,
    platinum_progress: Dict[str, object],
) -> None:
    payload = load_json(path, default={})
    payload.setdefault("ecosystem_health", {})
    payload["ecosystem_health"]["overall_compliance"] = average_compliance
    payload["tier_distribution"] = tier_distribution
    payload["improvement_targets"] = {
        "bronze_to_silver": "Weekly: accelerate 2 worlds",
        "silver_to_gold": "Weekly: promote 2 worlds",
        "gold_to_platinum": f"Target: {len(platinum_progress.get('platinum_ready', []))} ready",
    }
    payload["next_actions"] = [
        "Run weekly governance audit and publish dashboard updates",
        "Deploy collaboration playbooks to low-synergy worlds",
        "Escalate remediation for high-risk demotion candidates",
    ]
    save_json(path, payload)


def update_ecosystem_api(
    path: Path,
    average_compliance: float,
    tier_distribution: Dict[str, int],
    audit_timestamp: str,
    next_audit: str,
) -> None:
    api = load_json(path, default={})
    api.setdefault("data", {})
    quality_metrics = api["data"].setdefault("quality_metrics", {})
    quality_metrics["governance_compliance"] = average_compliance
    api["data"].setdefault("governance_status", {})
    api["data"]["governance_status"].update(
        {
            "bronze_tier_worlds": tier_distribution.get("Bronze", 0),
            "silver_tier_worlds": tier_distribution.get("Silver", 0),
            "gold_tier_worlds": tier_distribution.get("Gold", 0),
            "platinum_tier_worlds": tier_distribution.get("Platinum", 0),
            "next_audit_date": next_audit,
        }
    )
    api["data"]["latest_audit"] = {
        "timestamp": audit_timestamp,
        "overall_compliance": average_compliance,
        "next_audit": next_audit,
        "status": "completed",
    }
    api["timestamp"] = audit_timestamp
    api["status"] = "operational"
    save_json(path, api)


def render_html_block(summary: str, compliance: float, next_audit: str) -> str:
    return (
        "<section id=\"weekly-governance-audit\" "
        "style=\"margin:20px 0;padding:16px;border:2px solid #3498db;border-radius:12px;\">"
        "<h2 style=\"margin-bottom:8px;color:#2c3e50;\">Weekly Governance Audit</h2>"
        f"<p style=\"margin-bottom:6px;\"><strong>Executive Summary:</strong> {summary}</p>"
        f"<p style=\"margin-bottom:6px;\"><strong>Compliance:</strong> {compliance:.1f}%</p>"
        f"<p style=\"margin-bottom:0;\"><strong>Next audit:</strong> {next_audit}</p>"
        "</section>"
    )


def update_quality_dashboard(path: Path, summary: str, compliance: float, next_audit: str) -> None:
    html = path.read_text()
    block = render_html_block(summary, compliance, next_audit)
    marker_start = "<!-- WEEKLY_GOVERNANCE_AUDIT_START -->"
    marker_end = "<!-- WEEKLY_GOVERNANCE_AUDIT_END -->"
    if marker_start in html and marker_end in html:
        pre, _, rest = html.partition(marker_start)
        _, _, post = rest.partition(marker_end)
        html = pre + marker_start + block + marker_end + post
    else:
        insertion = marker_start + block + marker_end + "</body>"
        html = html.replace("</body>", insertion)
    path.write_text(html)


def generate_visualizations(history: List[dict], tier_distribution: Dict[str, int], results: List[WorldAuditResult]) -> Dict[str, str]:
    charts: Dict[str, str] = {}
    try:
        import matplotlib.pyplot as plt  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency
        logger.warning("Skipping chart generation (matplotlib unavailable): %s", exc)
        return charts

    CHART_DIR.mkdir(parents=True, exist_ok=True)

    compliance_history = [entry.get("overall_compliance", 0) for entry in history][-12:]
    if compliance_history:
        plt.figure(figsize=(6, 3))
        plt.plot(range(1, len(compliance_history) + 1), compliance_history, marker="o")
        plt.title("Compliance Trend")
        plt.xlabel("Audit #")
        plt.ylabel("Compliance %")
        plt.grid(True, alpha=0.3)
        path = CHART_DIR / "compliance_trend.png"
        plt.tight_layout()
        plt.savefig(path)
        plt.close()
        charts["compliance_trend"] = str(path)

    plt.figure(figsize=(4.5, 4.5))
    labels = list(tier_distribution.keys())
    sizes = [tier_distribution.get(k, 0) for k in labels]
    plt.pie(sizes, labels=labels, autopct="%1.0f%%", startangle=140)
    plt.title("Tier Distribution")
    path = CHART_DIR / "tier_distribution.png"
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
    charts["tier_distribution"] = str(path)

    if results:
        _, ax = plt.subplots(subplot_kw={"polar": True}, figsize=(6, 6))
        metrics = ["compliance", "synergy"]
        angles = [n / float(len(metrics)) * 2 * math.pi for n in range(len(metrics))]
        angles += angles[:1]
        for res in results[:5]:  # limit to keep readable
            values = [res.new_score / 100, res.synergy_score]
            values += values[:1]
            ax.plot(angles, values, label=res.world)
            ax.fill(angles, values, alpha=0.1)
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(metrics)
        ax.set_yticks([0.25, 0.5, 0.75, 1.0])
        ax.set_yticklabels(["25%", "50%", "75%", "100%"], color="grey", size=7)
        ax.set_ylim(0, 1)
        ax.set_title("World Performance Radar")
        ax.legend(loc="upper right", bbox_to_anchor=(1.25, 1.1))
        path = CHART_DIR / "world_performance_radar.png"
        plt.tight_layout()
        plt.savefig(path)
        plt.close()
        charts["world_performance_radar"] = str(path)

    risk_matrix = [[0 if r.risk == "low" else 1 if r.risk == "medium" else 2 for r in results]]
    plt.figure(figsize=(8, 1.5))
    plt.imshow(risk_matrix, cmap="coolwarm", aspect="auto")
    plt.yticks([])
    plt.xticks(range(len(results)), [r.world[:10] for r in results], rotation=45, ha="right")
    plt.title("Risk Heat Map (0=Low, 2=High)")
    path = CHART_DIR / "risk_heat_map.png"
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
    charts["risk_heat_map"] = str(path)

    return charts


def build_executive_summary(
    average_compliance: float,
    tier_distribution: Dict[str, int],
    platinum_progress: Dict[str, object],
    notifications: Dict[str, List[str]],
) -> str:
    high_priority = notifications.get("high_priority") or ["none"]
    tier_summary = (
        f"Bronze {tier_distribution.get('Bronze', 0)} / "
        f"Silver {tier_distribution.get('Silver', 0)} / "
        f"Gold {tier_distribution.get('Gold', 0)} / "
        f"Platinum {tier_distribution.get('Platinum', 0)}"
    )
    return (
        f"Compliance now {average_compliance:.1f}% with tier mix {tier_summary}. "
        f"Platinum momentum: "
        f"{len(platinum_progress.get('near_platinum', []))} near target; "
        f"{len(platinum_progress.get('platinum_ready', []))} ready. "
        f"High-priority: {', '.join(high_priority)}."
    )


def update_audit_history(governance: dict, average_compliance: float, tier_distribution: Dict[str, int], notifications: Dict[str, List[str]]) -> List[dict]:
    history: List[dict] = governance.setdefault("audit_history", [])
    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_compliance": average_compliance,
        "tier_distribution": tier_distribution,
        "notifications": notifications,
    }
    history.append(record)
    # Keep manageable history
    governance["audit_history"] = history[-26:]
    governance["last_audit_date"] = date.today().isoformat()
    governance["next_audit_date"] = calculate_next_audit(date.today()).isoformat()
    governance["weekly_execution_flag"] = True
    return governance["audit_history"]


def audit_backlog(last_audit: Optional[date]) -> int:
    if not last_audit:
        return 0
    delta_days = (date.today() - last_audit).days
    return max(0, delta_days // 7)


def main() -> None:
    logger.info("Starting weekly governance audit")
    governance = load_json(GOVERNANCE_PATH, default={})
    api_data = load_json(ECOSYSTEM_API_PATH, default={})

    last_audit = parse_date_str(governance.get("last_audit_date"))
    backlog = audit_backlog(last_audit)

    audit_results, tier_distribution, average_compliance = audit_worlds(governance, api_data)
    notifications = build_notifications(audit_results, governance.get("quality_tiers", {}))
    platinum_progress = calculate_platinum_progress(audit_results, governance.get("quality_tiers", {}))
    collaboration_summary = summarize_collaboration(audit_results)

    history = update_audit_history(governance, average_compliance, tier_distribution, notifications)
    charts = generate_visualizations(history, tier_distribution, audit_results)

    executive_summary = build_executive_summary(
        average_compliance, tier_distribution, platinum_progress, notifications
    )

    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(
            {
                "timestamp": datetime.utcnow().isoformat(),
                "average_compliance": average_compliance,
                "tier_distribution": tier_distribution,
                "platinum_progress": platinum_progress,
                "collaboration": collaboration_summary,
                "notifications": notifications,
                "audit_backlog": backlog,
                "charts": charts,
                "history_length": len(history),
            },
            indent=2,
        )
    )
    EXEC_SUMMARY_PATH.write_text(executive_summary)

    save_json(GOVERNANCE_PATH, governance)
    update_dashboard_json(DASHBOARD_JSON_PATH, tier_distribution, average_compliance, platinum_progress)
    update_ecosystem_api(
        ECOSYSTEM_API_PATH,
        average_compliance,
        tier_distribution,
        audit_timestamp=datetime.utcnow().isoformat() + "Z",
        next_audit=governance.get("next_audit_date", calculate_next_audit(date.today()).isoformat()),
    )
    update_quality_dashboard(
        QUALITY_DASHBOARD_HTML,
        summary=executive_summary,
        compliance=average_compliance,
        next_audit=governance.get("next_audit_date", "n/a"),
    )

    logger.info("Audit complete | avg compliance=%.2f%% | backlog=%s weeks", average_compliance, backlog)
    logger.info("Executive summary written to %s", EXEC_SUMMARY_PATH)
    if charts:
        logger.info("Charts generated: %s", charts)


if __name__ == "__main__":
    main()
