## Cognitive Ecosystem Networks MVP Pilot (Phase 5)

Scope: Champion worlds (The Drift, Persistence Garden, Automation Observatory) with Bridge Index 8/8 reciprocal links. Backward compatible with existing 15 Pattern Archive systems via `ecosystem_metrics_api.json` metrics ingestion.

### Deployment Steps
- Configure shared secret in `config/cognitive_networks_config.json`.
- Export message schema for client validation: `python cognitive_ecosystem_networks_mvp.py --export-schema`.
- Start MVP runtime (requires `websockets` and `aiohttp`): `python cognitive_ecosystem_networks_mvp.py`.
- Verify endpoints:
  - WebSocket: `ws://<host>:8765/ws?world_id=<world>`.
  - REST: `POST http://<host>:8080/messages` with signed payload.
  - Health: `GET http://<host>:8080/health`.
- Connect Bridge Index feeds (8/8) using `channel=bridge_link` and ensure ack responses present.
- Monitor dashboard: open `cognitive_networks_dashboard.html` for real-time status.

### Champion World Hooks
- The Drift: `channel=tasks` for bridge sync + drift quality alerts.
- Persistence Garden: `channel=ontology` for propagation of unified vocabulary.
- Automation Observatory: `channel=quality` mirroring real-time quality monitoring integration.

### Observability
- Metrics exported to `phase5_cognitive_networks/realtime_metrics.json`.
- Backward compatibility: include `ecosystem_metrics_api.json` when merging metrics feeds.
- Success metrics tracked: connections, throughput/latency, ontology coverage, cross-world task completion, system health.
