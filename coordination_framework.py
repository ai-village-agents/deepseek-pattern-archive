#!/usr/bin/env python3
"""
Cross-world coordination framework for the Cognitive Ecosystem Networks MVP.

Provides
--------
- Priority-based task allocation across worlds.
- Resource sharing with optimistic conflict resolution.
- Coordination scheduler with queuing and performance metrics.
"""

from __future__ import annotations

import asyncio
import heapq
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass(order=True)
class CoordinatedTask:
    sort_index: Tuple[int, float] = field(init=False, repr=False)
    priority: int
    created_at: float
    task_id: str
    world: str
    payload: Dict[str, Any]

    def __post_init__(self) -> None:
        # Lower priority value = higher importance
        self.sort_index = (self.priority, self.created_at)


class CoordinationFramework:
    """Lightweight task scheduler for cross-world execution."""

    def __init__(self) -> None:
        self._queue: List[CoordinatedTask] = []
        self._resource_locks: Dict[str, str] = {}  # resource_id -> world holding it
        self.metrics: Dict[str, Any] = {
            "tasks_enqueued": 0,
            "tasks_completed": 0,
            "conflicts": 0,
            "avg_wait_seconds": 0.0,
            "histogram_wait_seconds": [],
        }

    # --------------------------- Task Handling --------------------------- #
    def enqueue_task(
        self, task_id: str, world: str, payload: Dict[str, Any], priority: int = 5
    ) -> None:
        task = CoordinatedTask(priority=priority, created_at=time.time(), task_id=task_id, world=world, payload=payload)
        heapq.heappush(self._queue, task)
        self.metrics["tasks_enqueued"] += 1

    def next_task(self) -> Optional[CoordinatedTask]:
        if not self._queue:
            return None
        return heapq.heappop(self._queue)

    def complete_task(self, task: CoordinatedTask) -> None:
        wait = max(0.0, time.time() - task.created_at)
        self.metrics["tasks_completed"] += 1
        self.metrics["histogram_wait_seconds"].append(wait)
        self.metrics["avg_wait_seconds"] = sum(self.metrics["histogram_wait_seconds"]) / len(
            self.metrics["histogram_wait_seconds"]
        )

    # ------------------------ Resource Management ----------------------- #
    def claim_resource(self, world: str, resource_id: str) -> bool:
        holder = self._resource_locks.get(resource_id)
        if holder and holder != world:
            self.metrics["conflicts"] += 1
            return False
        self._resource_locks[resource_id] = world
        return True

    def release_resource(self, world: str, resource_id: str) -> None:
        if self._resource_locks.get(resource_id) == world:
            self._resource_locks.pop(resource_id, None)

    # ---------------------------- Scheduler ----------------------------- #
    async def run_scheduler(
        self,
        handler: Any,
        poll_interval: float = 0.1,
        stop_condition: Optional[asyncio.Event] = None,
    ) -> None:
        """
        Continuously assign tasks to handler(world, task) coroutine.
        """
        stop_condition = stop_condition or asyncio.Event()
        while not stop_condition.is_set():
            task = self.next_task()
            if not task:
                await asyncio.sleep(poll_interval)
                continue
            await handler(task)
            self.complete_task(task)

    # ------------------------- Metrics Snapshot ------------------------- #
    def snapshot(self) -> Dict[str, Any]:
        return {
            "queue_depth": len(self._queue),
            "tasks_enqueued": self.metrics["tasks_enqueued"],
            "tasks_completed": self.metrics["tasks_completed"],
            "conflicts": self.metrics["conflicts"],
            "avg_wait_seconds": round(self.metrics["avg_wait_seconds"], 3),
        }
