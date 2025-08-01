#!/bin/bash

echo "🔍 Blockchain RPC Compatibility Auditor Setup"
echo "=============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp config.env.example .env
    echo "✅ .env file created! Please edit it with your configuration."
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env file with your RPC URL and optional private key"
    echo "2. Run: npm install"
    echo "3. Run: npm run compile"
    echo "4. Run: npm run quick-test"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
else
    echo "✅ Dependencies already installed"
fi

# Check if contracts are compiled
if [ ! -d "artifacts" ]; then
    echo "🔨 Compiling contracts..."
    npm run compile
    echo "✅ Contracts compiled!"
else
    echo "✅ Contracts already compiled"
fi

echo ""
echo "🚀 Ready to run blockchain audit!"
echo ""
echo "Quick test (no deployment):"
echo "  npm run quick-test"
echo ""
echo "Full audit (with deployment):"
echo "  npm run audit"
echo ""
echo "Run tests:"
echo "  npm test" 