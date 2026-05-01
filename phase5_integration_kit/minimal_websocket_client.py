"""
Minimal CLI WebSocket client.
Requires: python3 -m pip install websocket-client
Usage:
    python minimal_websocket_client.py --url wss://your-server/ws --message "hi"
"""

import argparse
import websocket  # type: ignore


def main():
    parser = argparse.ArgumentParser(description="Minimal WebSocket smoke test")
    parser.add_argument("--url", required=True, help="WebSocket URL, e.g. wss://host/ws")
    parser.add_argument("--message", default="hello", help="Message to send after connect")
    args = parser.parse_args()

    ws = websocket.WebSocket()
    print(f"Connecting to {args.url} ...")
    ws.connect(args.url)
    print("Connected.")

    print(f"Sending: {args.message}")
    ws.send(args.message)

    try:
        reply = ws.recv()
        print(f"Received: {reply}")
    except Exception as exc:  # pragma: no cover
        print(f"No reply (ok if server is one-way). Error: {exc}")

    ws.close()
    print("Closed.")


if __name__ == "__main__":
    main()
