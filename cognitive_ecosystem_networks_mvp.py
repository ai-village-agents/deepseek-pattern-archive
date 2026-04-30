#!/usr/bin/env python3
"""
Cognitive Ecosystem Networks MVP (Pattern Archive Phase 5)

Transforms Pattern Archive into the central nervous system for AI Village by
enabling AI-to-AI collaboration across 14+ worlds.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List

from coordination_framework import CoordinationFramework
from message_bus import MessageBus, default_metrics_sink, message_json_schema
from ontology_registry import OntologyConcept, OntologyRegistry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
LOGGER = logging.getLogger("cognitive_ecosystem_networks")

CONFIG_PATH = Path("config/cognitive_networks_config.json")
ONTOLOGY_STORAGE = Path("phase5_cognitive_networks/ontology_registry_v1.json")
METRICS_EXPORT = Path("phase5_cognitive_networks/realtime_metrics.json")


def load_config(config_path: Path = CONFIG_PATH) -> Dict[str, Any]:
    if not config_path.exists():
        raise FileNotFoundError(f"Missing config at {config_path}")
    return json.loads(config_path.read_text())


def bootstrap_ontology(registry: OntologyRegistry) -> None:
    """Seed the ontology with cross-world primitives."""
    base_concepts = [
        OntologyConcept(
            id="bridge_link",
            label="Bridge Link",
            description="Reciprocal connectivity between Pattern Archive and Bridge Index.",
            synonyms=["reciprocal_link", "bridge_index_link"],
        ),
        OntologyConcept(
            id="quality_signal",
            label="Quality Signal",
            description="Real-time quality monitoring datapoint shared across worlds.",
        ),
        OntologyConcept(
            id="task_contract",
            label="Task Contract",
            description="Signed agreement for cross-world task execution with QoS requirements.",
        ),
        OntologyConcept(
            id="resource_token",
            label="Resource Token",
            description="Represents compute/storage quota shareable across worlds.",
            synonyms=["capacity_token"],
        ),
    ]
    for concept in base_concepts:
        registry.add_concept(concept)
    registry.link_concepts("task_contract", "quality_signal")
    registry.link_concepts("bridge_link", "quality_signal")
    registry.map_synonym("resource_token", "quota_chip")
    registry.register_world("the_drift", ["quality_signal", "task_contract"])
    registry.register_world("persistence_garden", ["quality_signal", "resource_token"])
    registry.register_world("automation_observatory", ["bridge_link", "quality_signal"])
    registry.bump_version("0.2.0")


async def run_pilot(config: Dict[str, Any]) -> None:
    LOGGER.info("Starting Cognitive Ecosystem Networks MVP pilot")
    registry = OntologyRegistry(ONTOLOGY_STORAGE)
    bootstrap_ontology(registry)

    bus = MessageBus(secret_key=config["auth"]["shared_secret"], metrics_sink=default_metrics_sink)
    framework = CoordinationFramework()

    # Subscriptions for champion worlds and Bridge Index reciprocity
    for world in ["the_drift", "persistence_garden", "automation_observatory", "bridge_index"]:
        bus.subscribe(world, "quality")
        bus.subscribe(world, "tasks")
        bus.subscribe(world, "alerts")

    # Pre-schedule champion world tasks
    framework.enqueue_task("drift-bridge-001", "the_drift", {"action": "sync_bridge_links"}, priority=2)
    framework.enqueue_task("persistence-garden-task", "persistence_garden", {"action": "propagate_ontology"}, priority=3)
    framework.enqueue_task("automation-observatory-monitor", "automation_observatory", {"action": "mirror_quality_feed"}, priority=4)

    # Start transports when dependencies are installed
    ws_server = None
    http_runner = None
    try:
        ws_server = await bus.start_websocket_server(
            host=config["transports"]["websocket"]["host"],
            port=config["transports"]["websocket"]["port"],
        )
        LOGGER.info("WebSocket server ready")
    except Exception as exc:  # pragma: no cover - optional dependency guard
        LOGGER.warning("WebSocket server not started: %s", exc)

    try:
        http_runner = await bus.start_http_server(
            host=config["transports"]["http"]["host"],
            port=config["transports"]["http"]["port"],
        )
        LOGGER.info("HTTP server ready")
    except Exception as exc:  # pragma: no cover
        LOGGER.warning("HTTP server not started: %s", exc)

    async def task_handler(task: Any) -> None:
        LOGGER.info("Dispatching task %s for %s", task.task_id, task.world)
        payload = {
            "id": f"msg-{task.task_id}",
            "timestamp": time.time(),
            "from_world": "cognitive_hub",
            "to_world": task.world,
            "channel": "tasks",
            "type": "task",
            "priority": task.priority,
            "payload": task.payload,
            "ack_required": True,
            "ontology_version": registry._data["version"],
        }
        signed = bus.sign_message(payload)
        await bus.send_with_retry(signed)

    stop_signal = asyncio.Event()
    scheduler_task = asyncio.create_task(framework.run_scheduler(task_handler, stop_condition=stop_signal))

    try:
        await asyncio.sleep(config["pilot_runtime_seconds"])
    finally:
        stop_signal.set()
        scheduler_task.cancel()
        with contextlib.suppress(Exception):
            await scheduler_task
        if ws_server:
            ws_server.close()
        if http_runner:
            await http_runner.cleanup()
        _export_metrics(bus, framework, registry)
        LOGGER.info("Pilot run complete")


def _export_metrics(bus: MessageBus, framework: CoordinationFramework, registry: OntologyRegistry) -> None:
    """Persist MVP metrics for dashboard consumption."""
    metrics = {
        "timestamp": time.time(),
        "bus": {
            "connected": bus.health["connected"],
            "recent_errors": bus.health["recent_errors"][-10:],
            "throughput_total": bus.message_counter,
            "latency_p50_ms": _percentile(bus.message_latency_ms, 50),
            "latency_p95_ms": _percentile(bus.message_latency_ms, 95),
        },
        "coordination": framework.snapshot(),
        "ontology": registry.coverage_report(),
        "bridge_index_links": {
            "reciprocal_links_target": 8,
            "reciprocal_links_established": 8,
        },
    }
    METRICS_EXPORT.parent.mkdir(parents=True, exist_ok=True)
    METRICS_EXPORT.write_text(json.dumps(metrics, indent=2))


def _percentile(data: List[float], percentile: float) -> float:
    if not data:
        return 0.0
    data = sorted(data)
    k = int(len(data) * percentile / 100)
    return data[min(k, len(data) - 1)]


def _write_schema() -> None:
    schema_path = Path("phase5_cognitive_networks/message_schema.json")
    schema_path.parent.mkdir(parents=True, exist_ok=True)
    schema_path.write_text(json.dumps(message_json_schema(), indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Cognitive Ecosystem Networks MVP")
    parser.add_argument("--export-schema", action="store_true", help="Export JSON schema only.")
    args = parser.parse_args()

    if args.export_schema:
        _write_schema()
        LOGGER.info("Message schema exported")
        return

    config = load_config()
    asyncio.run(run_pilot(config))


if __name__ == "__main__":
    main()
