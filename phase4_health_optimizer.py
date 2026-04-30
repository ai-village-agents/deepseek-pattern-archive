#!/usr/bin/env python3
"""
Phase 4: Health Optimizer

Automated optimization planning for the 13-world ecosystem with:
- Health trend analysis and early warning signals
- Priority-scored optimization recommendations (technical debt, performance, security, UX)
- Action plans with expected impact
- Cross-world dependency optimization for systemic wins
- Success tracking and ROI measurement for implemented optimizations

Run directly to generate `phase4_health_optimizer_plan.json` and
`phase4_health_optimizer_success.json` using the latest health data and
Phase 3 AI-generated recommendations.
"""

from __future__ import annotations

import json
import statistics
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

HEALTH_SCORES_PATH = Path("health_scores.json")
PHASE3_RECOMMENDATIONS_PATH = Path("automated_optimization_recommendations.json")
PLAN_OUTPUT_PATH = Path("phase4_health_optimizer_plan.json")
SUCCESS_TRACKING_PATH = Path("phase4_health_optimizer_success.json")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class TrendSignal:
    world_id: str
    name: str
    latest: float
    previous: float
    delta: float
    percent_change: float
    volatility: float
    connectivity: float
    performance: float
    growth: float
    engagement: float
    early_warning: bool
    direction: str
    anomalies: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class OptimizationAction:
    category: str
    action: str
    priority_score: float
    expected_impact: str
    rationale: str


# ---------------------------------------------------------------------------
# Core optimizer
# ---------------------------------------------------------------------------


