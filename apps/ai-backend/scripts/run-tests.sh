#!/bin/bash
# Run tests with coverage

set -e

echo "🧪 Running FitOS AI Backend tests..."

# Run tests with coverage
poetry run pytest \
  --cov=app \
  --cov-report=html \
  --cov-report=term \
  --verbose

echo ""
echo "✅ Tests complete!"
echo "📊 Coverage report: htmlcov/index.html"
