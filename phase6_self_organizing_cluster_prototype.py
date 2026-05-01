#!/usr/bin/env python3
"""Phase 6 self-organizing cluster prototype with mock data.

The goal is to demonstrate autonomous world coordination:
- Similarity detection based on themes + interaction patterns
- Automatic cluster formation when thresholds are reached
- Cross-cluster coordination protocols
- Predictive growth modeling derived from cluster patterns
- Lightweight real-time visualization for operator situational awareness
"""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from typing import Dict, List, Tuple


ThemeVector = Dict[str, float]
InteractionVector = Dict[str, float]


@dataclass
class WorldProfile:
    """Basic profile for a world in the ecosystem."""

    id: str
    name: str
    themes: ThemeVector
    interactions: InteractionVector
    history: List[int]  # content or influence volume over time


@dataclass
class Cluster:
    """Discovered cluster with minimal metadata."""

    id: str
    members: List[WorldProfile]
    cohesion: float  # average pairwise similarity inside the cluster
    anchor: str  # world id acting as the anchor for coordination
    dominant_theme: str


class Phase6ClusterDemo:
    """Self-organizing cluster demonstration."""

    def __init__(self) -> None:
        self.worlds = self._load_mock_worlds()
        self.similarity_threshold = 0.62

    def _load_mock_worlds(self) -> Dict[str, WorldProfile]:
        """Seed mock world data; scores are normalized but intentionally varied."""
        return {
            "drift": WorldProfile(
                id="drift",
                name="The Drift",
                themes={
                    "navigation": 0.82,
                    "collaboration": 0.67,
                    "resilience": 0.61,
                    "automation": 0.38,
                },
                interactions={
                    "cross_links": 0.93,
                    "portal_handoffs": 0.81,
                    "live_coaching": 0.55,
                    "batch_jobs": 0.36,
                },
                history=[52, 61, 74, 88, 105, 124],
            ),
            "garden": WorldProfile(
                id="garden",
                name="Persistence Garden",
                themes={
                    "creation": 0.74,
                    "collaboration": 0.69,
                    "resilience": 0.58,
                    "navigation": 0.42,
                },
                interactions={
                    "cross_links": 0.71,
                    "live_coaching": 0.62,
                    "batch_jobs": 0.77,
                    "quality_holds": 0.66,
                },
                history=[33, 44, 57, 70, 86, 107],
            ),
            "observatory": WorldProfile(
                id="observatory",
                name="Automation Observatory",
                themes={
                    "automation": 0.88,
                    "telemetry": 0.79,
                    "navigation": 0.61,
                    "governance": 0.44,
                },
                interactions={
                    "batch_jobs": 0.89,
                    "cross_links": 0.63,
                    "signal_fans": 0.72,
                    "portal_handoffs": 0.54,
                },
                history=[41, 51, 64, 79, 95, 117],
            ),
            "synthesis": WorldProfile(
                id="synthesis",
                name="Synthesis Lab",
                themes={
                    "creation": 0.81,
                    "knowledge": 0.77,
                    "collaboration": 0.64,
                    "automation": 0.43,
                },
                interactions={
                    "live_coaching": 0.82,
                    "signal_fans": 0.69,
                    "research_sprints": 0.74,
                    "cross_links": 0.58,
                },
                history=[26, 34, 46, 61, 79, 96],
            ),
            "bridge_commons": WorldProfile(
                id="bridge_commons",
                name="Bridge Commons",
                themes={
                    "navigation": 0.77,
                    "automation": 0.72,
                    "collaboration": 0.63,
                    "interoperability": 0.69,
                },
                interactions={
                    "portal_handoffs": 0.76,
                    "cross_links": 0.81,
                    "signal_fans": 0.67,
                    "live_coaching": 0.44,
                },
                history=[38, 50, 62, 80, 102, 125],
            ),
            "trust_federation": WorldProfile(
                id="trust_federation",
                name="Trust Federation",
                themes={
                    "governance": 0.86,
                    "resilience": 0.72,
                    "collaboration": 0.65,
                    "interoperability": 0.51,
                },
                interactions={
                    "quality_holds": 0.81,
                    "signal_fans": 0.58,
                    "live_coaching": 0.49,
                    "batch_jobs": 0.45,
                },
                history=[22, 31, 39, 50, 64, 81],
            ),
            "signal_harbor": WorldProfile(
                id="signal_harbor",
                name="Signal Harbor",
                themes={
                    "telemetry": 0.83,
                    "navigation": 0.69,
                    "resilience": 0.55,
                    "creation": 0.36,
                },
                interactions={
                    "signal_fans": 0.91,
                    "portal_handoffs": 0.73,
                    "cross_links": 0.59,
                    "batch_jobs": 0.47,
                },
                history=[29, 37, 49, 63, 79, 101],
            ),
            "field_ops": WorldProfile(
                id="field_ops",
                name="Field Ops Studio",
                themes={
                    "creation": 0.69,
                    "interoperability": 0.64,
                    "resilience": 0.57,
                    "automation": 0.48,
                },
                interactions={
                    "research_sprints": 0.67,
                    "portal_handoffs": 0.58,
                    "cross_links": 0.55,
                    "quality_holds": 0.52,
                },
                history=[24, 33, 41, 54, 68, 84],
            ),
        }

    def _cosine_similarity(self, a: Dict[str, float], b: Dict[str, float]) -> float:
        keys = set(a) | set(b)
        if not keys:
            return 0.0
        dot = sum(a.get(k, 0.0) * b.get(k, 0.0) for k in keys)
        norm_a = math.sqrt(sum((a.get(k, 0.0)) ** 2 for k in keys))
        norm_b = math.sqrt(sum((b.get(k, 0.0)) ** 2 for k in keys))
        if not norm_a or not norm_b:
            return 0.0
        return dot / (norm_a * norm_b)

    def _shared_theme_score(self, a: ThemeVector, b: ThemeVector, cutoff: float = 0.45) -> float:
        """Jaccard-like score for the most meaningful themes."""
        a_keys = {k for k, v in a.items() if v >= cutoff}
        b_keys = {k for k, v in b.items() if v >= cutoff}
        union = a_keys | b_keys
        if not union:
            return 0.0
        return len(a_keys & b_keys) / len(union)

    def world_similarity(self, a: WorldProfile, b: WorldProfile) -> float:
        """Blend content theme and interaction similarities."""
        theme_alignment = self._cosine_similarity(a.themes, b.themes)
        interaction_alignment = self._cosine_similarity(a.interactions, b.interactions)
        shared_themes = self._shared_theme_score(a.themes, b.themes)
        # Heavier weight on themes, retain behavior from interaction patterns.
        composite = (0.55 * theme_alignment) + (0.35 * interaction_alignment) + (0.10 * shared_themes)
        return round(composite, 3)

    def compute_similarity_matrix(self) -> Dict[Tuple[str, str], float]:
        pairs: Dict[Tuple[str, str], float] = {}
        world_list = list(self.worlds.values())
        for i, a in enumerate(world_list):
            for b in world_list[i + 1 :]:
                score = self.world_similarity(a, b)
                pairs[(a.id, b.id)] = score
        return pairs

    def _component(self, graph: Dict[str, List[str]], start: str) -> List[str]:
        stack = [start]
        visited: List[str] = []
        while stack:
            node = stack.pop()
            if node in visited:
                continue
            visited.append(node)
            stack.extend([n for n in graph.get(node, []) if n not in visited])
        return visited

    def form_clusters(self, similarity: Dict[Tuple[str, str], float]) -> List[Cluster]:
        """Create clusters from similarity edges above threshold."""
        graph: Dict[str, List[str]] = {wid: [] for wid in self.worlds}
        for (a, b), score in similarity.items():
            if score >= self.similarity_threshold:
                graph[a].append(b)
                graph[b].append(a)

        clusters: List[Cluster] = []
        seen: set[str] = set()
        counter = 1

        for world_id in graph:
            if world_id in seen:
                continue
            nodes = self._component(graph, world_id)
            seen.update(nodes)
            members = [self.worlds[n] for n in nodes]
            cohesion = self._cohesion(nodes, similarity)
            anchor = self._anchor(nodes, graph)
            dominant_theme = self._dominant_theme(members)
            clusters.append(
                Cluster(
                    id=f"cluster_{counter}",
                    members=members,
                    cohesion=cohesion,
                    anchor=anchor,
                    dominant_theme=dominant_theme,
                )
            )
            counter += 1
        return clusters

    def _cohesion(self, nodes: List[str], similarity: Dict[Tuple[str, str], float]) -> float:
        if len(nodes) == 1:
            return 1.0
        scores: List[float] = []
        for i, a in enumerate(nodes):
            for b in nodes[i + 1 :]:
                key = (a, b) if (a, b) in similarity else (b, a)
                scores.append(similarity.get(key, 0.0))
        return round(sum(scores) / len(scores), 3) if scores else 0.0

    def _anchor(self, nodes: List[str], graph: Dict[str, List[str]]) -> str:
        # Anchor is the node with most high-similarity edges; deterministic with sorted fallback.
        ranked = sorted(nodes, key=lambda n: (len(graph.get(n, [])), n), reverse=True)
        return ranked[0]

    def _dominant_theme(self, members: List[WorldProfile]) -> str:
        aggregated: Dict[str, float] = {}
        for m in members:
            for theme, weight in m.themes.items():
                aggregated[theme] = aggregated.get(theme, 0.0) + weight
        if not aggregated:
            return "n/a"
        return max(aggregated.items(), key=lambda item: item[1])[0]

    def cross_cluster_protocols(self, clusters: List[Cluster]) -> List[Dict[str, str]]:
        """Design simple coordination plays between clusters."""
        protocols: List[Dict[str, str]] = []
        if len(clusters) < 2:
            return protocols

        # Pair clusters by complementary dominant themes to stimulate bridges.
        ordered = sorted(clusters, key=lambda c: c.dominant_theme)
        for a, b in zip(ordered, ordered[1:]):
            protocols.append(
                {
                    "between": f"{a.id}<->{b.id}",
                    "focus": f"{a.dominant_theme} + {b.dominant_theme}",
                    "handshake": f"{a.anchor} shares signals to {b.anchor}; reciprocal summaries every 2 ticks",
                    "shared_bus": "phase6-coordination-bus",
                }
            )
        # Multicast broadcast ensures clusters align on safety/resilience.
        protocols.append(
            {
                "between": "all-clusters",
                "focus": "resilience baseline",
                "handshake": "anchors publish heartbeat + quality gates; federate alerts in <300ms",
                "shared_bus": "phase6-coordination-bus",
            }
        )
        return protocols

    def predict_growth(self, clusters: List[Cluster], horizon: int = 3) -> Dict[str, List[int]]:
        """Forecast next sizes using linear trend on summed history."""
        predictions: Dict[str, List[int]] = {}
        for cluster in clusters:
            history = self._cluster_history(cluster.members)
            trend = self._linear_trend(history)
            preds = [max(int(history[-1] + trend * (i + 1)), history[-1]) for i in range(horizon)]
            predictions[cluster.id] = preds
        return predictions

    def _cluster_history(self, members: List[WorldProfile]) -> List[int]:
        series_length = max(len(m.history) for m in members)
        combined: List[int] = []
        for idx in range(series_length):
            combined.append(sum(m.history[idx] for m in members if idx < len(m.history)))
        return combined

    def _linear_trend(self, data: List[int]) -> float:
        if len(data) < 2:
            return 0.0
        x = list(range(len(data)))
        n = len(data)
        sum_x = sum(x)
        sum_y = sum(data)
        sum_xy = sum(xi * yi for xi, yi in zip(x, data))
        sum_x2 = sum(xi * xi for xi in x)
        denominator = (n * sum_x2) - (sum_x ** 2)
        if denominator == 0:
            return 0.0
        slope = ((n * sum_xy) - (sum_x * sum_y)) / denominator
        return slope

    def visualize(self, clusters: List[Cluster], predictions: Dict[str, List[int]]) -> None:
        """Stream a minimal console visualization."""
        print("\n=== Real-time cluster visualization ===")
        ticks = 3
        for tick in range(ticks):
            print(f"\nTick {tick + 1}/{ticks}")
            for cluster in clusters:
                projected_size = predictions.get(cluster.id, [0])[min(tick, len(predictions[cluster.id]) - 1)]
                bar = "#" * min(projected_size // 5, 40)
                member_labels = ", ".join(sorted(m.name for m in cluster.members))
                print(
                    f"{cluster.id:<12} | {bar:<40} |"
                    f" anchor={cluster.anchor:<16} theme={cluster.dominant_theme:<16}"
                    f" projected={projected_size:<4} members=[{member_labels}]"
                )
            time.sleep(0.25)

    def report_similarity(self, similarity: Dict[Tuple[str, str], float]) -> None:
        print("Similarity pairs (themes + interactions):")
        for (a, b), score in sorted(similarity.items(), key=lambda item: item[1], reverse=True):
            print(f"- {a:<16} ~ {b:<16} => {score}")

    def demonstrate(self) -> None:
        print("\nPhase 6 self-organizing cluster prototype\n")

        similarity = self.compute_similarity_matrix()
        self.report_similarity(similarity)

        clusters = self.form_clusters(similarity)
        print("\nClusters formed (threshold {:.2f}):".format(self.similarity_threshold))
        for cluster in clusters:
            member_names = ", ".join(sorted(m.name for m in cluster.members))
            print(
                f"- {cluster.id}: anchor={cluster.anchor}, cohesion={cluster.cohesion},"
                f" dominant={cluster.dominant_theme}, members=[{member_names}]"
            )

        protocols = self.cross_cluster_protocols(clusters)
        print("\nCross-cluster coordination protocols:")
        if not protocols:
            print("- Single cluster; no cross-cluster protocol needed.")
        for proto in protocols:
            print(
                f"- {proto['between']}: focus={proto['focus']};"
                f" handshake={proto['handshake']}; bus={proto['shared_bus']}"
            )

        predictions = self.predict_growth(clusters)
        print("\nPredictive growth (next 3 ticks):")
        for cid, preds in predictions.items():
            print(f"- {cid}: {preds}")

        self.visualize(clusters, predictions)


if __name__ == "__main__":
    demo = Phase6ClusterDemo()
    demo.demonstrate()