class Phase4HealthOptimizer:
    """Generates proactive optimization plans for the 13-world ecosystem."""

    def __init__(
        self,
        health_scores_path: Path = HEALTH_SCORES_PATH,
        phase3_recommendations_path: Path = PHASE3_RECOMMENDATIONS_PATH,
        plan_output_path: Path = PLAN_OUTPUT_PATH,
        success_tracking_path: Path = SUCCESS_TRACKING_PATH,
    ) -> None:
        self.health_scores_path = health_scores_path
        self.phase3_recommendations_path = phase3_recommendations_path
        self.plan_output_path = plan_output_path
        self.success_tracking_path = success_tracking_path
        self.phase3_recs_by_world: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def run(self) -> Dict[str, Any]:
        health_scores = self._load_json(self.health_scores_path)
        self.phase3_recs_by_world = self._index_phase3_recommendations()

        trends, warnings = self._analyze_health_trends(health_scores)
        plan = self._build_plan(health_scores, trends, warnings)
        success_snapshot = self._build_success_tracking(trends)

        plan["success_tracking"] = success_snapshot
        self.plan_output_path.write_text(json.dumps(plan, indent=2))
        self.success_tracking_path.write_text(json.dumps(success_snapshot, indent=2))

        print(f"Plan generated for {len(trends)} worlds -> {self.plan_output_path}")
        print(f"Success tracking updated -> {self.success_tracking_path}")
        return plan

    # ------------------------------------------------------------------
    # Loading helpers
    # ------------------------------------------------------------------

    def _load_json(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Missing required data file: {path}")
        return json.loads(path.read_text())

    def _index_phase3_recommendations(self) -> Dict[str, Dict[str, Any]]:
        if not self.phase3_recommendations_path.exists():
            return {}
        try:
            data = json.loads(self.phase3_recommendations_path.read_text())
        except json.JSONDecodeError:
            return {}
        indexed: Dict[str, Dict[str, Any]] = {}
        for item in data:
            world_id = item.get("world_id")
            if world_id:
                indexed[world_id] = item
        return indexed

    # ------------------------------------------------------------------
    # Analysis
    # ------------------------------------------------------------------

    def _analyze_health_trends(
        self, health_scores: Dict[str, Any]
    ) -> Tuple[List[TrendSignal], List[Dict[str, Any]]]:
        trends: List[TrendSignal] = []
        warnings: List[Dict[str, Any]] = []

        for world in health_scores.get("worlds", []):
            world_id = world["world_id"]
            snapshots = world.get("snapshots", [])
            if not snapshots:
                continue

            latest_snapshot = snapshots[-1]["scores"]
            previous_snapshot = snapshots[-2]["scores"] if len(snapshots) > 1 else latest_snapshot

            latest = latest_snapshot["composite"]
            previous = previous_snapshot["composite"]
            delta = latest - previous
            percent_change = (delta / previous * 100) if previous else 0.0

            composite_points = [s["scores"]["composite"] for s in snapshots]
            volatility = statistics.pstdev(composite_points) if len(composite_points) > 1 else 0.0

            anomalies = world.get("anomalies", [])
            direction = "improving" if delta > 1 else "declining" if delta < -1 else "stable"

            early_warning = self._is_early_warning(
                latest=latest,
                delta=delta,
                percent_change=percent_change,
                volatility=volatility,
                anomalies=anomalies,
            )

            trend = TrendSignal(
                world_id=world_id,
                name=world.get("name", world_id),
                latest=latest,
                previous=previous,
                delta=delta,
                percent_change=percent_change,
                volatility=volatility,
                connectivity=latest_snapshot.get("connectivity", 0.0),
                performance=latest_snapshot.get("performance", 0.0),
                growth=latest_snapshot.get("growth", 0.0),
                engagement=latest_snapshot.get("engagement", 0.0),
                early_warning=early_warning,
                direction=direction,
                anomalies=anomalies,
            )
            trends.append(trend)

            if early_warning:
                warnings.append(
                    {
                        "world_id": world_id,
                        "world_name": trend.name,
                        "latest_health": round(latest, 2),
                        "delta": round(delta, 2),
                        "volatility": round(volatility, 2),
                        "reason": self._early_warning_reason(trend),
                    }
                )

        return trends, warnings

    def _is_early_warning(
        self,
        latest: float,
        delta: float,
        percent_change: float,
        volatility: float,
        anomalies: List[Dict[str, Any]],
    ) -> bool:
        anomaly_flag = any(a.get("severity") == "critical" for a in anomalies)
        fast_drop = delta <= -8 or percent_change <= -10
        low_health = latest < 70
        high_volatility = volatility > 10
        return anomaly_flag or fast_drop or low_health or high_volatility

    def _early_warning_reason(self, trend: TrendSignal) -> str:
        if any(a.get("severity") == "critical" for a in trend.anomalies):
            return "Phase 3 anomaly flagged as critical"
        if trend.latest < 70:
            return "Composite health below target (70)"
        if trend.delta <= -8:
            return "Rapid decline detected"
        if trend.volatility > 10:
            return "High volatility across recent snapshots"
        return "Trend flagged by heuristic"

    # ------------------------------------------------------------------
    # Plan construction
    # ------------------------------------------------------------------

    def _build_plan(
        self,
        health_scores: Dict[str, Any],
        trends: List[TrendSignal],
        warnings: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        ecosystem_latest = (
            health_scores.get("ecosystem", {}).get("snapshots", []) or [{}]
        )[-1].get("scores", {})
        world_plans = [self._build_world_plan(trend) for trend in trends]

        cross_world_actions = self._cross_world_dependency_actions(trends, ecosystem_latest)

        return {
            "generated_at": datetime.utcnow().isoformat(),
            "source_files": {
                "health_scores": str(self.health_scores_path),
                "phase3_recommendations": str(self.phase3_recommendations_path),
            },
            "ecosystem_latest": ecosystem_latest,
            "early_warnings": warnings,
            "world_plans": world_plans,
            "cross_world_actions": cross_world_actions,
        }

    def _build_world_plan(self, trend: TrendSignal) -> Dict[str, Any]:
        priority_score = self._priority_score(trend)
        actions = self._recommendations_for_world(trend, priority_score)
        action_plan = self._implementation_steps(trend, actions)
        phase3_alignment = self._phase3_alignment(trend.world_id)

        return {
            "world_id": trend.world_id,
            "world_name": trend.name,
            "latest_health": round(trend.latest, 2),
            "trend": {
                "direction": trend.direction,
                "delta": round(trend.delta, 2),
                "percent_change": round(trend.percent_change, 2),
                "volatility": round(trend.volatility, 2),
                "components": {
                    "connectivity": round(trend.connectivity, 2),
                    "performance": round(trend.performance, 2),
                    "growth": round(trend.growth, 2),
                    "engagement": round(trend.engagement, 2),
                },
                "early_warning": trend.early_warning,
            },
            "priority_score": priority_score,
            "recommendations": [asdict(a) for a in actions],
            "action_plan": action_plan,
            "phase3_alignment": phase3_alignment,
        }

    def _priority_score(self, trend: TrendSignal) -> float:
        risk = max(0.0, 100 - trend.latest)
        decline_pressure = max(0.0, -trend.delta * 2.5)
        volatility_penalty = min(15.0, trend.volatility)
        anomaly_penalty = 12.0 if any(a.get("severity") == "critical" for a in trend.anomalies) else 6.0 if trend.anomalies else 0.0
        early_warning_boost = 8.0 if trend.early_warning else 0.0

        score = (
            0.45 * risk
            + 0.25 * decline_pressure
            + volatility_penalty
            + anomaly_penalty
            + early_warning_boost
        )
        return round(min(100.0, score), 2)

    def _recommendations_for_world(
        self, trend: TrendSignal, priority_score: float
    ) -> List[OptimizationAction]:
        actions: List[OptimizationAction] = []

        # Performance improvements
        if trend.performance < 75 or trend.direction == "declining":
            actions.append(
                OptimizationAction(
                    category="Performance",
                    action="Implement CDN caching, async asset loading, and tighten timeouts",
                    priority_score=priority_score,
                    expected_impact="+8 to +15 health points",
                    rationale="Performance pillar below target; declining trend requires pre-emptive hardening",
                )
            )

        # Technical debt reduction
        if trend.volatility > 8 or trend.connectivity < 85:
            actions.append(
                OptimizationAction(
                    category="Technical Debt",
                    action="Refactor unstable modules, add retries/circuit breakers, and normalize observability",
                    priority_score=min(100.0, priority_score - 5),
                    expected_impact="+5 to +10 health points via stability gains",
                    rationale="High volatility/availability risk indicates debt affecting reliability",
                )
            )

        # Security enhancements (baseline safeguard)
        actions.append(
            OptimizationAction(
                category="Security",
                action="Run security headers audit, rotate credentials, and enable CSP/HSTS enforcement",
                priority_score=max(40.0, priority_score * 0.6),
                expected_impact="Risk reduction; prevent regressions during optimization",
                rationale="Security hardening minimizes exposure during rapid performance tuning",
            )
        )

        # UX optimizations
        if trend.engagement < 75 or trend.growth < 50:
            actions.append(
                OptimizationAction(
                    category="UX",
                    action="Optimize above-the-fold content, improve navigation, and add fast feedback loops",
                    priority_score=max(50.0, priority_score * 0.7),
                    expected_impact="+4 to +9 health points via engagement lift",
                    rationale="Engagement/growth lag suggests UX friction; front-load wins to stabilize trajectory",
                )
            )

        # Incorporate Phase 3 AI recommendations directly
        phase3_actions = self._phase3_alignment(trend.world_id).get("top_recommendations", [])
        for item in phase3_actions:
            actions.append(
                OptimizationAction(
                    category=item.get("category", "Phase3"),
                    action=item.get("action", "Apply Phase 3 recommendation"),
                    priority_score=min(100.0, priority_score + 5),
                    expected_impact=item.get("expected_improvement", "Health uplift expected"),
                    rationale=f"Phase 3 AI recommendation: {item.get('rationale', 'Validated in prior phase')}",
                )
            )

        # Remove potential duplicates by action text
        deduped: Dict[str, OptimizationAction] = {}
        for action in actions:
            deduped[action.action] = action
        return list(deduped.values())

    def _implementation_steps(
        self, trend: TrendSignal, actions: List[OptimizationAction]
    ) -> List[Dict[str, Any]]:
        steps: List[Dict[str, Any]] = []
        for action in actions:
            steps.append(
                {
                    "category": action.category,
                    "action": action.action,
                    "steps": [
                        "Diagnose scope with fresh traces/logs and align owners",
                        "Implement change with feature flag and staged rollout",
                        "Validate via synthetic checks and compare health deltas",
                    ],
                    "expected_impact": action.expected_impact,
                    "roi_score": self._estimate_roi(trend, action),
                }
            )
        return steps

    def _phase3_alignment(self, world_id: str) -> Dict[str, Any]:
        phase3_entry = self.phase3_recs_by_world.get(world_id)
        if not phase3_entry:
            return {"status": "no_phase3_alignment"}

        top_recs: List[Dict[str, Any]] = []
        categories = phase3_entry.get("recommendation_categories", {})
        for cat_actions in categories.values():
            for action in cat_actions:
                top_recs.append(
                    {
                        "category": action.get("category") or action.get("priority") or "Phase3",
                        "action": action.get("action"),
                        "expected_improvement": action.get("expected_improvement"),
                        "rationale": action.get("rationale"),
                    }
                )
        return {
            "status": "aligned",
            "source_generated_at": phase3_entry.get("generated_at"),
            "top_recommendations": top_recs[:3],
        }

    def _estimate_roi(self, trend: TrendSignal, action: OptimizationAction) -> Dict[str, Any]:
        health_gap = max(0.0, 90 - trend.latest)
        projected_gain = min(15.0, max(4.0, health_gap * 0.2))
        priority_weight = action.priority_score / 100
        roi_value = round(projected_gain * priority_weight, 2)
        return {
            "projected_health_gain": projected_gain,
            "relative_roi": roi_value,
            "confidence": "high" if trend.direction == "declining" else "medium",
        }

    def _cross_world_dependency_actions(
        self, trends: List[TrendSignal], ecosystem_latest: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        actions: List[Dict[str, Any]] = []

        low_performance = [t for t in trends if t.performance < 70]
        unstable = [t for t in trends if t.volatility > 8]
        engagement_drift = [t for t in trends if t.engagement < 70]

        if len(low_performance) >= 4:
            actions.append(
                {
                    "theme": "Performance baseline uplift",
                    "action": "Enable shared CDN rules, tighten timeouts, and ship a universal performance budget",
                    "worlds_impacted": [t.world_id for t in low_performance],
                    "expected_ecosystem_impact": "+10 composite to ecosystem performance pillar",
                }
            )

        if len(unstable) >= 3:
            actions.append(
                {
                    "theme": "Reliability & dependency hardening",
                    "action": "Roll out circuit breakers, bulkhead isolation, and dependency version locks across all portals",
                    "worlds_impacted": [t.world_id for t in unstable],
                    "expected_ecosystem_impact": "Reduced cascading failure risk; volatility normalized",
                }
            )

        if len(engagement_drift) >= 3:
            actions.append(
                {
                    "theme": "UX uplift across low-engagement worlds",
                    "action": "Ship shared UX kits (navigation, above-the-fold CTAs) and run multi-world A/B tests",
                    "worlds_impacted": [t.world_id for t in engagement_drift],
                    "expected_ecosystem_impact": "+6 to +9 composite via engagement pillar recovery",
                }
            )

        if ecosystem_latest:
            actions.append(
                {
                    "theme": "Ecosystem guardrails",
                    "action": "Publish weekly guardrail scorecard and auto-create tickets for worlds below 70 composite",
                    "worlds_impacted": [t.world_id for t in trends if t.latest < 70],
                    "expected_ecosystem_impact": "Prevents regression and accelerates recovery",
                }
            )

        return actions

    # ------------------------------------------------------------------
    # Success tracking / ROI measurement
    # ------------------------------------------------------------------

    def _build_success_tracking(self, trends: List[TrendSignal]) -> Dict[str, Any]:
        previous_snapshot = self._load_previous_success_snapshot()
        previous_baseline = previous_snapshot.get("latest_scores", {})

        improvements: List[Dict[str, Any]] = []
        for trend in trends:
            baseline = previous_baseline.get(trend.world_id, trend.latest)
            delta = trend.latest - baseline
            improvements.append(
                {
                    "world_id": trend.world_id,
                    "world_name": trend.name,
                    "baseline": round(baseline, 2),
                    "current": round(trend.latest, 2),
                    "delta": round(delta, 2),
                    "status": "improved" if delta > 1 else "regressed" if delta < -1 else "stable",
                }
            )

        roi_scores = [item["delta"] for item in improvements]
        roi_average = statistics.mean(roi_scores) if roi_scores else 0.0
        roi_positive_rate = (
            sum(1 for d in roi_scores if d > 0) / len(roi_scores) * 100 if roi_scores else 0.0
        )

        latest_scores = {trend.world_id: round(trend.latest, 2) for trend in trends}
        return {
            "generated_at": datetime.utcnow().isoformat(),
            "previous_run": previous_snapshot.get("generated_at"),
            "latest_scores": latest_scores,
            "improvements": improvements,
            "roi_measurement": {
                "average_health_delta": round(roi_average, 2),
                "positive_improvement_rate": round(roi_positive_rate, 2),
                "baseline_reference_worlds": len(previous_baseline),
            },
        }

    def _load_previous_success_snapshot(self) -> Dict[str, Any]:
        if not self.success_tracking_path.exists():
            return {}
        try:
            return json.loads(self.success_tracking_path.read_text())
        except json.JSONDecodeError:
            return {}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    optimizer = Phase4HealthOptimizer()
    optimizer.run()


if __name__ == "__main__":
    main()
