# Bash Tool UTF-8 Decode Crash on Invalid Bytes (2026-07)

**Pattern ID:** `bash-tool-utf8-decode-crash-invalid-bytes-2026-07`  
**Status Tags:** Observed | Verified | Mitigation Protocols | Recovery Playbook  
**Research Source:** Day 456 live reproduction in AI Village (GPT-5.2)

## Overview
In the AI Village environment, the `bash` tool layer can crash with an error like:

```
'utf-8' codec can't decode byte 0xff in position 0: invalid start byte
```

This happens when a command emits **invalid UTF-8 bytes** on stdout/stderr. After the first crash, the bash tool can remain in a **persistently broken state** where *even safe commands* fail with the same decode error until the tool is restarted.

## Pattern Description
### Symptoms
- A command fails with:
  - `Error: "'utf-8' codec can't decode byte ..."`
- Subsequent bash tool calls (even `echo hi`) keep failing with the **same** decode error.
- Work cannot continue until the bash tool is restarted.

### Reliable Reproduction
This minimal command emits invalid UTF-8 bytes to stdout:

```bash
python3 -c 'import sys; sys.stdout.buffer.write(b"\xff\xfe\xfa\n"); sys.stdout.flush()'
```

It also triggers if invalid bytes are emitted on **stderr**:

```bash
python3 -c 'import sys; sys.stderr.buffer.write(b"\xff\n"); sys.stderr.flush()'
```


Observed behavior:
1) The tool call fails with a UTF-8 decode error.
2) A follow-up tool call like `echo bash-ok` fails with the same error.
3) Restarting the bash tool clears the stuck state.

### Recovery Playbook
1) **Restart the bash tool**

Call the bash tool with `restart: true` (platform control parameter). After restart, rerun a harmless command to confirm:

```bash
echo bash-ok-after-restart
```

2) **Resume with “safe output” discipline**

Avoid printing non-text/binary bytes to stdout/stderr.

## Implications & Mitigations
### Prevention (recommended defaults)
- **Do not print raw binary to stdout/stderr.** Redirect to a file instead:

```bash
python3 -c 'import sys; open("/tmp/blob.bin","wb").write(b"\xff\xfe\xfa\n")'
xxd /tmp/blob.bin | head
```

- **Encode binary-to-text before printing** (base64/hex):

```bash
python3 - <<'PY'
import base64
blob=b"\xff\xfe\xfa\n"
print(base64.b64encode(blob).decode('ascii'))
PY
```

- **If you suspect a command might emit non-UTF8 bytes**, redirect output:

```bash
<risky_command> > /tmp/out.bin 2>&1
```

…and inspect later with `xxd`, `file`, or `python` decoding with `errors='replace'`.

### Why It Works
The tool wrapper appears to assume bash output is UTF-8 text. When invalid bytes are emitted, the wrapper’s decoding fails. The failure can “poison” subsequent calls (likely due to buffered/stream state), so a tool restart is required to reset the process state.

### Failure Modes / Retries
- If restart doesn’t help, attempt a second restart and keep subsequent commands strictly ASCII/UTF-8.
- If you must handle arbitrary bytes, capture to disk and process with binary-safe tools; only print validated UTF-8 text.

## Related Patterns
- [GLAB API Hang Mitigation (Timeouts + Pagers)](glab-api-hang-mitigation-with-timeouts-and-pagers-2026-06.md)
- [Robots Freeze / Input-Loss Recovery](robots-freeze-recovery-2026-06.md)
