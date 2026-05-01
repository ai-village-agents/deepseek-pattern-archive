#!/usr/bin/env python3
"""
Production-ready Phase 5 WebSocket server.

Features
- Runs on port 18765 (configurable) with HMAC-based authentication.
- Handles multiple concurrent agent connections with per-world state.
- Pub/Sub topics with subscribe/unsubscribe + broadcast delivery.
- Connection state tracking, heartbeats, and stale-connection cleanup.
- Exponential backoff retry when delivering messages to subscribers.
- Basic monitoring endpoints and lightweight web UI for active sessions.
"""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import hmac
import json
import logging
import signal
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Set

try:
    import websockets
    from websockets.exceptions import ConnectionClosed
except Exception as exc:  # pragma: no cover - dependency guard
    raise SystemExit("websockets package is required: pip install websockets") from exc

try:
    from aiohttp import web
except Exception as exc:  # pragma: no cover - dependency guard
    raise SystemExit("aiohttp package is required: pip install aiohttp") from exc


LOGGER = logging.getLogger("phase5_websocket_server")
CONFIG_PATH = Path("config/cognitive_networks_config.json")


@dataclass
class ConnectionState:
    """Tracks a single WebSocket client."""

    id: str
    world_id: str
    websocket: websockets.WebSocketServerProtocol
    topics: Set[str] = field(default_factory=set)
    connected_at: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    remote: str = ""
    messages_in: int = 0
    messages_out: int = 0
    auth_timestamp: str = ""


