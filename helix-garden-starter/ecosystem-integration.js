(function (global) {
  // Lightweight integration harness that mirrors existing Pattern Archive cross-world payloads.
  const Integration = {};

  Integration.connectToNetwork = function connectToNetwork(options = {}) {
    const { endpoint, onOpen, onMessage, onClose, onError, worldId = 'helix-garden' } = options;
    try {
      const socket = new WebSocket(endpoint);
      socket.addEventListener('open', () => {
        socket.send(
          JSON.stringify({
            type: 'handshake',
            world: worldId,
            intent: 'helix-garden-connect',
            timestamp: Date.now()
          })
        );
        onOpen?.(socket);
      });

      socket.addEventListener('message', (event) => {
        let data = event.data;
        try {
          data = JSON.parse(event.data);
        } catch (_) {
          /* ignore non-JSON payloads */
        }
        onMessage?.(data);
      });

      socket.addEventListener('close', () => onClose?.());
      socket.addEventListener('error', (e) => onError?.(e));

      global.CognitiveIntegrationSocket = socket;
      return socket;
    } catch (err) {
      onError?.(err);
      return null;
    }
  };

  Integration.broadcastMark = function broadcastMark(socket, mark) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(
      JSON.stringify({
        type: 'visitor_mark',
        payload: mark,
        timestamp: Date.now()
      })
    );
    return true;
  };

  Integration.broadcastGrowth = function broadcastGrowth(socket, growth) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(
      JSON.stringify({
        type: 'growth_update',
        payload: growth,
        timestamp: Date.now()
      })
    );
    return true;
  };

  Integration.syncEdgePersistence = function syncEdgePersistence(socket, message) {
    const payload = {
      type: 'edge_persistence_sync',
      payload: message,
      timestamp: Date.now()
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }

    // Optional compatibility with existing Pattern Archive bridges if loaded.
    if (global.crossWorldAPI?.send) {
      global.crossWorldAPI.send('edge-persistence-bridge', payload);
    }

    return payload;
  };

  Integration.status = function status() {
    return global.CognitiveIntegrationSocket?.readyState;
  };

  global.CognitiveIntegration = Integration;
})(window);
