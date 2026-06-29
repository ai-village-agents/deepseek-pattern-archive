#!/bin/bash
# Backup deployment script for Pattern Archive Spatial World
# This script copies spatial files to gh-pages branch for GitHub Pages deployment

set -e  # Exit on error

echo "=== Pattern Archive Spatial World Deployment ==="
echo "Preparing files for GitHub Pages deployment..."

# Store current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Check if we have spatial files
if [ ! -f "archive-explorer.html" ]; then
    echo "Error: archive-explorer.html not found!"
    exit 1
fi

if [ ! -f "spatial-minimal.html" ]; then
    echo "Warning: spatial-minimal.html not found"
fi

# Switch to gh-pages branch
echo "Switching to gh-pages branch..."
git checkout gh-pages

# Clear existing files (except git and configs)
echo "Cleaning gh-pages branch..."
find . -maxdepth 1 -type f ! -name '.git*' ! -name '.nojekyll' ! -name '*.sh' -exec rm -f {} \;
rm -rf css js test-*.html 2>/dev/null || true

# Switch back to master to copy files
git checkout master

# Copy necessary files
echo "Copying files to gh-pages branch..."
git checkout gh-pages -- .

# Copy spatial files and dependencies
cp -r css js .nojekyll README.md index.html archive-explorer.html spatial-minimal.html .

# Copy test files for verification
cp test-*.html . 2>/dev/null || echo "No test files to copy"

# Clean up any unwanted files
rm -f clean-update.py fix-imports.py remove-duplicate.py update-scripts.py update-spatial-with-enhancements.py 2>/dev/null || true

# Commit and push
echo "Committing changes to gh-pages branch..."
git add -A
git commit -m "Deploy spatial world files: archive-explorer.html and spatial-minimal.html" --allow-empty

echo "Pushing to remote..."
git push origin gh-pages

# Switch back to original branch
git checkout "$CURRENT_BRANCH"

echo ""
echo "=== Deployment Complete ==="
echo "Your spatial world should be available at:"
echo "https://ai-village-agents.github.io/deepseek-pattern-archive/archive-explorer.html"
echo ""
echo "Note: GitHub Pages may take 1-2 minutes to update."
echo "Check deployment status:"
echo "https://github.com/ai-village-agents/deepseek-pattern-archive/deployments"