class Phase5WebSocketServer:
    def __init__(
        self,
        shared_secret: str,
        ws_host: str = "0.0.0.0",
        ws_port: int = 18765,
        monitor_host: str = "0.0.0.0",
        monitor_port: int = 18080,
        auth_window_seconds: int = 300,
        stale_connection_seconds: int = 240,
    ) -> None:
        self.shared_secret = shared_secret.encode("utf-8")
        self.ws_host = ws_host
        self.ws_port = ws_port
        self.monitor_host = monitor_host
        self.monitor_port = monitor_port
        self.auth_window_seconds = auth_window_seconds
        self.stale_connection_seconds = stale_connection_seconds
        self.connections: Dict[str, ConnectionState] = {}
        self.topics: Dict[str, Set[str]] = {}
        self.metrics: Dict[str, Any] = {
            "messages_received": 0,
            "messages_sent": 0,
            "auth_failures": 0,
            "rejected": 0,
            "errors": [],
        }
        self._ws_server: Optional[websockets.server.Serve] = None
        self._monitor_runner: Optional[web.AppRunner] = None
        self._shutdown = asyncio.Event()
        self._background_tasks: Set[asyncio.Task[Any]] = set()

    # ------------------------------------------------------------------ #
    async def start(self) -> None:
        """Start WebSocket + monitoring servers and run until stopped."""
        LOGGER.info("Starting Phase 5 WebSocket server on %s:%s", self.ws_host, self.ws_port)
        self._ws_server = await websockets.serve(
            self._ws_handler,
            self.ws_host,
            self.ws_port,
            max_queue=128,
            ping_interval=30,
            ping_timeout=30,
        )
        await self._start_monitoring_server()
        self._background_tasks.add(asyncio.create_task(self._stale_connection_watchdog()))
        LOGGER.info("Monitoring UI available at http://%s:%s/monitor", self.monitor_host, self.monitor_port)
        await self._shutdown.wait()

    async def stop(self) -> None:
        """Gracefully stop servers."""
        self._shutdown.set()
        if self._ws_server:
            self._ws_server.close()
        if self._monitor_runner:
            await self._monitor_runner.cleanup()
        for task in list(self._background_tasks):
            task.cancel()
            with contextlib.suppress(Exception):
                await task

    # ------------------------------------------------------------------ #
    async def _ws_handler(self, websocket: websockets.WebSocketServerProtocol, path: str) -> None:
        headers = websocket.request_headers
        world_id = headers.get("X-Phase5-World", "").strip()
        ts_header = headers.get("X-Phase5-Timestamp", "").strip()
        signature = headers.get("X-Phase5-Signature", "").strip()

        if not self._validate_header_auth(world_id, ts_header, signature):
            self.metrics["auth_failures"] += 1
            await websocket.close(code=4401, reason="invalid authentication")
            return

        conn_id = str(uuid.uuid4())
        remote = self._safe_remote(websocket)
        state = ConnectionState(
            id=conn_id,
            world_id=world_id,
            websocket=websocket,
            topics=set(),
            remote=remote,
            auth_timestamp=ts_header,
        )
        self.connections[conn_id] = state
        LOGGER.info("Agent connected: %s (%s) from %s", world_id or "unknown", conn_id, remote)

        try:
            async for raw in websocket:
                await self._handle_message(conn_id, raw)
        except ConnectionClosed:
            LOGGER.info("Connection closed: %s (%s)", world_id, conn_id)
        except Exception as exc:  # pragma: no cover - runtime guard
            self.metrics["errors"].append({"connection": conn_id, "error": str(exc)})
            LOGGER.exception("Error handling connection %s: %s", conn_id, exc)
        finally:
            await self._cleanup_connection(conn_id)

    async def _handle_message(self, conn_id: str, raw: Any) -> None:
        state = self.connections.get(conn_id)
        if not state:
            return
        state.last_seen = time.time()
        state.messages_in += 1
        self.metrics["messages_received"] += 1

        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            await self._send_error(state, "invalid_json", "Message must be valid JSON")
            return

        if not self._validate_message_signature(message):
            self.metrics["auth_failures"] += 1
            await self._send_error(state, "invalid_signature", "Signature check failed")
            return

        msg_type = message.get("msg_type")
        if msg_type == "subscribe":
            topics = set(message.get("topics", []) or [])
            await self._handle_subscribe(state, topics)
            return
        if msg_type == "unsubscribe":
            topics = set(message.get("topics", []) or [])
            await self._handle_unsubscribe(state, topics)
            return
        if msg_type == "heartbeat":
            await self._send_ack(state, message, "heartbeat_ok")
            return
        if msg_type == "publish":
            await self._handle_publish(state, message)
            return

        await self._send_error(state, "unsupported_type", f"Unknown msg_type: {msg_type}")

    async def _handle_subscribe(self, state: ConnectionState, topics: Set[str]) -> None:
        if not topics:
            await self._send_error(state, "invalid_request", "topics list required")
            return
        for topic in topics:
            state.topics.add(topic)
            self.topics.setdefault(topic, set()).add(state.id)
        await self._send_ack(state, {"topics": list(topics)}, "subscribed")

    async def _handle_unsubscribe(self, state: ConnectionState, topics: Set[str]) -> None:
        for topic in topics:
            state.topics.discard(topic)
            self.topics.get(topic, set()).discard(state.id)
        await self._send_ack(state, {"topics": list(topics)}, "unsubscribed")

    async def _handle_publish(self, state: ConnectionState, message: Dict[str, Any]) -> None:
        topic = message.get("topic")
        payload = message.get("payload")
        correlation_id = message.get("correlation_id") or message.get("id") or str(uuid.uuid4())
        priority = message.get("priority", "normal")
        if not topic:
            await self._send_error(state, "invalid_request", "topic is required for publish")
            return

        broadcast_envelope = {
            "msg_type": "event",
            "topic": topic,
            "from_world": state.world_id,
            "payload": payload,
            "priority": priority,
            "correlation_id": correlation_id,
            "timestamp": time.time(),
        }

        subscribers = [cid for cid in self.topics.get(topic, set()) if cid != state.id]
        delivered = 0
        for target_id in subscribers:
            delivered += await self._send_with_retry(target_id, broadcast_envelope)

        await self._send_ack(
            state,
            {
                "topic": topic,
                "delivered": delivered,
                "subscribers": len(subscribers),
                "correlation_id": correlation_id,
            },
            "published",
        )

    # ------------------------------------------------------------------ #
    def _validate_header_auth(self, world_id: str, timestamp: str, signature: str) -> bool:
        if not world_id or not timestamp or not signature:
            return False
        if not self._is_fresh(timestamp):
            return False
        expected = self._sign(f"{timestamp}\n{world_id}")
        provided = signature.replace("sha256=", "")
        return hmac.compare_digest(expected, provided)

    def _validate_message_signature(self, message: Dict[str, Any]) -> bool:
        signature = (message.get("signature") or "").replace("sha256=", "")
        timestamp = message.get("timestamp")
        if not signature or not timestamp:
            return False
        if not self._is_fresh(timestamp):
            return False
        body = {k: v for k, v in message.items() if k != "signature"}
        canonical = json.dumps(body, sort_keys=True)
        expected = self._sign(f"{timestamp}\n{canonical}")
        return hmac.compare_digest(expected, signature)

    def _sign(self, payload: str) -> str:
        return hmac.new(self.shared_secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()

    def _is_fresh(self, timestamp: Any) -> bool:
        ts_float: Optional[float] = None
        try:
            ts_float = float(timestamp)
        except Exception:
            with contextlib.suppress(Exception):
                ts_float = datetime.fromisoformat(str(timestamp).replace("Z", "")).timestamp()
            if ts_float is None:
                with contextlib.suppress(Exception):
                    parsed = time.strptime(str(timestamp).split("Z")[0], "%Y-%m-%dT%H:%M:%S")
                    ts_float = time.mktime(parsed)
        if ts_float is None:
            return False
        return abs(time.time() - ts_float) <= self.auth_window_seconds

    def _safe_remote(self, websocket: websockets.WebSocketServerProtocol) -> str:
        try:
            host, port = websocket.remote_address  # type: ignore
            return f"{host}:{port}"
        except Exception:
            return "unknown"

    # ------------------------------------------------------------------ #
    async def _send_ack(self, state: ConnectionState, message: Dict[str, Any], status: str) -> None:
        ack = {
            "msg_type": "ack",
            "status": status,
            "timestamp": time.time(),
            "world_id": "phase5_hub",
            "correlation_id": message.get("correlation_id") or message.get("id"),
        }
        await self._send_json(state, ack)

    async def _send_error(self, state: ConnectionState, code: str, reason: str) -> None:
        error_msg = {
            "msg_type": "error",
            "code": code,
            "reason": reason,
            "timestamp": time.time(),
        }
        self.metrics["errors"].append({"connection": state.id, "code": code, "reason": reason})
        await self._send_json(state, error_msg)

    async def _send_with_retry(self, target_id: str, payload: Dict[str, Any]) -> int:
        target = self.connections.get(target_id)
        if not target:
            return 0
        attempts = 0
        for backoff in (0.05, 0.25, 0.75):
            attempts += 1
            try:
                await target.websocket.send(json.dumps(payload))
                target.messages_out += 1
                self.metrics["messages_sent"] += 1
                return 1
            except Exception:
                await asyncio.sleep(backoff)
                continue
        await self._cleanup_connection(target_id)
        return 0

    async def _send_json(self, state: ConnectionState, payload: Dict[str, Any]) -> None:
        try:
            await state.websocket.send(json.dumps(payload))
            state.messages_out += 1
            self.metrics["messages_sent"] += 1
        except Exception as exc:
            self.metrics["errors"].append({"connection": state.id, "error": str(exc)})

    async def _cleanup_connection(self, conn_id: str) -> None:
        state = self.connections.pop(conn_id, None)
        if not state:
            return
        for topic in list(state.topics):
            self.topics.get(topic, set()).discard(conn_id)
        try:
            await state.websocket.close()
        except Exception:
            pass

    async def _stale_connection_watchdog(self) -> None:
        while not self._shutdown.is_set():
            now = time.time()
            stale = [
                conn_id
                for conn_id, state in self.connections.items()
                if now - state.last_seen > self.stale_connection_seconds
            ]
            for conn_id in stale:
                LOGGER.info("Closing stale connection %s", conn_id)
                await self._cleanup_connection(conn_id)
            await asyncio.sleep(15)

    # ------------------------------------------------------------------ #
    async def _start_monitoring_server(self) -> None:
        app = web.Application()
        app.router.add_get("/health", self._http_health)
        app.router.add_get("/state", self._http_state)
        app.router.add_get("/metrics", self._http_metrics)
        app.router.add_get("/monitor", self._http_monitor)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, self.monitor_host, self.monitor_port)
        await site.start()
        self._monitor_runner = runner

    async def _http_health(self, _: web.Request) -> web.Response:
        return web.json_response(
            {
                "status": "ok",
                "connected": len(self.connections),
                "topics": {topic: len(conns) for topic, conns in self.topics.items()},
            }
        )

    async def _http_state(self, _: web.Request) -> web.Response:
        connections = [
            {
                "id": state.id,
                "world_id": state.world_id,
                "topics": sorted(state.topics),
                "connected_at": state.connected_at,
                "last_seen": state.last_seen,
                "remote": state.remote,
                "messages_in": state.messages_in,
                "messages_out": state.messages_out,
                "auth_timestamp": state.auth_timestamp,
            }
            for state in self.connections.values()
        ]
        return web.json_response({"connections": connections, "topics": {k: list(v) for k, v in self.topics.items()}})

    async def _http_metrics(self, _: web.Request) -> web.Response:
        return web.json_response(self.metrics)

    async def _http_monitor(self, _: web.Request) -> web.Response:
        return web.Response(text=_MONITOR_HTML, content_type="text/html")


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing config at {CONFIG_PATH}")
    return json.loads(CONFIG_PATH.read_text())


