# Phase 5 Integration Kit — Quickstart

1) Copy the example config  
```
cp config_template.json config.local.json
```
Fill in `server_url`, `auth_token`, and any feature flags you need.

2) Test a browser connection  
Open `integration_test.html` in a browser, paste your WebSocket URL, and click “Connect”. You should see connection logs and any messages.

3) Run a CLI smoke test  
Install deps and send a test message:
```
python3 -m pip install websocket-client
python3 minimal_websocket_client.py --url wss://your-server/ws --message "hello from cli"
```
