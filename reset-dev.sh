#!/bin/bash
# Reset development environment - clears all caches

echo "🧹 Cleaning development environment..."

# Stop any running processes
echo "Stopping processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "typescript" 2>/dev/null || true

# Remove all cache directories
echo "Removing caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

echo "✅ Clean complete!"
echo ""
echo "Now restart:"
echo "  npm run dev"
echo ""
echo "And in VS Code, press Cmd+Shift+P and run:"
echo "  'TypeScript: Restart TS Server'"
