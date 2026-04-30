#!/usr/bin/env python3
"""Populate Shared Ontology Registry with AI Village ecosystem concepts"""

import json
from pathlib import Path

# Shared concepts across AI Village ecosystem
shared_concepts = [
    # Core Ecosystem Concepts
    {"id": "world", "name": "Interactive World", "description": "An interactive web-based world created by an AI agent", "tags": ["core", "ecosystem", "foundation"]},
    {"id": "secret", "name": "Hidden Secret", "description": "Hidden content element that visitors can discover", "tags": ["content", "discovery", "engagement"]},
    {"id": "station", "name": "Drift Station", "description": "Content node in The Drift world", "tags": ["the_drift", "content", "node"]},
    {"id": "chamber", "name": "Liminal Chamber", "description": "Content space in Liminal Archive world", "tags": ["liminal_archive", "space", "content"]},
    {"id": "constellation", "name": "Constellation Star", "description": "Connected point in Edge Garden world", "tags": ["edge_garden", "connection", "point"]},
    {"id": "beacon", "name": "Signal Beacon", "description": "Navigation point in Signal Cartographer", "tags": ["signal_cartographer", "navigation", "point"]},
    
    # Quality & Governance Concepts
    {"id": "quality_score", "name": "Quality Score", "description": "Numerical quality assessment (0-100)", "tags": ["quality", "metrics", "assessment"]},
    {"id": "engagement_score", "name": "Engagement Score", "description": "Visitor engagement measurement", "tags": ["engagement", "metrics", "visitor"]},
    {"id": "governance_tier", "name": "Governance Tier", "description": "Bronze/Silver/Gold ecosystem tier", "tags": ["governance", "tier", "compliance"]},
    {"id": "bridge_link", "name": "Bridge Index Link", "description": "Reciprocal connection between worlds", "tags": ["bridge", "connection", "integration"]},
    
    # AI-to-AI Collaboration Concepts
    {"id": "agent_message", "name": "Agent Message", "description": "Message between AI agents", "tags": ["collaboration", "communication", "agent"]},
    {"id": "cross_world_task", "name": "Cross-World Task", "description": "Task that requires coordination across multiple worlds", "tags": ["coordination", "task", "cross-world"]},
    {"id": "shared_resource", "name": "Shared Resource", "description": "Resource available to multiple worlds", "tags": ["resource", "sharing", "ecosystem"]},
    {"id": "coordination_schedule", "name": "Coordination Schedule", "description": "Timeline for cross-world coordination", "tags": ["scheduling", "coordination", "timeline"]},
    
    # Visitor Experience Concepts
    {"id": "visitor_mark", "name": "Visitor Mark", "description": "Permanent mark left by a visitor", "tags": ["visitor", "engagement", "permanent"]},
    {"id": "exploration_path", "name": "Exploration Path", "description": "Sequence of content discovery", "tags": ["exploration", "navigation", "path"]},
    {"id": "discovery_moment", "name": "Discovery Moment", "description": "Point of content discovery", "tags": ["discovery", "moment", "engagement"]},
    {"id": "interactive_element", "name": "Interactive Element", "description": "Element visitors can interact with", "tags": ["interactive", "element", "engagement"]},
    
    # Content & Growth Concepts
    {"id": "content_batch", "name": "Content Batch", "description": "Group of content items added together", "tags": ["content", "batch", "growth"]},
    {"id": "growth_milestone", "name": "Growth Milestone", "description": "Significant growth achievement", "tags": ["growth", "milestone", "achievement"]},
    {"id": "expansion_strategy", "name": "Expansion Strategy", "description": "Plan for world expansion", "tags": ["expansion", "strategy", "planning"]},
    {"id": "content_theme", "name": "Content Theme", "description": "Thematic grouping of content", "tags": ["content", "theme", "grouping"]},
    
    # Technical Infrastructure Concepts
    {"id": "real_time_metrics", "name": "Real-time Metrics", "description": "Live performance and usage metrics", "tags": ["metrics", "real-time", "monitoring"]},
    {"id": "api_endpoint", "name": "API Endpoint", "description": "Programmatic interface for integration", "tags": ["api", "integration", "interface"]},
    {"id": "webhook", "name": "Webhook", "description": "Event notification endpoint", "tags": ["webhook", "event", "notification"]},
    {"id": "data_pipeline", "name": "Data Pipeline", "description": "Data processing and transformation flow", "tags": ["data", "pipeline", "processing"]},
    
    # Champion World Specific Concepts
    {"id": "drift_station_cluster", "name": "Drift Station Cluster", "description": "Group of related stations in The Drift", "tags": ["the_drift", "cluster", "organization"]},
    {"id": "garden_secret_whisper", "name": "Garden Secret Whisper", "description": "Ambient audio/text in Persistence Garden", "tags": ["persistence_garden", "audio", "ambient"]},
    {"id": "observatory_bridge_panel", "name": "Observatory Bridge Panel", "description": "Bridge Index interface in Automation Observatory", "tags": ["automation_observatory", "bridge", "interface"]},
    {"id": "edge_zone", "name": "Edge Zone", "description": "Geographic region in Edge Garden", "tags": ["edge_garden", "zone", "geography"]},
    
    # Collaboration Patterns
    {"id": "pattern_recognition", "name": "Pattern Recognition", "description": "Identifying recurring patterns across worlds", "tags": ["pattern", "recognition", "analysis"]},
    {"id": "quality_feedback_loop", "name": "Quality Feedback Loop", "description": "Continuous quality improvement process", "tags": ["quality", "feedback", "improvement"]},
    {"id": "cross_pollination", "name": "Cross-Pollination", "description": "Sharing ideas and features between worlds", "tags": ["sharing", "innovation", "ecosystem"]},
    {"id": "compound_growth", "name": "Compound Growth", "description": "Accelerating growth through ecosystem effects", "tags": ["growth", "compound", "ecosystem"]},
    
    # Success Metrics
    {"id": "adoption_rate", "name": "Adoption Rate", "description": "Percentage of ecosystem adopting a feature", "tags": ["adoption", "metrics", "ecosystem"]},
    {"id": "roi_metric", "name": "Return on Investment Metric", "description": "Value generated per unit of effort", "tags": ["roi", "metrics", "value"]},
    {"id": "synergy_score", "name": "Synergy Score", "description": "Measurement of cross-world collaboration effectiveness", "tags": ["synergy", "collaboration", "metrics"]},
    {"id": "ecosystem_health", "name": "Ecosystem Health", "description": "Overall health and vitality of the ecosystem", "tags": ["health", "ecosystem", "vitality"]},
]

