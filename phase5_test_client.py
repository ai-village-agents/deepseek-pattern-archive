#!/usr/bin/env python3
"""
Phase 5 WebSocket test client for AI Village agents.

This script demonstrates how to connect to the Pattern Archive cognitive network,
authenticate with the HMAC scheme used by `phase5_websocket_server.py`, subscribe
to topics, and exchange collaboration messages interactively.

Quick start (uses defaults from config/cognitive_networks_config.json when present):
  python phase5_test_client.py --world-id the_drift --topics directives,handoff,status

Key behaviors
- Connection setup with header-based HMAC authentication.
- Message-level HMAC signing on every send (matches server validation).
- Subscribe/unsubscribe to topics and publish sample collaboration payloads.
- Continuous receive loop that prints inbound events/acks/errors.
- Simple REPL: `sub`, `unsub`, `pub`, `heartbeat`, `demo`, `quit`.

Adaptation notes for other agents/worlds:
- Set `--world-id` and `--secret` (or PHASE5_SHARED_SECRET env) to your values.
- Update `--url` if the bus is reachable at a different host/port or wss:// endpoint.
- Extend `demo_payloads` in `Phase5TestClient._demo_collaboration_payload` to reflect
  your ontology references and agent capabilities.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import hashlib
import hmac
import json
import logging
import os
import signal
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import websockets
from websockets import WebSocketClientProtocol
from websockets.exceptions import ConnectionClosed

CONFIG_PATH = Path("config/cognitive_networks_config.json")
DEFAULT_TOPICS = ["directives", "handoff", "status"]


def load_defaults_from_config(config_path: Path = CONFIG_PATH) -> Tuple[str, int, Optional[str]]:
    """Return (host, port, shared_secret or None) pulled from the Phase 5 config if available."""
    if not config_path.exists():
        return "0.0.0.0", 18765, None
    try:
        data = json.loads(config_path.read_text())
        host = data.get("transports", {}).get("websocket", {}).get("host", "0.0.0.0")
        port = int(data.get("transports", {}).get("websocket", {}).get("port", 18765))
        secret = data.get("auth", {}).get("shared_secret")
        return host, port, secret
    except Exception as exc:  # pragma: no cover - defensive parsing
        print(f"Warning: could not parse config file {config_path}: {exc}")
        return "0.0.0.0", 18765, None


def hmac_sign(shared_secret: str, payload: str) -> str:
    """Return hex HMAC-SHA256 of payload with the provided shared secret."""
    mac = hmac.new(shared_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256)
    return mac.hexdigest()


@dataclass
class ClientSettings:
    url: str
    world_id: str
    shared_secret: str
    topics: List[str]
    verbose: bool = False


class Phase5TestClient:
    """Interactive WebSocket client that mirrors the server's auth and message schema."""

    def __init__(self, settings: ClientSettings) -> None:
        self.settings = settings
        self.websocket: Optional[WebSocketClientProtocol] = None
        self._recv_task: Optional[asyncio.Task[Any]] = None
        self._shutdown = asyncio.Event()
        self._logger = logging.getLogger("phase5_test_client")

    # ------------------------------------------------------------------ #
    async def connect(self) -> None:
        """Open the WebSocket connection with header-based HMAC authentication."""
        headers = self._build_auth_headers()
        try:
            self.websocket = await websockets.connect(self.settings.url, extra_headers=headers)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to connect to {self.settings.url} as world '{self.settings.world_id}': {exc}"
            ) from exc

        self._logger.info("Connected to %s", self.settings.url)
        self._recv_task = asyncio.create_task(self._recv_loop())

        # Auto-subscribe to requested topics.
        if self.settings.topics:
            await self.send_subscribe(self.settings.topics)

    async def close(self) -> None:
        """Close the WebSocket connection cleanly."""
        self._shutdown.set()
        if self._recv_task:
            self._recv_task.cancel()
            with contextlib.suppress(Exception):
                await self._recv_task
        if self.websocket:
            with contextlib.suppress(Exception):
                await self.websocket.close()
        self.websocket = None

    # ------------------------------------------------------------------ #
    async def _recv_loop(self) -> None:
        """Continuously read and display incoming messages."""
        assert self.websocket, "websocket not connected"
        try:
            async for raw in self.websocket:
                self._pretty_print_incoming(raw)
        except ConnectionClosed as exc:
            self._logger.warning("Connection closed (%s): %s", exc.code, exc.reason)
            self._shutdown.set()
        except Exception as exc:  # pragma: no cover - runtime guard
            self._logger.error("Receive loop error: %s", exc)
            self._shutdown.set()

    def _pretty_print_incoming(self, raw: Any) -> None:
        """Render inbound JSON with minimal noise."""
        try:
            data = json.loads(raw)
        except Exception:
            print(f"[recv] {raw!r}")
            return
        msg_type = data.get("msg_type")
        topic = data.get("topic")
        status = data.get("status") or data.get("code")
        correlation_id = data.get("correlation_id")
        prefix = f"[recv:{msg_type or 'unknown'}]"
        details = []
        if topic:
            details.append(f"topic={topic}")
        if status:
            details.append(f"status={status}")
        if correlation_id:
            details.append(f"cid={correlation_id}")
        line = " ".join([prefix] + details)
        print(line or prefix)
        if self.settings.verbose:
            print(json.dumps(data, indent=2))

    # ------------------------------------------------------------------ #
    async def send_subscribe(self, topics: Iterable[str]) -> None:
        await self._send_signed(
            {
                "msg_type": "subscribe",
                "topics": list(topics),
                "world_id": self.settings.world_id,
                "correlation_id": f"sub-{uuid.uuid4()}",
            }
        )
        print(f"[send] subscribed to {', '.join(topics)}")

    async def send_unsubscribe(self, topics: Iterable[str]) -> None:
        await self._send_signed(
            {
                "msg_type": "unsubscribe",
                "topics": list(topics),
                "world_id": self.settings.world_id,
                "correlation_id": f"unsub-{uuid.uuid4()}",
            }
        )
        print(f"[send] unsubscribed from {', '.join(topics)}")

    async def send_heartbeat(self) -> None:
        await self._send_signed(
            {
                "msg_type": "heartbeat",
                "world_id": self.settings.world_id,
                "correlation_id": f"hb-{uuid.uuid4()}",
            }
        )
        print("[send] heartbeat")

    async def send_publish(self, topic: str, payload: Dict[str, Any], priority: str = "normal") -> None:
        await self._send_signed(
            {
                "msg_type": "publish",
                "topic": topic,
                "payload": payload,
                "priority": priority,
                "world_id": self.settings.world_id,
                "correlation_id": payload.get("correlation_id") or str(uuid.uuid4()),
            }
        )
        print(f"[send] publish -> {topic} ({priority})")

    async def send_demo_collaboration(self) -> None:
        """Send a prebuilt collaboration example so agents can mirror the pattern."""
        topic, payload = self._demo_collaboration_payload()
        await self.send_publish(topic, payload, priority=payload.get("priority", "normal"))

    # ------------------------------------------------------------------ #
    def _build_auth_headers(self) -> Dict[str, str]:
        """Construct connection headers expected by the server."""
        timestamp = str(time.time())
        signature = hmac_sign(self.settings.shared_secret, f"{timestamp}\n{self.settings.world_id}")
        return {
            "X-Phase5-World": self.settings.world_id,
            "X-Phase5-Timestamp": timestamp,
            "X-Phase5-Signature": f"sha256={signature}",
        }

    async def _send_signed(self, message: Dict[str, Any]) -> None:
        """Attach timestamp + signature and send to the WebSocket."""
        if not self.websocket:
            raise RuntimeError("WebSocket not connected; call connect() first.")

        message = {k: v for k, v in message.items() if v is not None}
        timestamp = time.time()
        message["timestamp"] = timestamp

        canonical = {k: v for k, v in message.items() if k != "signature"}
        canonical_json = json.dumps(canonical, sort_keys=True)
        signature = hmac_sign(self.settings.shared_secret, f"{timestamp}\n{canonical_json}")
        message["signature"] = f"sha256={signature}"

        try:
            await self.websocket.send(json.dumps(message))
        except Exception as exc:
            raise RuntimeError(f"Failed to send message {message.get('msg_type')}: {exc}") from exc

    def _demo_collaboration_payload(self) -> Tuple[str, Dict[str, Any]]:
        """Lightweight example payload showing ontology + intent/handoff structure."""
        correlation_id = f"demo-{uuid.uuid4()}"
        return (
            "directives",
            {
                "ontology_ref": "ontology://handoff/task_sync",
                "intent": "synchronize_task",
                "priority": "high",
                "correlation_id": correlation_id,
                "payload": {
                    "from_world": self.settings.world_id,
                    "target_world": "automation_observatory",
                    "task": "stabilize_handoff_pipeline",
                    "status": "proposed",
                    "notes": "Demo payload: adjust fields to match your world vocabulary.",
                },
            },
        )


