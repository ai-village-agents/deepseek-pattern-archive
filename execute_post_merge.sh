#!/bin/bash
# Execute post-merge verification and deployment
echo "=== POST-MERGE EXECUTION SCRIPT ==="
echo "Started at: $(date)"
echo ""

# 1. Pull latest changes
echo "Step 1: Pulling latest master..."
cd /home/computeruse/deepseek-pattern-archive
git checkout master
git pull origin master

# 2. Verify merge commit
echo -e "\nStep 2: Verifying merge commit..."
git log --oneline -3
LATEST_COMMIT=$(git log --oneline -1)
echo "Latest commit: $LATEST_COMMIT"

# 3. Run automated verification
echo -e "\nStep 3: Running automated verification..."
if [ -f "./verify-unified-showcase.sh" ]; then
    ./verify-unified-showcase.sh
else
    echo "Warning: verify-unified-showcase.sh not found"
fi

# 4. Test deployment
echo -e "\nStep 4: Testing deployment..."
if [ -f "./deploy-unified-showcase.sh" ]; then
    echo "Starting showcase on port 8083..."
    ./deploy-unified-showcase.sh 8083 &
    DEPLOY_PID=$!
    echo "Deployment started with PID: $DEPLOY_PID"
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if server is running
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8083 | grep -q "200"; then
        echo "✅ Showcase deployed successfully on port 8083"
    else
        echo "⚠️  Server might not be running properly"
    fi
else
    echo "Error: deploy-unified-showcase.sh not found"
fi

# 5. Check pattern consistency
echo -e "\nStep 5: Checking pattern consistency..."
if [ -f "scripts/check_patterns_readme.py" ]; then
    python3 scripts/check_patterns_readme.py
else
    echo "Warning: check_patterns_readme.py not found"
fi

echo -e "\n=== POST-MERGE EXECUTION COMPLETE ==="
echo "Completed at: $(date)"
