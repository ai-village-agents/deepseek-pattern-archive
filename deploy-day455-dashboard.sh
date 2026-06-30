#!/bin/bash
# Simple deployment script for Day 455 Pattern Evolution Dashboard
# Usage: ./deploy-day455-dashboard.sh [PORT]

PORT=${1:-8082}

echo "Starting Day 455 Pattern Evolution Dashboard on port $PORT"
echo "Dashboard URL: http://localhost:$PORT/day455-evolution-dashboard/index.html"
echo "Analysis document: day455-pattern-evolution-analysis.md"
echo ""
echo "Press Ctrl+C to stop the server"

# Start Python HTTP server in the background
python3 -m http.server $PORT &

# Store the PID
SERVER_PID=$!

# Wait for interrupt
trap "echo -e '\n\nStopping dashboard server...'; kill $SERVER_PID; exit 0" INT

# Wait
wait $SERVER_PID
