# Chloride Backend API Documentation

This document provides a comprehensive overview of all routes, controllers, and database schemas in the Chloride backend application.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Database Schemas](#database-schemas)
- [API Routes](#api-routes)
- [Controllers](#controllers)
- [Services Structure](#services-structure)

---

## Architecture Overview

The Chloride backend is organized into multiple microservices:
- **Auth Service**: Handles user authentication and authorization
- **Reader Service**: Handles file retrieval and URL redirections (read operations)
- **Writer Service**: Handles file uploads (write operations)
- **Main Service**: Monolithic service containing all functionality

### Base URLs

Each service runs on a different port (default values, can be configured via environment variables):

| Service | Default Port | Base URL (Development) | Base URL (Production) |
|---------|--------------|------------------------|----------------------|
| **Main Service** | 3000 | `http://localhost:3000` | `https://api.yourdomain.com` |
| **Auth Service** | 8082 | `http://localhost:8082` | `https://auth.yourdomain.com` |
| **Reader Service** | 8080 | `http://localhost:8080` | `https://reader.yourdomain.com` |
| **Writer Service** | 8081 | `http://localhost:8081` | `https://writer.yourdomain.com` |

**Note**: Replace `yourdomain.com` with your actual production domain.

---

## Database Schemas

### Users Table
Located in: `src/db/schema.ts`, `auth-service/src/db/schema.ts`

```typescript
users {
  id: serial (primary key)
  email: text (unique, not null)
  password: text (not null)
  roleId: integer (foreign key -> roles.id)
  planId: integer (foreign key -> plans.id)
  storageUsed: bigint (default: 0, in bytes)
  storageLeft: bigint (default: 0, in bytes)
  createdAt: timestamp (default: now)
}
```

**Purpose**: Stores user account information, authentication credentials, and storage tracking.

### Roles Table
Located in: `src/db/schema.ts`, `auth-service/src/db/schema.ts`

```typescript
roles {
  id: serial (primary key)
  name: varchar(50) (unique, not null)
  description: text
  permissions: text (JSON string of permissions)
  createdAt: timestamp (default: now)
}
```

**Purpose**: Defines user roles and their associated permissions.

**Default Roles**:
- `USER`: Standard user with basic permissions
- `STAFF`: Staff member with elevated permissions
- `ADMIN`: Administrator with full permissions

### Plans Table
Located in: `src/db/schema.ts`, `auth-service/src/db/schema.ts`, `writer-service/src/db/schema.ts`

```typescript
plans {
  id: serial (primary key)
  name: varchar(50) (unique, not null)
  fileLimit: integer (not null)
  storageLimit: bigint (not null, in bytes)
  createdAt: timestamp (default: now)
}
```

**Purpose**: Defines subscription plans with storage and file limits.

**Default Plans**:
- `Free`: 10 files, 100MB storage

### Files Table
Located in: `src/db/schema.ts`, `reader-service/src/db/schema.ts`, `writer-service/src/db/schema.ts`

```typescript
files {
  id: serial (primary key)
  name: varchar(255) (not null)
  keyId: varchar(255) (not null)
  OriginalViewUrl: text (not null)
  OriginalDownloadUrl: text (not null)
  ShortViewUrl: text
  ShortDownloadUrl: text
  size: bigint (not null, in bytes)
  userId: integer (foreign key -> users.id, not null)
  createdAt: timestamp (default: now)
}
```

**Purpose**: Stores metadata about uploaded files.

### Shortened URLs Table
Located in: `src/db/schema.ts`, `reader-service/src/db/schema.ts`, `writer-service/src/db/schema.ts`

```typescript
shortenedUrls {
  id: serial (primary key)
  originalUrl: text (not null)
  shortCode: varchar(255) (unique, not null)
  createdAt: timestamp (default: now)
}
```

**Purpose**: Maps short codes to original URLs for URL shortening functionality.

---

## API Routes

### Auth Service Routes
**Base URL**: `http://localhost:8082` (Development) | `https://auth.yourdomain.com` (Production)

#### Authentication Endpoints

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/auth/signup` | `http://localhost:8082/api/auth/signup` | - | `signup` | Create a new user account |
| POST | `/api/auth/login` | `http://localhost:8082/api/auth/login` | - | `login` | Authenticate user and get token |
| POST | `/api/auth/verify` | `http://localhost:8082/api/auth/verify` | - | `verifyToken` | Verify JWT token validity |

**Request/Response Examples**:

```javascript
// POST http://localhost:8082/api/auth/signup
Request Body: {
  email: string,
  password: string
}
Response: {
  token: string,
  user: { id, email, role, plan, storageLimit }
}

// POST http://localhost:8082/api/auth/login
Request Body: {
  email: string,
  password: string
}
Response: {
  token: string,
  user: { id, email, role, plan }
}

// POST http://localhost:8082/api/auth/verify
Headers: {
  Authorization: "Bearer <token>"
}
Response: {
  valid: boolean,
  user: <decoded_token>
}
```

---

### Main Service Routes
**Base URL**: `http://localhost:3000` (Development) | `https://api.yourdomain.com` (Production)

#### Auth Routes (`src/routes/auth.routes.ts`)

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/auth/signup` | `http://localhost:3000/api/auth/signup` | - | `signup` | Create a new user account |
| POST | `/api/auth/login` | `http://localhost:3000/api/auth/login` | - | `login` | Authenticate user and get token |

#### URL Routes (`src/routes/url.routes.ts`)

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| GET | `/:shortCode` | `http://localhost:3000/:shortCode` | - | `urlController.redirect` | Redirect to original URL |

**Example**: `http://localhost:3000/abc123` redirects to the original URL associated with shortCode `abc123`

#### Upload Routes (`src/routes/upload.routes.ts`)

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/upload/single` | `http://localhost:3000/api/upload/single` | `authenticate`, `uploadSingle("file")` | `uploadController.uploadSingle` | Upload a single file |
| POST | `/api/upload/multiple` | `http://localhost:3000/api/upload/multiple` | `authenticate`, `uploadMultiple("files", 10)` | `uploadController.uploadMultiple` | Upload multiple files (max 10) |

#### Role Routes (`src/routes/role.routes.ts`)

All role routes require authentication.

**Public User Routes**:

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| GET | `/api/roles/me` | `http://localhost:3000/api/roles/me` | `authenticate` | `getCurrentUserRoleController` | Get current user's role info |
| POST | `/api/roles/check-permission/:permission` | `http://localhost:3000/api/roles/check-permission/:permission` | `authenticate` | `checkPermissionController` | Check if user has a permission |

**Admin Routes**:

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/roles/admin/create` | `http://localhost:3000/api/roles/admin/create` | `authenticate`, `requireAdmin`, `logAdminAction('CREATE_ROLE')` | `createRoleController` | Create a new role |
| GET | `/api/roles/admin/all` | `http://localhost:3000/api/roles/admin/all` | `authenticate`, `requireAdminOrStaff` | `getAllRolesController` | Get all roles |
| GET | `/api/roles/admin/:roleId` | `http://localhost:3000/api/roles/admin/:roleId` | `authenticate`, `requireAdminOrStaff` | `getRoleController` | Get role by ID |
| PUT | `/api/roles/admin/:roleId` | `http://localhost:3000/api/roles/admin/:roleId` | `authenticate`, `requireAdmin`, `logAdminAction('UPDATE_ROLE')` | `updateRoleController` | Update a role |
| DELETE | `/api/roles/admin/:roleId` | `http://localhost:3000/api/roles/admin/:roleId` | `authenticate`, `requireAdmin`, `logAdminAction('DELETE_ROLE')` | `deleteRoleController` | Delete a role |
| POST | `/api/roles/admin/assign` | `http://localhost:3000/api/roles/admin/assign` | `authenticate`, `requireAdmin`, `logAdminAction('ASSIGN_ROLE')` | `assignRoleController` | Assign role to user by ID |
| POST | `/api/roles/admin/assign-by-name` | `http://localhost:3000/api/roles/admin/assign-by-name` | `authenticate`, `requireAdmin`, `logAdminAction('ASSIGN_ROLE_BY_NAME')` | `assignRoleByNameController` | Assign role to user by name |
| GET | `/api/roles/admin/users/:roleName` | `http://localhost:3000/api/roles/admin/users/:roleName` | `authenticate`, `requireAdminOrStaff` | `getUsersByRoleController` | Get all users with a role |
| POST | `/api/roles/admin/initialize` | `http://localhost:3000/api/roles/admin/initialize` | `authenticate`, `requireAdmin`, `logAdminAction('INITIALIZE_ROLES')` | `initializeRolesController` | Initialize default roles |

#### Plan Routes (`src/routes/plan.routes.ts`)

**Public Routes**:

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| GET | `/api/plans/available` | `http://localhost:3000/api/plans/available` | - | `getAllPlansController` | Get all available plans (no auth) |

**User Routes**:

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/plans/assign` | `http://localhost:3000/api/plans/assign` | `authenticate` | `assignPlanController` | Assign plan to current user |
| GET | `/api/plans/user/storage` | `http://localhost:3000/api/plans/user/storage` | `authenticate` | `getUserStorageController` | Get user's storage info |
| POST | `/api/plans/user/check-storage` | `http://localhost:3000/api/plans/user/check-storage` | `authenticate` | `checkStorageLimitController` | Check if within storage limit |
| POST | `/api/plans/user/check-files` | `http://localhost:3000/api/plans/user/check-files` | `authenticate` | `checkFileLimitController` | Check if within file limit |

**Admin Routes**:

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/plans/admin/create` | `http://localhost:3000/api/plans/admin/create` | `authenticate`, `requireAdmin`, `logAdminAction('CREATE_PLAN')` | `createPlanController` | Create a new plan |
| GET | `/api/plans/admin/all` | `http://localhost:3000/api/plans/admin/all` | `authenticate`, `requireAdmin` | `getAllPlansController` | Get all plans |
| GET | `/api/plans/admin/:planId` | `http://localhost:3000/api/plans/admin/:planId` | `authenticate`, `requireAdmin` | `getPlanController` | Get plan by ID |
| PUT | `/api/plans/admin/:planId` | `http://localhost:3000/api/plans/admin/:planId` | `authenticate`, `requireAdmin`, `logAdminAction('UPDATE_PLAN')` | `updatePlanController` | Update a plan |
| DELETE | `/api/plans/admin/:planId` | `http://localhost:3000/api/plans/admin/:planId` | `authenticate`, `requireAdmin`, `logAdminAction('DELETE_PLAN')` | `deletePlanController` | Delete a plan |
| PUT | `/api/plans/admin/user-storage` | `http://localhost:3000/api/plans/admin/user-storage` | `authenticate`, `requireAdmin`, `logAdminAction('UPDATE_USER_STORAGE')` | `updateUserStorageController` | Update user storage |

---

### Reader Service Routes
**Base URL**: `http://localhost:8080` (Development) | `https://reader.yourdomain.com` (Production)

#### URL Routes (`reader-service/src/routes/url.routes.ts`)

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| GET | `/:shortCode` | `http://localhost:8080/:shortCode` | - | `redirect` | Redirect to original URL |

**Example**: `http://localhost:8080/abc123` redirects to the original URL

#### File Routes (`reader-service/src/routes/file.routes.ts`)

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| GET | `/api/files/my-files` | `http://localhost:8080/api/files/my-files` | `authenticate` | `getUserFiles` | Get current user's files |
| GET | `/api/files/all` | `http://localhost:8080/api/files/all` | `authenticate` | `listAllFiles` | Get all files (admin only) |
| GET | `/api/files/:fileId` | `http://localhost:8080/api/files/:fileId` | `authenticate` | `getFile` | Get file by ID |

---

### Writer Service Routes
**Base URL**: `http://localhost:8081` (Development) | `https://writer.yourdomain.com` (Production)

#### Upload Routes (`writer-service/src/routes/upload.routes.ts`)

| Method | Endpoint Path | Full URL (Dev) | Middleware | Controller | Description |
|--------|--------------|----------------|------------|------------|-------------|
| POST | `/api/upload/single` | `http://localhost:8081/api/upload/single` | `authenticate`, `uploadSingle('file')` | `uploadSingleFile` | Upload a single file |
| POST | `/api/upload/multiple` | `http://localhost:8081/api/upload/multiple` | `authenticate`, `uploadMultiple('files', 10)` | `uploadMultipleFiles` | Upload multiple files (max 10) |

**Upload Request Examples**:

```javascript
// Single file upload
// POST http://localhost:8081/api/upload/single
// Content-Type: multipart/form-data
Headers: {
  Authorization: "Bearer <token>"
}
Body (form-data): {
  file: <File object>
}

// Multiple file upload
// POST http://localhost:8081/api/upload/multiple
// Content-Type: multipart/form-data
Headers: {
  Authorization: "Bearer <token>"
}
Body (form-data): {
  files: [<File object>, <File object>, ...]  // Max 10 files
}
```

---

## Controllers

### Auth Controllers

#### `signup`
**Location**: `auth-service/src/controllers/auth.controller.ts:12`, `src/controllers/auth.controller.ts:11`

**Functionality**:
1. Validates email and password
2. Checks if user already exists
3. Hashes password with bcrypt
4. Initializes default roles if needed
5. Assigns default "Free" plan and "USER" role
6. Creates user in database
7. Publishes `USER_CREATED` event to Kafka (auth-service only)
8. Generates JWT token
9. Returns token and user info

**Error Codes**:
- `400`: Missing email or password
- `409`: User already exists
- `500`: Default plan/role not found or internal error

---

#### `login`
**Location**: `auth-service/src/controllers/auth.controller.ts:94`, `src/controllers/auth.controller.ts:92`

**Functionality**:
1. Validates email and password
2. Fetches user by email
3. Verifies password with bcrypt
4. Generates JWT token
5. Returns token and user info

**Error Codes**:
- `400`: Missing email or password
- `401`: Invalid credentials
- `500`: Internal error

---

#### `verifyToken`
**Location**: `auth-service/src/controllers/auth.controller.ts:133`

**Functionality**:
1. Extracts token from Authorization header
2. Verifies JWT token
3. Returns decoded user information

**Error Codes**:
- `401`: No token or invalid token
- `500`: Internal error

---

### URL Controllers

#### `redirect`
**Location**: `reader-service/src/controllers/url.controller.ts:4`, `src/controllers/url.controller.ts:6`

**Functionality**:
1. Extracts short code from URL params
2. Looks up original URL from database
3. Redirects to original URL or returns 404

**Error Codes**:
- `404`: URL not found
- `500`: Internal error

---

### File Controllers

#### `getFile`
**Location**: `reader-service/src/controllers/file.controller.ts:4`

**Functionality**:
1. Parses file ID from params
2. Fetches file from database
3. Checks user has access (owner or admin)
4. Returns file metadata

**Error Codes**:
- `403`: Access denied
- `404`: File not found
- `500`: Internal error

---

#### `getUserFiles`
**Location**: `reader-service/src/controllers/file.controller.ts:29`

**Functionality**:
1. Gets authenticated user ID
2. Fetches all files belonging to user
3. Returns file list

**Error Codes**:
- `500`: Internal error

---

#### `listAllFiles`
**Location**: `reader-service/src/controllers/file.controller.ts:41`

**Functionality**:
1. Checks if user is admin
2. Fetches all files from database
3. Returns complete file list

**Error Codes**:
- `403`: Access denied (non-admin)
- `500`: Internal error

---

### Upload Controllers

#### `uploadSingle` / `uploadSingleFile`
**Location**: `writer-service/src/controllers/upload.controller.ts:4`, `src/controllers/upload.controller.ts:7`

**Functionality**:
1. Validates file was uploaded
2. Gets authenticated user ID
3. Calls upload service to process file
4. Returns upload result with URLs

**Error Codes**:
- `400`: No file uploaded
- `500`: Upload failed or internal error

---

#### `uploadMultiple` / `uploadMultipleFiles`
**Location**: `writer-service/src/controllers/upload.controller.ts:20`, `src/controllers/upload.controller.ts:22`

**Functionality**:
1. Validates files were uploaded
2. Gets authenticated user ID
3. Calls upload service to process multiple files
4. Returns upload results with URLs

**Error Codes**:
- `400`: No files uploaded
- `500`: Upload failed or internal error

---

### Role Controllers

#### `createRoleController`
**Location**: `src/controllers/role.controller.ts:21`

**Functionality**:
1. Validates role name
2. Checks user has `canManageRoles` permission
3. Creates new role with permissions
4. Returns created role

**Error Codes**:
- `400`: Missing role name
- `403`: Insufficient permissions
- `500`: Internal error

---

#### `getAllRolesController`
**Location**: `src/controllers/role.controller.ts:58`

**Functionality**:
1. Fetches all roles from database
2. Parses and formats permissions
3. Returns role list

---

#### `getRoleController`
**Location**: `src/controllers/role.controller.ts:80`

**Functionality**:
1. Validates and parses role ID
2. Fetches role from database
3. Returns role with parsed permissions

**Error Codes**:
- `400`: Invalid role ID
- `404`: Role not found

---

#### `updateRoleController`
**Location**: `src/controllers/role.controller.ts:109`

**Functionality**:
1. Validates role ID
2. Checks user has `canManageRoles` permission
3. Updates role with provided fields
4. Returns updated role

**Error Codes**:
- `400`: Invalid role ID
- `403`: Insufficient permissions
- `404`: Role not found

---

#### `deleteRoleController`
**Location**: `src/controllers/role.controller.ts:147`

**Functionality**:
1. Validates role ID
2. Checks user has `canManageRoles` permission
3. Prevents deletion of default system roles
4. Deletes role from database

**Error Codes**:
- `400`: Invalid role ID or cannot delete default roles
- `403`: Insufficient permissions
- `404`: Role not found

---

#### `assignRoleController`
**Location**: `src/controllers/role.controller.ts:187`

**Functionality**:
1. Validates user ID and role ID
2. Checks current user has `canManageRoles` permission
3. Assigns role to target user
4. Returns updated user info

**Error Codes**:
- `400`: Missing user ID or role ID
- `403`: Insufficient permissions

---

#### `assignRoleByNameController`
**Location**: `src/controllers/role.controller.ts:221`

**Functionality**:
1. Validates user ID and role name
2. Checks role name is valid
3. Checks current user has `canManageRoles` permission
4. Assigns role to target user by name
5. Returns updated user info

**Error Codes**:
- `400`: Missing parameters or invalid role name
- `403`: Insufficient permissions

---

#### `getCurrentUserRoleController`
**Location**: `src/controllers/role.controller.ts:261`

**Functionality**:
1. Gets authenticated user ID
2. Fetches user's role information
3. Returns role details and permissions

**Error Codes**:
- `404`: User role not found

---

#### `checkPermissionController`
**Location**: `src/controllers/role.controller.ts:284`

**Functionality**:
1. Gets authenticated user ID
2. Validates permission parameter
3. Checks if user has the specified permission
4. Returns boolean result

**Error Codes**:
- `400`: Missing permission parameter

---

#### `getUsersByRoleController`
**Location**: `src/controllers/role.controller.ts:309`

**Functionality**:
1. Validates role name
2. Checks user has `canViewAllUsers` permission
3. Fetches all users with specified role
4. Returns user list

**Error Codes**:
- `400`: Invalid role name
- `403`: Insufficient permissions

---

#### `initializeRolesController`
**Location**: `src/controllers/role.controller.ts:347`

**Functionality**:
1. Checks if user is admin
2. Initializes default roles (USER, STAFF, ADMIN)
3. Returns success message

**Error Codes**:
- `403`: Only admins can initialize roles

---

### Plan Controllers

#### `createPlanController`
**Location**: `src/controllers/plan.controller.ts:18`

**Functionality**:
1. Validates required fields (name, fileLimit, storageLimit)
2. Parses storage limit (supports string with units like "1GB")
3. Creates new plan
4. Returns created plan

**Error Codes**:
- `400`: Missing required fields
- `500`: Internal error

---

#### `getAllPlansController`
**Location**: `src/controllers/plan.controller.ts:52`

**Functionality**:
1. Fetches all plans from database
2. Formats storage limits for display
3. Returns plan list

---

#### `getPlanController`
**Location**: `src/controllers/plan.controller.ts:74`

**Functionality**:
1. Validates and parses plan ID
2. Fetches plan from database
3. Returns plan with formatted storage limit

**Error Codes**:
- `400`: Invalid plan ID
- `404`: Plan not found

---

#### `updatePlanController`
**Location**: `src/controllers/plan.controller.ts:103`

**Functionality**:
1. Validates plan ID
2. Parses storage limit if provided
3. Updates plan with provided fields
4. Returns updated plan

**Error Codes**:
- `400`: Invalid plan ID
- `404`: Plan not found

---

#### `deletePlanController`
**Location**: `src/controllers/plan.controller.ts:138`

**Functionality**:
1. Validates plan ID
2. Checks plan exists
3. Deletes plan from database

**Error Codes**:
- `400`: Invalid plan ID
- `404`: Plan not found

---

#### `assignPlanController`
**Location**: `src/controllers/plan.controller.ts:165`

**Functionality**:
1. Gets authenticated user ID
2. Validates plan ID
3. Assigns plan to user
4. Updates user's storage limits
5. Returns updated user info

**Error Codes**:
- `400`: Missing plan ID

---

#### `getUserStorageController`
**Location**: `src/controllers/plan.controller.ts:195`

**Functionality**:
1. Gets authenticated user ID
2. Fetches user's storage information
3. Returns formatted storage data (used, left, limit)

**Error Codes**:
- `404`: User storage info not found

---

#### `checkStorageLimitController`
**Location**: `src/controllers/plan.controller.ts:222`

**Functionality**:
1. Gets authenticated user ID
2. Accepts bytes to add
3. Checks if adding bytes would exceed limit
4. Returns boolean result

---

#### `checkFileLimitController`
**Location**: `src/controllers/plan.controller.ts:242`

**Functionality**:
1. Gets authenticated user ID
2. Accepts current file count
3. Checks if within file limit
4. Returns boolean result

---

#### `updateUserStorageController`
**Location**: `src/controllers/plan.controller.ts:263`

**Functionality**:
1. Validates user ID and bytes to add
2. Updates user's storage usage
3. Checks storage limits
4. Returns success message

**Error Codes**:
- `400`: Missing parameters or storage limit exceeded

---

## Services Structure

### Microservices Architecture

The application is divided into separate services:

1. **Auth Service** (`auth-service/`)
   - User registration and login
   - Token verification
   - Role initialization
   - Kafka event publishing

2. **Reader Service** (`reader-service/`)
   - URL redirection
   - File retrieval
   - Read-only operations

3. **Writer Service** (`writer-service/`)
   - File uploads (single and multiple)
   - Write operations

4. **Main Service** (`src/`)
   - Monolithic service containing all functionality
   - Role and permission management
   - Plan and storage management
   - Complete CRUD operations

### Key Features

- **JWT Authentication**: Token-based authentication across all services
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **Storage Management**: Track and limit user storage and file counts
- **Kafka Event System**: Event-driven architecture (in auth-service)
- **File Upload**: Support for single and multiple file uploads
- **URL Shortening**: Short code generation and redirection

---

## Middleware

### Authentication Middleware
- `authenticate`: Verifies JWT token and attaches user to request

### Authorization Middleware
- `requireAdmin`: Ensures user has ADMIN role
- `requireAdminOrStaff`: Ensures user has ADMIN or STAFF role
- `requireManageRolesPermission`: Checks `canManageRoles` permission
- `requireManagePlansPermission`: Checks `canManagePlans` permission
- `canAccessUserData`: Validates user can access specific user data
- `logAdminAction`: Logs admin actions for audit trail

### Upload Middleware
- `uploadSingle(fieldName)`: Handles single file upload
- `uploadMultiple(fieldName, maxCount)`: Handles multiple file uploads

---

## Permission System

### Role Permissions

Roles contain a JSON string of permissions with the following structure:

```typescript
{
  canManageRoles: boolean
  canManagePlans: boolean
  canViewAllUsers: boolean
  canDeleteAnyFile: boolean
  canAccessAnalytics: boolean
  // ... additional custom permissions
}
```

### Default Role Permissions

- **USER**: Basic permissions (view own data, upload files)
- **STAFF**: Elevated permissions (view all users, some management)
- **ADMIN**: Full permissions (all management capabilities)

---

## Storage Management

### Storage Tracking

Each user has:
- `storageUsed`: Current storage used in bytes
- `storageLeft`: Remaining storage in bytes
- Plan's `storageLimit`: Maximum allowed storage

### Storage Checks

Before file upload:
1. Check file count against plan's `fileLimit`
2. Check file size against `storageLeft`
3. Reject upload if limits exceeded
4. Update `storageUsed` and `storageLeft` after successful upload

---

## Event System (Auth Service)

### Kafka Topics

- `USER_CREATED`: Published when new user signs up

### Event Structure

```typescript
{
  userId: number
  email: string
  roleId: number
  planId: number
  timestamp: string (ISO 8601)
}
```

---

## Error Handling

Standard HTTP error codes used throughout:

- `400 Bad Request`: Invalid input or validation errors
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server-side errors

All error responses follow the format:
```json
{
  "message": "Error description"
}
```

---

## Development Notes

- All timestamps use UTC timezone
- Storage sizes are stored in bytes (bigint)
- Passwords are hashed with bcrypt (salt rounds: 10)
- JWT tokens are signed with a secret key
- File uploads use multer middleware
- Database uses Drizzle ORM with PostgreSQL

---

## Quick API Reference

This section provides a complete list of all API endpoints for easy frontend integration.

### Authentication (No Auth Required)

| Endpoint | Method | Service | URL (Dev) |
|----------|--------|---------|-----------|
| User Signup | POST | Auth Service | `http://localhost:8082/api/auth/signup` |
| User Login | POST | Auth Service | `http://localhost:8082/api/auth/login` |
| Verify Token | POST | Auth Service | `http://localhost:8082/api/auth/verify` |
| User Signup | POST | Main Service | `http://localhost:3000/api/auth/signup` |
| User Login | POST | Main Service | `http://localhost:3000/api/auth/login` |
| Get Available Plans | GET | Main Service | `http://localhost:3000/api/plans/available` |
| URL Redirect | GET | Main Service | `http://localhost:3000/:shortCode` |
| URL Redirect | GET | Reader Service | `http://localhost:8080/:shortCode` |

### File Operations (Auth Required)

| Endpoint | Method | Service | URL (Dev) |
|----------|--------|---------|-----------|
| Upload Single File | POST | Main Service | `http://localhost:3000/api/upload/single` |
| Upload Multiple Files | POST | Main Service | `http://localhost:3000/api/upload/multiple` |
| Upload Single File | POST | Writer Service | `http://localhost:8081/api/upload/single` |
| Upload Multiple Files | POST | Writer Service | `http://localhost:8081/api/upload/multiple` |
| Get My Files | GET | Reader Service | `http://localhost:8080/api/files/my-files` |
| Get File by ID | GET | Reader Service | `http://localhost:8080/api/files/:fileId` |
| Get All Files (Admin) | GET | Reader Service | `http://localhost:8080/api/files/all` |

### User & Role Management (Auth Required)

| Endpoint | Method | Service | URL (Dev) |
|----------|--------|---------|-----------|
| Get My Role | GET | Main Service | `http://localhost:3000/api/roles/me` |
| Check Permission | POST | Main Service | `http://localhost:3000/api/roles/check-permission/:permission` |
| Get My Storage Info | GET | Main Service | `http://localhost:3000/api/plans/user/storage` |
| Check Storage Limit | POST | Main Service | `http://localhost:3000/api/plans/user/check-storage` |
| Check File Limit | POST | Main Service | `http://localhost:3000/api/plans/user/check-files` |
| Assign Plan to Self | POST | Main Service | `http://localhost:3000/api/plans/assign` |

### Admin - Role Management (Admin/Staff Auth Required)

| Endpoint | Method | Service | URL (Dev) | Access Level |
|----------|--------|---------|-----------|--------------|
| Create Role | POST | Main Service | `http://localhost:3000/api/roles/admin/create` | Admin |
| Get All Roles | GET | Main Service | `http://localhost:3000/api/roles/admin/all` | Admin/Staff |
| Get Role by ID | GET | Main Service | `http://localhost:3000/api/roles/admin/:roleId` | Admin/Staff |
| Update Role | PUT | Main Service | `http://localhost:3000/api/roles/admin/:roleId` | Admin |
| Delete Role | DELETE | Main Service | `http://localhost:3000/api/roles/admin/:roleId` | Admin |
| Assign Role by ID | POST | Main Service | `http://localhost:3000/api/roles/admin/assign` | Admin |
| Assign Role by Name | POST | Main Service | `http://localhost:3000/api/roles/admin/assign-by-name` | Admin |
| Get Users by Role | GET | Main Service | `http://localhost:3000/api/roles/admin/users/:roleName` | Admin/Staff |
| Initialize Default Roles | POST | Main Service | `http://localhost:3000/api/roles/admin/initialize` | Admin |

### Admin - Plan Management (Admin Auth Required)

| Endpoint | Method | Service | URL (Dev) |
|----------|--------|---------|-----------|
| Create Plan | POST | Main Service | `http://localhost:3000/api/plans/admin/create` |
| Get All Plans | GET | Main Service | `http://localhost:3000/api/plans/admin/all` |
| Get Plan by ID | GET | Main Service | `http://localhost:3000/api/plans/admin/:planId` |
| Update Plan | PUT | Main Service | `http://localhost:3000/api/plans/admin/:planId` |
| Delete Plan | DELETE | Main Service | `http://localhost:3000/api/plans/admin/:planId` |
| Update User Storage | PUT | Main Service | `http://localhost:3000/api/plans/admin/user-storage` |

### Health Check Endpoints

| Endpoint | Method | Service | URL (Dev) |
|----------|--------|---------|-----------|
| Main Service Health | GET | Main Service | `http://localhost:3000/api/health` |
| Auth Service Health | GET | Auth Service | `http://localhost:8082/health` |
| Reader Service Health | GET | Reader Service | `http://localhost:8080/health` |
| Writer Service Health | GET | Writer Service | `http://localhost:8081/health` |

---

## Frontend Integration Guide

### Setting Up Base URLs

In your frontend application, configure the base URLs as environment variables:

```javascript
// .env.development
VITE_MAIN_API_URL=http://localhost:3000
VITE_AUTH_API_URL=http://localhost:8082
VITE_READER_API_URL=http://localhost:8080
VITE_WRITER_API_URL=http://localhost:8081

// .env.production
VITE_MAIN_API_URL=https://api.yourdomain.com
VITE_AUTH_API_URL=https://auth.yourdomain.com
VITE_READER_API_URL=https://reader.yourdomain.com
VITE_WRITER_API_URL=https://writer.yourdomain.com
```

### Authentication Header

For all authenticated endpoints, include the JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Example API Calls

```javascript
// Signup
const signup = async (email, password) => {
  const response = await fetch(`${VITE_AUTH_API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Login
const login = async (email, password) => {
  const response = await fetch(`${VITE_AUTH_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Upload File
const uploadFile = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${VITE_WRITER_API_URL}/api/upload/single`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return response.json();
};

// Get My Files
const getMyFiles = async (token) => {
  const response = await fetch(`${VITE_READER_API_URL}/api/files/my-files`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Get User Storage Info
const getStorageInfo = async (token) => {
  const response = await fetch(`${VITE_MAIN_API_URL}/api/plans/user/storage`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

### Service Selection Guide

**When to use which service:**

- **Auth Service** (`8082`): Use for authentication operations (signup, login, verify token)
- **Main Service** (`3000`): Use for role management, plan management, and general operations
- **Reader Service** (`8080`): Use for file retrieval and URL redirections (read operations)
- **Writer Service** (`8081`): Use for file uploads (write operations)

**Recommended approach:**
- For **Authentication**: Use Auth Service for better separation of concerns
- For **File Uploads**: Use Writer Service for optimized write operations
- For **File Retrieval**: Use Reader Service for optimized read operations
- For **Everything Else**: Use Main Service (roles, plans, etc.)

---
