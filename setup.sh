#!/bin/bash

echo "🚀 Chloride Backend - Microservices Setup"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please edit it with your credentials."
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

echo ""
echo "📦 Installing dependencies..."

# Install shared dependencies
echo "Installing shared package..."
cd shared && npm install && npm run build
cd ..

# Install service dependencies
echo "Installing auth-service..."
cd auth-service && npm install
cd ..

echo "Installing writer-service..."
cd writer-service && npm install
cd ..

echo "Installing reader-service..."
cd reader-service && npm install
cd ..

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "📊 Service Status:"
echo "===================="
docker-compose ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "  - Auth Service:   http://localhost:8082"
echo "  - Writer Service: http://localhost:8081"
echo "  - Reader Service: http://localhost:8080"
echo "  - Kafka UI:       http://localhost:8088"
echo ""
echo "📝 Next steps:"
echo "  1. Edit .env with your Google Drive credentials"
echo "  2. Run database migrations: npx drizzle-kit push:pg"
echo "  3. Test the health endpoints"
echo ""
echo "🔍 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"

