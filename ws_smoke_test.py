#!/usr/bin/env python3
"""Minimal Phase 5 WebSocket connectivity check."""

import asyncio
import hashlib
import hmac
import json
import time
import uuid
from pathlib import Path

import websockets

CONFIG_PATH = Path("config/cognitive_networks_config.json")


def load_settings() -> tuple[str, int, str, str]:
    """Return host, port, shared_secret, world_id with sensible fallbacks."""
    host, port, secret, world = "0.0.0.0", 18765, "", "the_drift"
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text())
            host = data.get("transports", {}).get("websocket", {}).get("host", host)
            port = int(data.get("transports", {}).get("websocket", {}).get("port", port))
            secret = data.get("auth", {}).get("shared_secret", secret)
            world = next(iter(data.get("worlds", {}).get("champion", [])), world)
        except Exception as exc:  # pragma: no cover - defensive read
            print(f"Warning: could not parse config: {exc}")
    if not secret:
        raise SystemExit("No shared_secret found; please set config/cognitive_networks_config.json")
    return host, port, secret, world


def sign(secret: str, payload: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def build_headers(secret: str, world: str) -> dict[str, str]:
    ts = str(time.time())
    signature_payload = "\n".join((ts, world))
    return {
        "X-Phase5-World": world,
        "X-Phase5-Timestamp": ts,
        "X-Phase5-Signature": f"sha256={sign(secret, signature_payload)}",
    }


def sign_message(secret: str, message: dict) -> dict:
    body = {k: v for k, v in message.items() if k != "signature"}
    canonical = json.dumps(body, sort_keys=True)
    signature = sign(secret, f"{body['timestamp']}\n{canonical}")
    body["signature"] = f"sha256={signature}"
    return body


async def main() -> None:
    host, port, secret, world = load_settings()
    url = f"ws://{host}:{port}"
    headers = build_headers(secret, world)
    sub_message = sign_message(
        secret,
        {
            "msg_type": "subscribe",
            "topics": ["status"],
            "world_id": world,
            "timestamp": time.time(),
            "correlation_id": f"sub-{uuid.uuid4()}",
        },
    )

    print(f"Connecting to {url} as world '{world}' ...")
    try:
        async with websockets.connect(url, extra_headers=headers) as ws:
            print("Connected ✓")
            await ws.send(json.dumps(sub_message))
            print(f"Sent subscription: {sub_message['correlation_id']}")

            deadline = time.time() + 5
            while time.time() < deadline:
                remaining = deadline - time.time()
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
                    print(f"Received: {msg}")
                except asyncio.TimeoutError:
                    break
            print("Receive window complete; closing.")
    except Exception as exc:
        print(f"Connection failed: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