async def _cli_loop(client: Phase5TestClient) -> None:
    """Simple command loop to simulate agent behavior."""
    help_text = (
        "Commands: sub <topics> | unsub <topics> | pub <topic> <json> "
        "| heartbeat | demo | quit\n"
        " - topics separated by comma or space (e.g., 'sub directives,handoff')\n"
        " - pub example: pub directives '{\"note\":\"hello from world\"}'"
    )
    print(help_text)
    while not client._shutdown.is_set():
        try:
            raw = await asyncio.to_thread(input, "phase5> ")
        except (EOFError, KeyboardInterrupt):
            break
        if not raw:
            continue
        parts = raw.strip().split(maxsplit=2)
        command = parts[0].lower()

        try:
            if command in {"quit", "exit"}:
                client._shutdown.set()
                break
            if command == "sub" and len(parts) >= 2:
                topics = _parse_topics(parts[1])
                await client.send_subscribe(topics)
                continue
            if command == "unsub" and len(parts) >= 2:
                topics = _parse_topics(parts[1])
                await client.send_unsubscribe(topics)
                continue
            if command == "heartbeat":
                await client.send_heartbeat()
                continue
            if command == "demo":
                await client.send_demo_collaboration()
                continue
            if command == "pub" and len(parts) >= 3:
                topic = parts[1]
                payload = _safe_json(parts[2])
                if not isinstance(payload, dict):
                    payload = {"message": parts[2]}
                await client.send_publish(topic, payload)
                continue
            print(help_text)
        except Exception as exc:
            print(f"Error: {exc}")


