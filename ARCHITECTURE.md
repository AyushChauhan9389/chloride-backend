# Chloride Backend - Microservices Architecture Documentation

## Overview

This document describes the microservices architecture of the Chloride Backend system, a file storage and URL shortening platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         API Gateway                          │
│                  (Future Enhancement)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│  Auth Service  │   │ Writer Service │   │ Reader Service │
│   Port 8082    │   │   Port 8081    │   │   Port 8080    │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│   PostgreSQL   │   │  Apache Kafka  │   │  Google Drive  │
│   Port 5432    │   │   Port 9092    │   │   (External)   │
└────────────────┘   └────────────────┘   └────────────────┘
```

## Service Responsibilities

### Auth Service (Port 8082)

**Purpose**: Centralized authentication and authorization

**Responsibilities**:
- User registration and login
- JWT token generation and validation
- Role-based access control (RBAC)
- Permission management
- User session management

**Database Access**:
- Read/Write: `users`, `roles`, `plans`

**Kafka Events Published**:
- `user.created` - When a new user registers
- `user.updated` - When user data changes
- `role.assigned` - When a role is assigned to a user
- `plan.assigned` - When a plan is assigned to a user

**API Endpoints**:
```
POST /api/auth/signup       - Register new user
POST /api/auth/login        - Authenticate user
POST /api/auth/verify       - Verify JWT token
GET  /health                - Health check
```

### Writer Service (Port 8081)

**Purpose**: Handle all write operations for files and URLs

**Responsibilities**:
- File upload to Google Drive
- URL shortening
- Storage quota validation and updates
- File metadata creation
- Event publishing for all write operations

**Database Access**:
- Read: `users`, `plans`
- Write: `files`, `shortened_urls`, `users` (storage fields)

**External Services**:
- Google Drive API

**Kafka Events Published**:
- `file.uploaded` - When a file is successfully uploaded
- `url.shortened` - When a URL is shortened
- `storage.updated` - When user storage quota changes

**API Endpoints**:
```
POST /api/upload/single     - Upload single file (auth required)
POST /api/upload/multiple   - Upload multiple files (auth required)
GET  /health                - Health check
```

### Reader Service (Port 8080)

**Purpose**: Handle all read operations and URL redirects

**Responsibilities**:
- File metadata retrieval
- URL redirect handling
- User file listing
- Read-only database operations

**Database Access**:
- Read-only: `files`, `shortened_urls`, `users`

**Kafka Events Published**:
- None (read-only service)

**API Endpoints**:
```
GET /api/files/my-files     - Get user's files (auth required)
GET /api/files/all          - Get all files (admin only)
GET /api/files/:fileId      - Get specific file (auth required)
GET /:shortCode             - Redirect to original URL
GET /health                 - Health check
```

## Data Flow

### User Registration Flow

```
1. Client → Auth Service: POST /api/auth/signup
2. Auth Service → PostgreSQL: Insert user
3. Auth Service → Kafka: Publish user.created event
4. Auth Service → Client: Return JWT token
```

### File Upload Flow

```
1. Client → Writer Service: POST /api/upload/single (with JWT)
2. Writer Service: Validate JWT (local verification)
3. Writer Service → PostgreSQL: Check storage quota
4. Writer Service → Google Drive: Upload file
5. Writer Service → PostgreSQL: Create file record
6. Writer Service → PostgreSQL: Create shortened URLs
7. Writer Service → PostgreSQL: Update user storage
8. Writer Service → Kafka: Publish file.uploaded event
9. Writer Service → Kafka: Publish url.shortened event
10. Writer Service → Kafka: Publish storage.updated event
11. Writer Service → Client: Return file URLs
```

### URL Redirect Flow

```
1. Client → Reader Service: GET /:shortCode
2. Reader Service → PostgreSQL: Lookup original URL
3. Reader Service → Client: HTTP 302 Redirect
```

## Event-Driven Architecture

### Kafka Topics

| Topic | Producer | Consumers | Purpose |
|-------|----------|-----------|---------|
| `user.created` | Auth Service | Analytics, Email Service* | User registration notifications |
| `user.updated` | Auth Service | Cache Service*, Analytics* | User data change propagation |
| `file.uploaded` | Writer Service | Analytics*, Indexing* | File upload tracking |
| `url.shortened` | Writer Service | Analytics* | URL shortening tracking |
| `storage.updated` | Writer Service | Monitoring*, Billing* | Storage quota monitoring |
| `role.assigned` | Auth Service | Audit Log*, Analytics* | Role change tracking |
| `plan.assigned` | Auth Service | Billing*, Analytics* | Plan change tracking |

\* = Future services not yet implemented

### Event Schema Example

```typescript
// file.uploaded event
{
  fileId: number;
  userId: number;
  fileName: string;
  fileSize: number;
  keyId: string;
  originalViewUrl: string;
  originalDownloadUrl: string;
  shortViewUrl: string;
  shortDownloadUrl: string;
  timestamp: string; // ISO 8601
}
```

## Database Schema

### Shared Database Approach

Currently, all services share a single PostgreSQL database. Each service has specific access patterns:

**Auth Service**:
- Full access to: `users`, `roles`, `plans`

**Writer Service**:
- Read: `users`, `plans`
- Write: `files`, `shortened_urls`, `users.storage_used`, `users.storage_left`

**Reader Service**:
- Read-only: All tables

### Future: Database Per Service

For true microservices isolation, consider:
- Auth DB: `users`, `roles`
- File DB: `files`, `user_storage` (replicated)
- URL DB: `shortened_urls`
- Plan DB: `plans`, `subscriptions`

## Authentication & Authorization

### JWT Token Structure

```json
{
  "id": 123,
  "email": "user@example.com",
  "role": "user",
  "plan": "Free",
  "permissions": [
    "canUploadFiles",
    "canDeleteFiles"
  ],
  "iat": 1699876543,
  "exp": 1699962943
}
```

### Inter-Service Authentication

Services validate JWT tokens independently using a shared secret (`JWT_SECRET`). No service-to-service calls are currently needed; all communication is via:
1. Direct client → service HTTP requests
2. Async Kafka events

## Scaling Strategy

### Horizontal Scaling

Each service can be scaled independently:

```yaml
# Example: Scale writer service to 3 instances
docker-compose up --scale writer-service=3
```

**Considerations**:
- Stateless services (JWT validation is local)
- Kafka consumer groups for load distribution
- Database connection pooling
- Shared PostgreSQL may become bottleneck

### Vertical Scaling

- Increase container resources in `docker-compose.yml`
- Tune PostgreSQL and Kafka configurations

## Service Communication Patterns

### Synchronous (HTTP/REST)
- Client → Service requests only
- No service-to-service HTTP calls

### Asynchronous (Kafka)
- Event publishing for cross-cutting concerns
- Eventual consistency
- Decoupled services

### Database
- Shared database (current)
- Read/write separation by service

## Monitoring & Observability

### Health Checks

All services expose `/health`:

```json
{
  "service": "auth-service",
  "status": "OK",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Logging

Services log to stdout/stderr (Docker captures):

```bash
docker-compose logs -f auth-service
```

### Metrics (Future)

- Prometheus exporters
- Grafana dashboards
- Request latency, error rates, throughput

### Tracing (Future)

- Distributed tracing with Jaeger/Zipkin
- Request correlation IDs

## Security

### JWT Secret
- Shared across all services
- 256-bit minimum
- Rotate periodically

### Database Credentials
- Environment variables
- Secrets management (Vault, AWS Secrets Manager)

### API Security
- Rate limiting (future)
- Input validation
- SQL injection prevention (Drizzle ORM)

### Network Security
- Docker network isolation
- Service-to-service TLS (future)

## Deployment

### Local Development
```bash
docker-compose up
```

### Production (Future)

**Kubernetes**:
- Deployment per service
- HorizontalPodAutoscaler
- Ingress for routing
- PersistentVolumeClaims for PostgreSQL

**Cloud Platforms**:
- AWS ECS/EKS
- Google Cloud Run/GKE
- Azure Container Instances/AKS

## Future Enhancements

### Short-term
1. API Gateway (Kong, Traefik)
2. Redis caching layer
3. Service health checks in docker-compose
4. Database connection pooling

### Medium-term
1. Database per service
2. SAGA pattern for distributed transactions
3. Circuit breakers (Hystrix pattern)
4. Service mesh (Istio/Linkerd)

### Long-term
1. GraphQL gateway
2. gRPC for service-to-service
3. Event sourcing
4. CQRS pattern
5. Multi-region deployment

## Performance Considerations

### Bottlenecks
- Shared PostgreSQL database
- Google Drive API rate limits
- Kafka throughput

### Optimizations
- Database indexing on frequent queries
- Connection pooling
- Caching frequently accessed data
- Batch operations for multiple files
- CDN for file delivery

## Disaster Recovery

### Backup Strategy
- PostgreSQL automated backups
- Kafka topic replication
- Google Drive as backup storage

### Recovery
- Database restore procedures
- Kafka consumer offset management
- Service restart procedures

## Troubleshooting

### Common Issues

**Services can't connect to Kafka**:
- Wait for Kafka to fully start (health check)
- Check Kafka logs: `docker-compose logs kafka`

**Database connection refused**:
- Ensure PostgreSQL is healthy
- Check credentials in .env

**JWT validation failures**:
- Verify JWT_SECRET matches across services
- Check token expiration

## References

- [Microservices Patterns](https://microservices.io/patterns/index.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Drizzle ORM](https://orm.drizzle.team/)

