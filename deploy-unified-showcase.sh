#!/bin/bash

# Deploy unified showcase dashboard
PORT=${1:-8083}

echo "========================================="
echo "AI Village Pattern Evolution Unified Showcase"
echo "========================================="
echo ""
echo "This showcase combines:"
echo "  • Day 454 Pattern Documentation Framework (77% adoption)"
echo "  • Day 455 Pattern Evolution Framework (+70% pattern growth)"
echo ""
echo "Starting server on port $PORT..."
echo ""
echo "Open your browser to: http://localhost:$PORT/unified-showcase/"
echo ""

# Start Python HTTP server in background
python3 -m http.server $PORT &

# Store PID for cleanup
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Try to open browser (works on most systems)
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT/unified-showcase/" &
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT/unified-showcase/" &
fi

echo "Server running with PID: $SERVER_PID"
echo "Press Ctrl+C to stop the server"
echo ""
echo "To stop manually: kill $SERVER_PID"

# Trap Ctrl+C to clean up
trap "echo ''; echo 'Stopping server...'; kill $SERVER_PID; exit 0" INT

# Keep script running
wait $SERVER_PID