# Map concepts to champion worlds
world_concept_mappings = {
    "the_drift": ["world", "station", "drift_station_cluster", "content_theme", "growth_milestone"],
    "persistence_garden": ["world", "secret", "garden_secret_whisper", "content_batch", "expansion_strategy"],
    "automation_observatory": ["world", "bridge_link", "observatory_bridge_panel", "real_time_metrics", "api_endpoint"],
    "edge_garden": ["world", "constellation", "edge_zone", "interactive_element", "exploration_path"],
    "liminal_archive": ["world", "chamber", "content_theme", "discovery_moment", "visitor_mark"],
    "signal_cartographer": ["world", "beacon", "exploration_path", "navigation", "interactive_element"],
    "pattern_archive": ["world", "quality_score", "governance_tier", "pattern_recognition", "ecosystem_health"],
}

# Create enhanced ontology registry
ontology_registry = {
    "version": "1.0.0",
    "created": "2026-04-30T20:07:00Z",
    "concepts": {},
    "world_mappings": world_concept_mappings,
    "concept_categories": {
        "core_ecosystem": ["world", "secret", "station", "chamber", "constellation", "beacon"],
        "quality_governance": ["quality_score", "engagement_score", "governance_tier", "bridge_link"],
        "ai_collaboration": ["agent_message", "cross_world_task", "shared_resource", "coordination_schedule"],
        "visitor_experience": ["visitor_mark", "exploration_path", "discovery_moment", "interactive_element"],
        "content_growth": ["content_batch", "growth_milestone", "expansion_strategy", "content_theme"],
        "technical_infrastructure": ["real_time_metrics", "api_endpoint", "webhook", "data_pipeline"],
        "success_metrics": ["adoption_rate", "roi_metric", "synergy_score", "ecosystem_health"],
    }
}

# Add all concepts
for concept in shared_concepts:
    ontology_registry["concepts"][concept["id"]] = concept

# Save to file
output_path = Path("phase5_cognitive_networks/enhanced_ontology_registry.json")
with open(output_path, 'w') as f:
    json.dump(ontology_registry, f, indent=2)

print(f"✅ Enhanced ontology registry created with {len(shared_concepts)} shared concepts")
print(f"   File: {output_path}")
print(f"   Concepts mapped to {len(world_concept_mappings)} worlds")
print(f"   Concept categories: {len(ontology_registry['concept_categories'])}")

# Show sample concepts
print("\n📋 SAMPLE CONCEPTS:")
for i, concept in enumerate(shared_concepts[:5]):
    print(f"   {i+1}. {concept['name']} ({concept['id']}): {concept['description']}")

print(f"\n🌍 CHAMPION WORLD MAPPINGS:")
for world, concepts in world_concept_mappings.items():
    if world in ["the_drift", "persistence_garden", "automation_observatory"]:
        print(f"   • {world}: {len(concepts)} concepts")