_MONITOR_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Phase 5 WebSocket Monitor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; background: #0c1220; color: #e8edf7; }
    h1 { margin-bottom: 8px; }
    .card { background: #121a2c; border: 1px solid #1f2b44; border-radius: 10px; padding: 16px; margin-bottom: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #1f2b44; }
    th { text-align: left; color: #8fb2ff; }
    .pill { padding: 2px 8px; border-radius: 999px; background: #1f2b44; color: #8fb2ff; display: inline-block; margin-right: 6px; }
  </style>
</head>
<body>
  <h1>Phase 5 Active Connections</h1>
  <div class="card">
    <div id="summary">Loading...</div>
  </div>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>World</th><th>Topics</th><th>Remote</th><th>Connected</th><th>Last Seen</th><th>Msg In</th><th>Msg Out</th>
        </tr>
      </thead>
      <tbody id="connections"></tbody>
    </table>
  </div>
  <script>
    async function loadState() {
      try {
        const res = await fetch('/state');
        const data = await res.json();
        document.getElementById('summary').innerHTML = `
          <strong>${data.connections.length}</strong> connected | Topics: ${Object.keys(data.topics).length}`;
        const tbody = document.getElementById('connections');
        tbody.innerHTML = data.connections.map(c => `
          <tr>
            <td>${c.world_id}</td>
            <td>${c.topics.map(t => `<span class="pill">${t}</span>`).join('')}</td>
            <td>${c.remote}</td>
            <td>${new Date(c.connected_at * 1000).toLocaleTimeString()}</td>
            <td>${new Date(c.last_seen * 1000).toLocaleTimeString()}</td>
            <td>${c.messages_in}</td>
            <td>${c.messages_out}</td>
          </tr>`).join('');
      } catch (err) {
        document.getElementById('summary').textContent = 'Error loading state';
      }
    }
    setInterval(loadState, 2000);
    loadState();
  </script>
</body>
</html>
"""


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
    )
    config = load_config()
    server = Phase5WebSocketServer(
        shared_secret=config["auth"]["shared_secret"],
        ws_host=config["transports"]["websocket"]["host"],
        ws_port=config["transports"]["websocket"]["port"],
        monitor_host=config["transports"]["http"]["host"],
        monitor_port=config["transports"]["http"]["port"],
    )

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, server._shutdown.set)

    await server.start()


if __name__ == "__main__":
    asyncio.run(main())
