# Chloride Backend - Quick Start Guide

Get your microservices architecture up and running in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Git (to clone the repo)
- A Google Cloud Project with Drive API enabled

## Step 1: Environment Configuration

Create your `.env` file:

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
DATABASE_URL=postgres://user:password@postgres:5432/url_shortener
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8081/oauth2callback
GOOGLE_REFRESH_TOKEN=your-refresh-token
DOMAIN=localhost:8080
```

### Getting Google Drive Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:8081/oauth2callback`
6. Use OAuth Playground to get refresh token

## Step 2: Start Services

### Option A: Automated Setup (Recommended)

```bash
./setup.sh
```

This will:
- Install all dependencies
- Build shared package
- Start all Docker services
- Display service status

### Option B: Manual Setup

```bash
# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f
```

## Step 3: Initialize Database

Run database migrations:

```bash
npx drizzle-kit push:pg
```

## Step 4: Test the Services

### Check Health Endpoints

```bash
# Auth Service
curl http://localhost:8082/health

# Writer Service
curl http://localhost:8081/health

# Reader Service
curl http://localhost:8080/health
```

Expected response:
```json
{
  "service": "auth-service",
  "status": "OK",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Create a Test User

```bash
curl -X POST http://localhost:8082/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "role": "user",
    "plan": "Free",
    "storageLimit": 104857600
  }
}
```

### Login

```bash
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### Upload a File

```bash
# Save your token
TOKEN="your-jwt-token-here"

# Upload a file
curl -X POST http://localhost:8081/api/upload/single \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/file.pdf"
```

Response:
```json
{
  "shortViewUrl": "https://localhost:8080/abc12345",
  "shortDownloadUrl": "https://localhost:8080/xyz67890",
  "ViewUrl": "https://drive.google.com/file/d/...",
  "DownloadUrl": "https://drive.google.com/uc?id=..."
}
```

### List Your Files

```bash
curl http://localhost:8080/api/files/my-files \
  -H "Authorization: Bearer $TOKEN"
```

### Test URL Redirect

Visit the short URL in your browser:
```
http://localhost:8080/abc12345
```

## Step 5: Monitor Kafka Events

Open Kafka UI in your browser:
```
http://localhost:8088
```

You'll see topics:
- `user.created`
- `file.uploaded`
- `url.shortened`
- `storage.updated`

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Auth Service | 8082 | http://localhost:8082 |
| Writer Service | 8081 | http://localhost:8081 |
| Reader Service | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | localhost:5432 |
| Kafka | 9092 | localhost:9092 |
| Kafka UI | 8088 | http://localhost:8088 |

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
```

### Restart a Service
```bash
docker-compose restart auth-service
```

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Data
```bash
docker-compose down -v
```

### Rebuild After Code Changes
```bash
docker-compose up --build
```

### Scale a Service
```bash
docker-compose up --scale writer-service=3
```

## API Testing with Postman

Import this collection:

```json
{
  "info": {
    "name": "Chloride Backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Signup",
          "request": {
            "method": "POST",
            "url": "http://localhost:8082/api/auth/signup",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "http://localhost:8082/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Upload",
      "item": [
        {
          "name": "Upload Single File",
          "request": {
            "method": "POST",
            "url": "http://localhost:8081/api/upload/single",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": ""
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Files",
      "item": [
        {
          "name": "Get My Files",
          "request": {
            "method": "GET",
            "url": "http://localhost:8080/api/files/my-files",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker ps

# Check logs for errors
docker-compose logs
```

### Database connection errors
```bash
# Check PostgreSQL is healthy
docker-compose exec postgres pg_isready -U user -d url_shortener

# Restart PostgreSQL
docker-compose restart postgres
```

### Kafka connection errors
```bash
# Check Kafka logs
docker-compose logs kafka

# Kafka takes ~30s to fully start
# Wait and try again
```

### File upload fails
```bash
# Verify Google Drive credentials in .env
# Check writer-service logs
docker-compose logs writer-service
```

## Next Steps

1. **Read the Documentation**
   - [README.md](README.md) - Complete project documentation
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed architecture guide

2. **Explore Kafka Events**
   - Open Kafka UI: http://localhost:8088
   - Watch events in real-time

3. **Test All Endpoints**
   - Use Postman or curl
   - Try different user roles

4. **Deploy to Production**
   - Set up Kubernetes manifests
   - Configure CI/CD pipeline
   - Add monitoring and logging

## Development

### Run Services Locally (without Docker)

```bash
# Start PostgreSQL and Kafka with Docker
docker-compose up postgres kafka -d

# Run each service in separate terminals
cd auth-service && npm run dev
cd writer-service && npm run dev
cd reader-service && npm run dev
```

### Make Changes

1. Edit code in service directories
2. Services auto-reload in dev mode
3. Rebuild Docker images: `docker-compose up --build`

## Support

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design
- Review logs: `docker-compose logs`
- Inspect database: `docker-compose exec postgres psql -U user -d url_shortener`

Happy coding! 🚀

