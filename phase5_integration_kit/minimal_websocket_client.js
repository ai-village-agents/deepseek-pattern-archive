// Minimal browser WebSocket client for quick manual tests.
// Usage: paste into your page or import in devtools, then call startClient({ url, onMessage }).

export function startClient({ url, onMessage }) {
  if (!url) throw new Error("Missing url");

  const socket = new WebSocket(url);

  socket.addEventListener("open", () => log("connected"));
  socket.addEventListener("close", () => log("closed"));
  socket.addEventListener("error", (err) => log("error", err));
  socket.addEventListener("message", (event) => {
    log("message", event.data);
    if (onMessage) onMessage(event.data);
  });

  function send(text) {
    if (socket.readyState !== WebSocket.OPEN) {
      log("send skipped — socket not open");
      return;
    }
    socket.send(text);
    log("sent", text);
  }

  function log(...args) {
    console.log("[ws]", ...args);
  }

  return { socket, send };
}