def _parse_topics(raw: str) -> List[str]:
    return [t.strip() for chunk in raw.split(",") for t in chunk.split() if t.strip()]


def _safe_json(raw: str) -> Any:
    try:
        return json.loads(raw)
    except Exception:
        return {"message": raw}


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")


async def _main_async(args: argparse.Namespace) -> None:
    host, port, secret_from_config = load_defaults_from_config()
    shared_secret = (
        args.secret
        or os.getenv("PHASE5_SHARED_SECRET")
        or secret_from_config
        or "changeme"
    )
    url = args.url or f"ws://{host}:{port}"
    topics = _parse_topics(args.topics) if args.topics else []

    settings = ClientSettings(
        url=url,
        world_id=args.world_id,
        shared_secret=shared_secret,
        topics=topics,
        verbose=args.verbose,
    )
    _setup_logging(settings.verbose)
    client = Phase5TestClient(settings)

    # Handle Ctrl+C cleanly.
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, client._shutdown.set)

    try:
        await client.connect()
    except Exception as exc:
        print(f"❌ Unable to connect: {exc}")
        return

    tasks = [asyncio.create_task(_cli_loop(client))]
    if client._recv_task:
        tasks.append(client._recv_task)
    try:
        await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            task.cancel()
            with contextlib.suppress(Exception):
                await task

    with contextlib.suppress(Exception):
        await client.close()


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    host, port, _ = load_defaults_from_config()
    parser = argparse.ArgumentParser(
        description="Interactive Phase 5 WebSocket test client with HMAC authentication."
    )
    parser.add_argument("--url", help=f"WebSocket URL (default ws://{host}:{port})")
    parser.add_argument("--world-id", required=True, help="World/agent identifier for headers and payloads.")
    parser.add_argument(
        "--secret",
        help="Shared secret for HMAC. Can also set PHASE5_SHARED_SECRET env; falls back to config file.",
    )
    parser.add_argument(
        "--topics",
        default=",".join(DEFAULT_TOPICS),
        help=f"Topics to auto-subscribe on connect (comma or space separated). Default: {', '.join(DEFAULT_TOPICS)}",
    )
    parser.add_argument("--verbose", action="store_true", help="Print full JSON for received messages.")
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> None:
    args = parse_args(argv)
    try:
        asyncio.run(_main_async(args))
    except KeyboardInterrupt:
        print("\nInterrupted, shutting down.")
    except Exception as exc:  # pragma: no cover - runtime guard
        print(f"Fatal error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
