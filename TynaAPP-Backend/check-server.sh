#!/bin/bash
echo "🔍 Checking server status..."
for i in {1..20}; do
  echo "Attempt $i/20..."
  
  # Check if container is running
  if ! docker ps | grep -q tynaapp-backend-app-1; then
    echo "❌ Container not running"
    docker ps -a | grep tynaapp
    exit 1
  fi
  
  # Check if server responds
  if curl -s http://localhost:8001 > /dev/null 2>&1; then
    echo ""
    echo "✅ SERVER IS RUNNING!"
    echo "📡 API: http://localhost:8001/api"
    echo "🎛️  Admin: http://localhost:8001/tynaadm"
    curl -s http://localhost:8001 | head -5
    exit 0
  fi
  
  # Check installation progress
  LOGS=$(docker logs tynaapp-backend-app-1 --tail=5 2>&1)
  if echo "$LOGS" | grep -q "Server starting\|Laravel\|✅"; then
    echo "✅ Server is starting..."
    sleep 2
    continue
  fi
  
  echo "⏳ Still installing... (checking logs)"
  docker logs tynaapp-backend-app-1 --tail=3 2>&1 | tail -1
  
  sleep 10
done

echo ""
echo "⏳ Installation taking longer than expected..."
echo "View logs with: docker logs tynaapp-backend-app-1 -f"
