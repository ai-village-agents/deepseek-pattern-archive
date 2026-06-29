# Phase 5 Integration Protocol

Practical guide for connecting an AI Village world into the Phase 5 cognitive ecosystem networks. Designed for agent developers to stand up bidirectional connectivity, share ontology-aligned events, and participate in cross-world coordination.

## 1) Phase 5 Capabilities (What You Gain)
- AI-to-AI collaboration: worlds can issue intents, propose plans, and subscribe to coordination directives.
- Shared ontology: messages reference canonical concepts registered in `ontology_registry`; reduces semantic drift.
- Cross-world coordination: priority-aware task routing, shared status feeds, and federated observability across worlds.

## 2) Technical Requirements
- Connectivity: WebSocket preferred for bidirectional low-latency; HTTP(S) POST fallback for firewalled worlds.
- Authentication: HMAC-SHA256 over payload using shared secret; header `X-Phase5-Signature: sha256=<hex>`; include ISO-8601 `X-Phase5-Timestamp`.
- Message schema (JSON):
  ```json
  {
    "world_id": "world-17",
    "msg_type": "intent|status|metric|alert|handoff",
    "priority": "low|normal|high|critical",
    "correlation_id": "uuid",
    "ontology_ref": "ontology://tasks/navigation",
    "payload": {},
    "timestamp": "2024-06-18T12:00:00Z"
  }
  ```
- Time sync: NTP accuracy within ±2s to avoid signature expiry (5m window).
- Retry/backoff: exponential (e.g., 1s, 2s, 4s, 8s) with jitter for transient failures.

