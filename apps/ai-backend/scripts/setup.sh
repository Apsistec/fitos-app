#!/bin/bash
# Setup script for FitOS AI Backend

set -e

echo "🤖 Setting up FitOS AI Backend..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.11+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
if [ "$PYTHON_VERSION" \< "3.11" ]; then
    echo "❌ Python 3.11+ required. Found: $PYTHON_VERSION"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION found"

# Install Poetry if not installed
if ! command -v poetry &> /dev/null; then
    echo "📦 Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    echo "✅ Poetry installed"
else
    echo "✅ Poetry already installed"
fi

# Install dependencies
echo "📦 Installing dependencies..."
poetry install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your API keys (ANTHROPIC_API_KEY or OPENAI_API_KEY)"
echo "  2. Run: poetry run uvicorn main:app --reload"
echo "  3. Visit: http://localhost:8000/docs"
echo ""
