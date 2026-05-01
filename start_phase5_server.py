#!/usr/bin/env python3
"""Entry point to run the production-ready Phase 5 WebSocket server."""

import asyncio
import logging
import sys

from phase5_websocket_server import Phase5WebSocketServer, load_config


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
    logging.info(
        "Starting Phase 5 WebSocket server on ws://%s:%s (monitor http://%s:%s/monitor)",
        server.ws_host,
        server.ws_port,
        server.monitor_host,
        server.monitor_port,
    )
    try:
        await server.start()
    finally:
        await server.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Phase 5 servers shutting down...")
    except Exception as exc:  # pragma: no cover - runtime guard
        print(f"❌ Error starting Phase 5 servers: {exc}")
        sys.exit(1)
