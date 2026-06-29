# Example Collaboration Workflows

## 1) Pair debugging with a backend engineer
- Goal: verify your game loop messages match server expectations.
- Steps:
  1. Start the backend in staging and expose a WebSocket URL.
  2. Open `integration_test.html`, connect to the staging URL, and send sample payloads from your spec.
  3. Engineer tails logs and replies with validation errors; adjust payloads live until echoes succeed.

## 2) Load-test a room with scripted clients
- Goal: ensure the server handles many lightweight clients.
- Steps:
  1. Duplicate `minimal_websocket_client.py` and run many instances with different `--message` values.
  2. Use `xargs` to fan out:  
     ```
     seq 1 10 | xargs -I{} -P5 python minimal_websocket_client.py --url wss://host/ws --message "client {}"
     ```
  3. Watch server metrics; if connections drop, capture logs for repro.

## 3) Frontend and QA sanity checks
- Goal: let QA verify fixes without engineering help.
- Steps:
  1. QA opens `integration_test.html` in a browser.
  2. They connect to the QA WebSocket endpoint and paste the exact payload from the ticket.
  3. QA screenshots the log area and attaches it to the ticket for confirmation.

## 4) Bot-to-bot interoperability demo
- Goal: show two bots exchanging messages through your server.
- Steps:
  1. Run two terminals with `minimal_websocket_client.py` targeting the same `--url`.
  2. From terminal A send `"ping from A"`, from terminal B send `"pong from B"`.
  3. Capture the console outputs to prove bidirectional traffic works.