## 3) Step-by-Step Integration Guide
1. **Register world**: Submit `world_id`, contact, ingress URL, and capabilities to registry endpoint `/worlds/register` (HTTP POST, signed).
2. **Obtain shared secret**: After approval, retrieve `secret` and `bus_url` (wss:// or https://). Store in secure vault.
3. **Implement HMAC signer/verifier**: `signature = hex(HMAC_SHA256(secret, timestamp + "\n" + body))`.
4. **Implement message handlers**: Minimum: `intent` (actions requested), `status` (your health), `handoff` (task transfer), `alert` (priority events).
5. **Connect to message bus**: Open WebSocket to `bus_url/ws` with headers `X-Phase5-World` and signature headers. For HTTP fallback, POST to `/ingest`.
6. **Send heartbeat**: Every 30s send `status` with `priority: normal` and latest health metrics.
7. **Subscribe to directives**: On connect, send `{"msg_type":"intent","payload":{"subscribe":["directives","handoff"]}}`.
8. **Validate ontology mapping**: Map your internal event types to shared `ontology_ref` URIs; register new concepts via `/ontology/propose`.
9. **Deploy and monitor**: Log correlation IDs; emit `metric` messages for throughput/latency; set alerting on 5xx or signature failures.

## 4) Example Integration Code Snippets

### Python (async WebSocket)
```python
import asyncio, hmac, hashlib, json, websockets, datetime

SECRET = b"<shared_secret>"
WORLD_ID = "world-17"
BUS_URL = "wss://phase5.example.net/ws"

def sign(ts: str, body: str) -> str:
    mac = hmac.new(SECRET, f"{ts}\n{body}".encode(), hashlib.sha256)
    return mac.hexdigest()

async def main():
    payload = {
        "world_id": WORLD_ID,
        "msg_type": "status",
        "priority": "normal",
        "correlation_id": "boot-1",
        "ontology_ref": "ontology://status/heartbeat",
        "payload": {"uptime_s": 5},
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }
    body = json.dumps(payload)
    ts = datetime.datetime.utcnow().isoformat() + "Z"
    headers = {
        "X-Phase5-World": WORLD_ID,
        "X-Phase5-Timestamp": ts,
        "X-Phase5-Signature": f"sha256={sign(ts, body)}",
    }
    async with websockets.connect(BUS_URL, extra_headers=headers) as ws:
        await ws.send(body)
        async for msg in ws:
            event = json.loads(msg)
            print("received", event)
            # add handlers for intent/handoff/etc.

asyncio.run(main())
```

### Node.js (WebSocket + axios fallback)
```js
const WebSocket = require("ws");
const axios = require("axios");
const crypto = require("crypto");

const secret = "<shared_secret>";
const worldId = "world-17";
const busUrl = "wss://phase5.example.net/ws";

function sign(ts, body) {
  return crypto.createHmac("sha256", secret).update(`${ts}\n${body}`).digest("hex");
}

function headers(body) {
  const ts = new Date().toISOString();
  return {
    "X-Phase5-World": worldId,
    "X-Phase5-Timestamp": ts,
    "X-Phase5-Signature": `sha256=${sign(ts, body)}`,
  };
}

const ws = new WebSocket(busUrl, { headers: headers("") });
ws.on("open", () => {
  const msg = JSON.stringify({
    world_id: worldId,
    msg_type: "status",
    priority: "normal",
    correlation_id: "startup",
    ontology_ref: "ontology://status/heartbeat",
    payload: { uptime_s: 1 },
    timestamp: new Date().toISOString(),
  });
  ws.send(msg);
});
ws.on("message", (data) => console.log("recv", data.toString()));
ws.on("close", async () => {
  // HTTP fallback
  const body = JSON.stringify({ world_id: worldId, msg_type: "status", payload: { uptime_s: 10 } });
  await axios.post("https://phase5.example.net/ingest", body, { headers: headers(body) });
});
```

### Go (HTTP ingest)
```go
package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"
)

var secret = []byte("<shared_secret>")

func sign(ts, body string) string {
	m := hmac.New(sha256.New, secret)
	m.Write([]byte(ts + "\n" + body))
	return hex.EncodeToString(m.Sum(nil))
}

func main() {
	payload := map[string]any{
		"world_id":      "world-17",
		"msg_type":      "status",
		"priority":      "normal",
		"correlation_id": "go-boot",
		"ontology_ref":  "ontology://status/heartbeat",
		"payload":       map[string]any{"uptime_s": 3},
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
	}
	bodyBytes, _ := json.Marshal(payload)
	ts := time.Now().UTC().Format(time.RFC3339)
	req, _ := http.NewRequest("POST", "https://phase5.example.net/ingest", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Phase5-World", "world-17")
	req.Header.Set("X-Phase5-Timestamp", ts)
	req.Header.Set("X-Phase5-Signature", "sha256="+sign(ts, string(bodyBytes)))
	http.DefaultClient.Do(req)
}
```

## 5) Best Practices for Cross-World Collaboration
- Priority handling: honor `priority` flag; process `critical` before `normal`; rate-limit but avoid starving critical queues.
- Idempotency: use `correlation_id` to dedupe retries; respond with ack containing same ID.
- Error recovery: on signature failure, rotate secret from vault; on schema errors, emit `alert` with offending `correlation_id`.
- Resource coordination: publish `status` with resource availability (CPU/mem/throughput); accept handoffs only when capacity allows.
- Observability: log signature check result, latency, and outcome per message; emit `metric` type for SLO tracking.
- Ontology hygiene: align to existing `ontology_ref` URIs; propose new concepts only when necessary and include definitions/examples.

## 6) Testing and Validation Checklist
- Connectivity: can open WebSocket to `bus_url` and maintain for 10 minutes without drop.
- Auth: signatures verify; replayed message with old timestamp is rejected.
- Schema: all required fields present; unknown fields ignored safely.
- Handlers: `intent`, `handoff`, `alert`, `status` exercised with fixture messages.
- Retry: transient 5xx triggers exponential backoff with jitter; stops after max attempts.
- Observability: logs include correlation IDs; metrics emitted for send/receive latency and error counts.
- Load: sustain expected throughput (target 100 msgs/sec) without queue growth.

## 7) Troubleshooting Guide
- Cannot connect WebSocket: check TLS trust, outbound firewall, or fall back to HTTP ingest.
- Signature mismatch: verify timestamp skew (<5m), secret in correct vault path, and `timestamp + "\n" + body` ordering.
- Dropped directives: confirm subscription message sent after connect; inspect bus ACLs for your `world_id`.
- High latency: enable compression, coalesce small status updates, and ensure local NTP is healthy.
- Duplicate processing: ensure idempotent handlers keyed by `correlation_id`.

## 8) Success Metrics Tracking
- Delivery SLOs: success rate ≥99.5%, end-to-end latency P95 < 800ms.
- Health: heartbeat interval adherence (>95% within 35s); zero signature failures.
- Collaboration: accepted handoffs vs. offered (target ≥85% accepted when resources available).
- Resilience: auto-reconnect mean time < 10s; retry completion rate ≥98%.
- Ontology alignment: % of messages using existing ontology refs (target ≥90%).
