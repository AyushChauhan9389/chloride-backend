#!/bin/bash

# Chloride Backend - Docker Clean Only (No Rebuild)
# This script removes all Docker containers, images, and volumes without rebuilding

set -e

echo "================================================"
echo "Chloride Backend - Docker Cleanup (No Rebuild)"
echo "================================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[1/4] Stopping all services...${NC}"
docker compose down 2>/dev/null || true
echo -e "${GREEN}✓ Services stopped${NC}"
echo ""

echo -e "${YELLOW}[2/4] Removing containers, volumes, and orphans...${NC}"
docker compose down -v --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Containers and volumes removed${NC}"
echo ""

echo -e "${YELLOW}[3/4] Removing all project images...${NC}"
docker compose down --rmi all 2>/dev/null || true
echo -e "${GREEN}✓ Images removed${NC}"
echo ""

echo -e "${YELLOW}[4/4] Cleaning up dangling resources...${NC}"
docker image prune -f
docker builder prune -f
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ All Docker resources cleaned!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "To rebuild and start services, run: ./clean-rebuild.sh"
echo "Or manually run: docker compose up --build -d"
echo ""
