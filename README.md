# Chloride Backend - Microservices Architecture

A modern, scalable file storage and URL shortening service built with microservices architecture, TypeScript, and Kafka.

## 🏗️ Architecture Overview

This project follows a **microservices architecture** with three main services:

### Services

1. **Auth Service** (Port 8082)
   - User authentication and registration
   - JWT token generation and validation
   - Role and permission management
   - Publishes: `user.created`, `role.assigned` events

2. **Writer Service** (Port 8081)
   - File uploads to Google Drive
   - URL shortening
   - Storage quota management
   - Publishes: `file.uploaded`, `url.shortened`, `storage.updated` events

3. **Reader Service** (Port 8080)
   - File retrieval and listing
   - URL redirect handling
   - Read-only operations

### Infrastructure

- **PostgreSQL 17** - Primary database (shared across services)
- **Apache Kafka** - Event streaming platform (KRaft mode)
- **Kafka UI** - Web interface for monitoring Kafka (Port 8088)
- **Google Drive API** - Cloud file storage

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- Google Drive API credentials
- PostgreSQL (if running locally)

### Environment Setup

1. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

2. Update the `.env` file with your credentials:

```env
# Database
DATABASE_URL=postgres://user:password@postgres:5432/url_shortener

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# Google Drive API
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=your-redirect-uri
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Domain for shortened URLs
DOMAIN=yourdomain.com
```

### Running with Docker Compose

1. **Build and start all services:**

```bash
docker-compose up --build
```

2. **Run in detached mode:**

```bash
docker-compose up -d
```

3. **View logs:**

```bash
docker-compose logs -f [service-name]
```

4. **Stop all services:**

```bash
docker-compose down
```

5. **Stop and remove volumes:**

```bash
docker-compose down -v
```

### Running Database Migrations

```bash
# From the project root
npx drizzle-kit push:pg
```

## 📡 API Endpoints

### Auth Service (http://localhost:8082)

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token
- `GET /health` - Health check

### Writer Service (http://localhost:8081)

- `POST /api/upload/single` - Upload single file (requires auth)
- `POST /api/upload/multiple` - Upload multiple files (requires auth)
- `GET /health` - Health check

### Reader Service (http://localhost:8080)

- `GET /api/files/my-files` - Get user's files (requires auth)
- `GET /api/files/all` - Get all files (admin only)
- `GET /api/files/:fileId` - Get specific file (requires auth)
- `GET /:shortCode` - Redirect to original URL
- `GET /health` - Health check

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Kafka Events

### Topics

- `user.created` - Published when a new user registers
- `user.updated` - Published when user data is updated
- `file.uploaded` - Published when a file is uploaded
- `url.shortened` - Published when a URL is shortened
- `storage.updated` - Published when user storage quota changes
- `role.assigned` - Published when a role is assigned to a user
- `plan.assigned` - Published when a plan is assigned to a user

### Monitoring Kafka

Access Kafka UI at: http://localhost:8088

## 🛠️ Development

### Local Development Setup

1. **Install dependencies for each service:**

```bash
# Install shared package dependencies
cd shared && npm install && npm run build

# Install auth-service dependencies
cd ../auth-service && npm install

# Install writer-service dependencies
cd ../writer-service && npm install

# Install reader-service dependencies
cd ../reader-service && npm install
```

2. **Run services individually:**

```bash
# Auth Service
cd auth-service && npm run dev

# Writer Service
cd writer-service && npm run dev

# Reader Service
cd reader-service && npm run dev
```

### Project Structure

```
chloride-backend/
├── auth-service/           # Authentication & authorization
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── db/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── writer-service/         # File uploads & URL shortening
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── db/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── reader-service/         # File retrieval & URL redirects
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── db/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── shared/                 # Shared utilities & types
│   ├── src/
│   │   ├── kafka/
│   │   │   ├── client.ts
│   │   │   └── events.ts
│   │   ├── types/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── drizzle/               # Database migrations
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## 📦 Database Schema

### Tables

- **users** - User accounts with role and plan associations
- **roles** - Role definitions with permissions
- **plans** - Subscription plans with storage/file limits
- **files** - Uploaded file metadata
- **shortened_urls** - URL shortening records

### Default Roles

- **admin** - Full system access
- **staff** - Limited admin capabilities
- **user** - Basic file upload/management

### Default Plans

- **Free** - 100MB storage, 10 files

## 🔍 Health Checks

Each service exposes a `/health` endpoint that returns:

```json
{
  "service": "service-name",
  "status": "OK",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

## 🐛 Troubleshooting

### Kafka Connection Issues

If services can't connect to Kafka, ensure Kafka is fully started:

```bash
docker-compose logs kafka
```

### Database Connection Issues

Check PostgreSQL health:

```bash
docker-compose exec postgres pg_isready -U user -d url_shortener
```

### Port Conflicts

If ports are already in use, modify them in `docker-compose.yml`:

- Auth Service: 8082
- Writer Service: 8081
- Reader Service: 8080
- Kafka: 9092
- Kafka UI: 8088
- PostgreSQL: 5432

## 📝 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🔄 Migration from Monolith

This project was migrated from a monolithic architecture. The original codebase is in the `src/` directory. The microservices maintain backward compatibility with the same API contracts.

## 🚦 Service Communication

Services communicate through:
1. **Synchronous**: REST APIs with JWT authentication
2. **Asynchronous**: Kafka events for cross-service notifications
3. **Shared Database**: PostgreSQL (future: consider database per service)

## 🎯 Future Enhancements

- [ ] Database per service pattern
- [ ] API Gateway for unified access
- [ ] Service mesh (Istio/Linkerd)
- [ ] Redis caching layer
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Prometheus + Grafana monitoring
- [ ] Kubernetes deployment manifests
- [ ] CI/CD pipelines
- [ ] Rate limiting
- [ ] GraphQL gateway

