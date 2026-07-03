# Chloride Backend (Elysia)

Monolithic backend for Chloride — file storage (S3) and URL shortening — built with
[Elysia](https://elysiajs.com) on Bun, Drizzle ORM (PostgreSQL), and JWT auth.

Ported from the original microservices (`auth-service`, `reader-service`, monolith `src/`)
into a single Elysia server.

## Stack

- **Runtime:** Bun
- **Framework:** Elysia (`@elysiajs/jwt`, `@elysiajs/bearer`, `@elysiajs/cors`, `@elysiajs/openapi`)
- **DB:** PostgreSQL via Drizzle ORM (`postgres-js` driver) — all queries use the Drizzle query builder (no raw SQL)
- **Storage:** S3 (Bun's native `Bun.S3Client`) — private bucket, access via short-lived presigned URLs
- **Auth:** JWT (bearer tokens) with a role/permission macro

## Getting started

```bash
bun install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, S3_* and DOMAIN

# apply the schema to your database
bun run db:push        # or: bun run db:generate && bun run db:migrate

bun run dev            # http://localhost:8080
```

Default roles (`admin`, `staff`, `user`) and a `Free` plan are seeded automatically on boot.

OpenAPI docs are served at `/openapi`.

## Project structure

```
src/
├── index.ts              # app composition (cors, openapi, modules) + bootstrap
├── db/                   # Drizzle schema + client
├── config/s3.ts          # S3 client + presign settings
├── lib/storage.ts        # byte formatting helpers
├── plugins/auth.ts       # JWT plugin + `auth` macro (authn + RBAC)
├── types/                # shared types
└── modules/
    ├── auth/             # signup, login, verify
    ├── roles/            # role CRUD, assignment, permission checks
    ├── plans/            # plan CRUD, storage/quota
    ├── uploads/          # S3 upload (single/multiple)
    ├── files/            # file listing/retrieval
    └── urls/             # short-code redirects
```

## Auth & RBAC

Routes opt into auth via the `auth` macro:

```ts
.get('/me', handler, { auth: true })                          // any authenticated user
.get('/x', handler, { auth: { roles: ['admin', 'staff'] } })  // role-gated
.post('/y', handler, { auth: { permission: 'canManageRoles' } }) // permission-gated (admin bypasses)
```

## API overview

| Area   | Endpoints |
|--------|-----------|
| Auth   | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/verify` |
| Roles  | `GET /api/roles/me`, `POST /api/roles/check-permission/:permission`, `*/api/roles/admin/*` |
| Plans  | `GET /api/plans/available`, `POST /api/plans/assign`, `GET /api/plans/user/storage`, `*/api/plans/admin/*` |
| Upload | `POST /api/upload/single`, `POST /api/upload/multiple` (through-API); `POST /api/upload/presign` → client PUTs to S3 → `POST /api/upload/complete` (direct-to-S3) |
| Files  | `GET /api/files/my-files`, `GET /api/files/all`, `GET /api/files/:fileId` |
| URLs   | `GET /:shortCode` (redirect) |
| Misc   | `GET /api/health`, `GET /api/protected` |

## Storage model (S3)

The bucket is **private**. Uploads are stored under `${userId}/${uuid}-${filename}`.
Shortened URLs store the S3 object key and a `view`/`download` variant; each redirect mints a
fresh presigned URL, so links never expose credentials and don't dead-end after expiry.
