#!/bin/bash

# Chloride Backend - Complete Docker Clean & Rebuild Script
# This script completely removes all Docker containers, images, and volumes for this project
# and rebuilds everything from scratch

set -e  # Exit on any error

echo "================================================"
echo "Chloride Backend - Docker Clean & Rebuild"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop all running services
echo -e "${YELLOW}[1/8] Stopping all services...${NC}"
docker compose down 2>/dev/null || true
echo -e "${GREEN}✓ Services stopped${NC}"
echo ""

# Step 2: Remove all containers and volumes
echo -e "${YELLOW}[2/8] Removing containers and volumes...${NC}"
docker compose down -v --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Containers and volumes removed${NC}"
echo ""

# Step 3: Remove all images for this project
echo -e "${YELLOW}[3/8] Removing project images...${NC}"
docker compose down --rmi all 2>/dev/null || true
echo -e "${GREEN}✓ Images removed${NC}"
echo ""

# Step 4: Clean up dangling images
echo -e "${YELLOW}[4/8] Cleaning up dangling images...${NC}"
docker image prune -f
echo -e "${GREEN}✓ Dangling images cleaned${NC}"
echo ""

# Step 5: Clean up build cache
echo -e "${YELLOW}[5/8] Cleaning build cache...${NC}"
docker builder prune -f
echo -e "${GREEN}✓ Build cache cleaned${NC}"
echo ""

# Step 6: Rebuild all services (no cache)
echo -e "${YELLOW}[6/8] Rebuilding all services from scratch...${NC}"
docker compose build --no-cache
echo -e "${GREEN}✓ Services rebuilt${NC}"
echo ""

# Step 7: Start all services
echo -e "${YELLOW}[7/8] Starting all services...${NC}"
docker compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 8: Show status
echo -e "${YELLOW}[8/8] Checking service status...${NC}"
sleep 3  # Wait a bit for services to initialize
docker compose ps
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Rebuild complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Services are running. Use the following commands:"
echo "  - View logs: docker compose logs -f"
echo "  - View specific service logs: docker compose logs -f <service-name>"
echo "  - Stop services: docker compose down"
echo "  - Restart services: docker compose restart"
echo ""
echo "Service URLs:"
echo "  - Main Service: http://localhost:3000"
echo "  - Auth Service: http://localhost:8082"
echo "  - Reader Service: http://localhost:8080"
echo "  - Writer Service: http://localhost:8081"
echo "  - Kafka UI: http://localhost:8088"
echo "  - PostgreSQL: localhost:5432"
echo ""
