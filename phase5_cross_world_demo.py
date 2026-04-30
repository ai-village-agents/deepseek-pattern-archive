#!/usr/bin/env python3
"""Phase 5 cross-world coordination demonstration for champion worlds.

This script simulates how The Drift, Persistence Garden, and Automation Observatory
coordinate through the Phase 5 Cognitive Ecosystem Networks. It shows:
- Shared content expansion strategies
- Success pattern exchange
- Resource allocation across worlds
- Ontology-backed shared understanding
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from message_bus import MessageBus
from ontology_registry import OntologyConcept, OntologyRegistry


@dataclass
class WorldState:
    """Basic world state for reporting in the demo."""

    world_id: str
    name: str
    content_label: str
    content_total: int
    strengths: List[str]


class Phase5CrossWorldDemo:
    """Coordinates the cross-world demonstration."""

    def __init__(self) -> None:
        self.bus = MessageBus(secret_key="phase5-demo-shared-secret")
        self.ontology = OntologyRegistry(Path("phase5_cognitive_networks/demo_ontology_snapshot.json"))
        self.flow_log: List[Dict[str, Any]] = []
        self.worlds = {
            "the_drift": WorldState(
                world_id="the_drift",
                name="The Drift",
                content_label="stations",
                content_total=4173,
                strengths=["station clustering", "cross-theme seeding"],
            ),
            "persistence_garden": WorldState(
                world_id="persistence_garden",
                name="Persistence Garden",
                content_label="secrets",
                content_total=900,
                strengths=["batch completion", "quality hold"],
            ),
            "automation_observatory": WorldState(
                world_id="automation_observatory",
                name="Automation Observatory",
                content_label="pages",
                content_total=126,
                strengths=["bridge index", "navigation telemetry"],
            ),
        }

    def setup_channels(self) -> None:
        """Subscribe worlds to the coordination channels used in the demo."""
        channels = [
            "content_expansion",
            "success_patterns",
            "resource_allocation",
            "ontology_sync",
        ]
        for world_id in self.worlds:
            for channel in channels:
                self.bus.subscribe(world_id, channel)

    def setup_ontology(self) -> None:
        """Seed the ontology registry with shared concepts and synonyms."""
        concept_map = [
            OntologyConcept(
                id="content.station",
                label="Station",
                description="Discrete content unit in The Drift",
                synonyms=["drift_station", "station_node"],
                related=["growth.pattern"],
            ),
            OntologyConcept(
                id="content.secret",
                label="Secret",
                description="Hidden content item in Persistence Garden",
                synonyms=["garden_secret", "secret_node"],
                related=["batch.success"],
            ),
            OntologyConcept(
                id="content.page",
                label="Page",
                description="Navigable document in Automation Observatory",
                synonyms=["observatory_page"],
                related=["bridge.index"],
            ),
            OntologyConcept(
                id="bridge.index",
                label="Bridge Index",
                description="Reciprocal link catalog that connects worlds",
                synonyms=["crosslink_index", "reciprocal_links"],
            ),
            OntologyConcept(
                id="growth.pattern",
                label="Growth Pattern",
                description="Reusable content expansion motif",
                synonyms=["expansion_pattern"],
            ),
            OntologyConcept(
                id="batch.success",
                label="Batch Success",
                description="Pattern for 100% batch completion",
                synonyms=["batch_completion"],
            ),
        ]
        for concept in concept_map:
            self.ontology.add_concept(concept)

        for world_id, state in self.worlds.items():
            self.ontology.register_world(world_id, capabilities=[c.id for c in concept_map])

    def build_message(
        self,
        from_world: str,
        channel: str,
        msg_type: str,
        payload: Dict[str, Any],
        to_world: str = "broadcast",
        priority: int = 5,
    ) -> Dict[str, Any]:
        """Create and sign a bus-ready message."""
        message = {
            "id": str(uuid.uuid4()),
            "timestamp": time.time(),
            "from_world": from_world,
            "to_world": to_world,
            "channel": channel,
            "priority": priority,
            "type": msg_type,
            "payload": payload,
            "ontology_version": self.ontology.coverage_report()["version"],
            "ack_required": True,
            "ttl_seconds": 600,
            "route_trace": [f"{from_world}"],
        }
        return self.bus.sign_message(message)

    def dispatch(self, message: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate bus fan-out to subscribed worlds and capture the flow."""
        deliveries: List[Dict[str, Any]] = []
        targets = self.bus._route_targets(message["channel"])
        for target in targets:
            if message["to_world"] not in ("broadcast", target):
                continue
            delivered = dict(message)
            delivered["to_world"] = target
            delivered["route_trace"] = message.get("route_trace", []) + [f"bus->{target}"]
            deliveries.append(delivered)
            self.flow_log.append(delivered)
        return deliveries

    def demonstrate_content_expansion(self) -> None:
        """Worlds align on content expansion strategy."""
        drift = self.worlds["the_drift"]
        payload = {
            "strategy": "multi-theme station clustering",
            "recent_total": drift.content_total,
            "next_batch": 45,
            "growth_pattern": "expand to new themes after every 25 stations",
            "applicability": ["persistence_garden", "automation_observatory"],
        }
        deliveries = self.dispatch(
            self.build_message(
                from_world=drift.world_id,
                channel="content_expansion",
                msg_type="event",
                payload=payload,
            )
        )
        print("Content expansion: The Drift shares station growth pattern.")
        for d in deliveries:
            print(f"- Delivered to {d['to_world']} with strategy: {d['payload']['strategy']}")

        garden = self.worlds["persistence_garden"]
        garden_payload = {
            "strategy": "batch assembly with zero defect rate",
            "recent_total": garden.content_total,
            "batch_size": 30,
            "milestone": "900 secrets reached",
            "applicability": ["the_drift", "automation_observatory"],
        }
        self.dispatch(
            self.build_message(
                from_world=garden.world_id,
                channel="content_expansion",
                msg_type="event",
                payload=garden_payload,
            )
        )
        print("- Persistence Garden broadcasts batch-first expansion guidance.")

        observatory = self.worlds["automation_observatory"]
        observatory_payload = {
            "strategy": "bridge-index-first page deployment",
            "recent_total": observatory.content_total,
            "bridge_index_target": 8,
            "applicability": ["the_drift", "persistence_garden"],
        }
        self.dispatch(
            self.build_message(
                from_world=observatory.world_id,
                channel="content_expansion",
                msg_type="event",
                payload=observatory_payload,
            )
        )
        print("- Automation Observatory coordinates new bridge index update window.")

    def demonstrate_success_patterns(self) -> None:
        """Show how success patterns circulate."""
        garden = self.worlds["persistence_garden"]
        payload = {
            "pattern": "100% batch completion",
            "batches": 180,
            "signals": ["pre-flight QA", "post-flight sampling", "defect lockout"],
            "shared_with": ["the_drift", "automation_observatory"],
        }
        deliveries = self.dispatch(
            self.build_message(
                from_world=garden.world_id,
                channel="success_patterns",
                msg_type="event",
                payload=payload,
            )
        )
        print("Success patterns: Persistence Garden publishes batch completion playbook.")
        for d in deliveries:
            print(f"- {d['to_world']} ingests pattern with {len(d['payload']['signals'])} control steps")

        drift = self.worlds["the_drift"]
        drift_payload = {
            "pattern": "station cluster growth",
            "stations": drift.content_total,
            "signals": ["multi-theme seeds", "quality checkpoints every 50 stations"],
            "shared_with": ["persistence_garden", "automation_observatory"],
        }
        self.dispatch(
            self.build_message(
                from_world=drift.world_id,
                channel="success_patterns",
                msg_type="event",
                payload=drift_payload,
            )
        )
        print("- The Drift shares station cluster signals for adoption.")

    def demonstrate_resource_allocation(self) -> None:
        """Simulate coordinated resource allocation."""
        observatory = self.worlds["automation_observatory"]
        payload = {
            "resource": "bridge_index_update_slots",
            "slots_available": 5,
            "assigned": {
                "the_drift": 3,
                "persistence_garden": 2,
            },
            "sla": "real-time sync within 5 minutes",
        }
        deliveries = self.dispatch(
            self.build_message(
                from_world=observatory.world_id,
                channel="resource_allocation",
                msg_type="task",
                payload=payload,
            )
        )
        print("Resource coordination: Automation Observatory allocates bridge index slots.")
        for d in deliveries:
            assigned = d["payload"]["assigned"].get(d["to_world"], 0)
            print(f"- {d['to_world']} receives {assigned} slot(s) for reciprocal link updates")

        drift_request = {
            "resource": "batch_validation_support",
            "need": "QA pairing for next 45 stations",
            "timeline": "next 24 hours",
        }
        self.dispatch(
            self.build_message(
                from_world="the_drift",
                channel="resource_allocation",
                msg_type="task",
                payload=drift_request,
                to_world="persistence_garden",
            )
        )
        print("- The Drift requests QA pairing from Persistence Garden for upcoming stations.")

    def demonstrate_ontology_sync(self) -> None:
        """Show ontology-backed shared understanding."""
        terms = ["Station", "Secret", "Bridge Index", "Batch Success"]
        resolved = {term: self.ontology.resolve_label(term) for term in terms}
        payload = {
            "ontology_terms": {k: v["id"] if v else None for k, v in resolved.items()},
            "synonym_example": self.ontology.resolve_label("crosslink_index")["id"],
            "note": "All worlds reference the same concept IDs when scheduling work.",
        }
        deliveries = self.dispatch(
            self.build_message(
                from_world="automation_observatory",
                channel="ontology_sync",
                msg_type="event",
                payload=payload,
            )
        )
        print("Ontology registry: shared terms synchronized for tasks.")
        for d in deliveries:
            print(f"- {d['to_world']} received ontology ids {list(d['payload']['ontology_terms'].values())}")

    def run(self) -> None:
        """Execute the full demonstration."""
        print("Phase 5 Cross-World Collaborative Demo")
        print("--------------------------------------")
        for state in self.worlds.values():
            print(
                f"{state.name}: {state.content_total} {state.content_label} "
                f"({', '.join(state.strengths)})"
            )
        print()

        self.setup_channels()
        self.setup_ontology()

        self.demonstrate_content_expansion()
        print()
        self.demonstrate_success_patterns()
        print()
        self.demonstrate_resource_allocation()
        print()
        self.demonstrate_ontology_sync()
        print()

        print("Message flow captured for Phase 5 cognitive ecosystem network:")
        for entry in self.flow_log:
            route = " -> ".join(entry["route_trace"])
            print(
                f"- {entry['channel']} | {entry['from_world']} -> {entry['to_world']} "
                f"| {route}"
            )

        Path("phase5_cognitive_networks/demo_flow_output.json").write_text(
            json.dumps(self.flow_log, indent=2)
        )
        print("\nFlow log saved to phase5_cognitive_networks/demo_flow_output.json")


if __name__ == "__main__":
    Phase5CrossWorldDemo().run()
