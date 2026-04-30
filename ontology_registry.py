#!/usr/bin/env python3
"""
Shared ontology registry for Cognitive Ecosystem Networks.

Features
--------
- Unified vocabulary across worlds with synonym mapping.
- JSON-backed storage with semantic relationships and version history.
- Lightweight API for registering worlds, querying concepts, and auditing coverage.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set


@dataclass
class OntologyConcept:
    """Represents a single ontology concept with semantic links."""

    id: str
    label: str
    description: str
    synonyms: List[str] = field(default_factory=list)
    related: List[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "description": self.description,
            "synonyms": self.synonyms,
            "related": self.related,
            "created_at": self.created_at,
        }


class OntologyRegistry:
    """JSON-backed ontology registry with simple versioning."""

    def __init__(self, storage_path: Path) -> None:
        self.storage_path = storage_path
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._data: Dict[str, Any] = {
            "version": "0.1.0",
            "worlds": {},
            "concepts": {},
            "history": [],
        }
        if self.storage_path.exists():
            self._data.update(json.loads(self.storage_path.read_text()))
        else:
            self._persist()

    # ------------------------------ CRUD -------------------------------- #
    def register_world(self, world_id: str, capabilities: Optional[List[str]] = None) -> None:
        self._data["worlds"][world_id] = {
            "capabilities": capabilities or [],
            "registered_at": time.time(),
            "ontology_version": self._data["version"],
        }
        self._persist()

    def add_concept(self, concept: OntologyConcept) -> None:
        self._data["concepts"][concept.id] = concept.to_dict()
        self._record_history(f"Added concept {concept.id}")
        self._persist()

    def link_concepts(self, source_id: str, related_id: str) -> None:
        if source_id not in self._data["concepts"] or related_id not in self._data["concepts"]:
            return
        related_list = self._data["concepts"][source_id].setdefault("related", [])
        if related_id not in related_list:
            related_list.append(related_id)
            self._record_history(f"Linked {source_id} -> {related_id}")
            self._persist()

    def map_synonym(self, concept_id: str, synonym: str) -> None:
        if concept_id not in self._data["concepts"]:
            return
        syns = self._data["concepts"][concept_id].setdefault("synonyms", [])
        if synonym not in syns:
            syns.append(synonym)
            self._record_history(f"Mapped synonym {synonym} to {concept_id}")
            self._persist()

    # ----------------------------- Queries ------------------------------ #
    def get_concept(self, concept_id: str) -> Optional[Dict[str, Any]]:
        return self._data["concepts"].get(concept_id)

    def resolve_label(self, label: str) -> Optional[Dict[str, Any]]:
        """Resolve by label or synonym."""
        for concept in self._data["concepts"].values():
            if concept["label"] == label or label in concept.get("synonyms", []):
                return concept
        return None

    def coverage_report(self) -> Dict[str, Any]:
        """Measure ontology coverage across registered worlds."""
        concept_ids: Set[str] = set(self._data["concepts"].keys())
        world_mappings = {
            world: {
                "capabilities": meta.get("capabilities", []),
                "missing_concepts": sorted(concept_ids - set(meta.get("capabilities", []))),
            }
            for world, meta in self._data["worlds"].items()
        }
        return {
            "version": self._data["version"],
            "concept_count": len(concept_ids),
            "worlds": world_mappings,
            "history_entries": len(self._data.get("history", [])),
        }

    # --------------------------- Versioning ----------------------------- #
    def bump_version(self, version: str) -> None:
        self._data["version"] = version
        self._record_history(f"Version bumped to {version}")
        self._persist()

    # ----------------------------- Storage ------------------------------ #
    def _record_history(self, note: str) -> None:
        self._data.setdefault("history", []).append({"timestamp": time.time(), "note": note})

    def _persist(self) -> None:
        self.storage_path.write_text(json.dumps(self._data, indent=2))
