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
**Base Path**: `/auth` (in auth-service)

#### Authentication Endpoints

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/signup` | - | `signup` | Create a new user account |
| POST | `/login` | - | `login` | Authenticate user and get token |
| POST | `/verify` | - | `verifyToken` | Verify JWT token validity |

**Request/Response Examples**:

```javascript
// POST /signup
Request: { email: string, password: string }
Response: {
  token: string,
  user: { id, email, role, plan, storageLimit }
}

// POST /login
Request: { email: string, password: string }
Response: {
  token: string,
  user: { id, email, role, plan }
}

// POST /verify
Headers: { Authorization: "Bearer <token>" }
Response: { valid: boolean, user: <decoded_token> }
```

---

### Main Service Routes

#### Auth Routes (`src/routes/auth.routes.ts`)

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/signup` | - | `signup` | Create a new user account |
| POST | `/login` | - | `login` | Authenticate user and get token |

#### URL Routes (`src/routes/url.routes.ts`)

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| GET | `/:shortCode` | - | `urlController.redirect` | Redirect to original URL |

#### Upload Routes (`src/routes/upload.routes.ts`)

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/single` | `authenticate`, `uploadSingle("file")` | `uploadController.uploadSingle` | Upload a single file |
| POST | `/multiple` | `authenticate`, `uploadMultiple("files", 10)` | `uploadController.uploadMultiple` | Upload multiple files (max 10) |

#### Role Routes (`src/routes/role.routes.ts`)

All role routes require authentication.

**Public User Routes**:

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| GET | `/me` | `authenticate` | `getCurrentUserRoleController` | Get current user's role info |
| POST | `/check-permission/:permission` | `authenticate` | `checkPermissionController` | Check if user has a permission |

**Admin Routes**:

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/admin/create` | `authenticate`, `requireAdmin`, `logAdminAction('CREATE_ROLE')` | `createRoleController` | Create a new role |
| GET | `/admin/all` | `authenticate`, `requireAdminOrStaff` | `getAllRolesController` | Get all roles |
| GET | `/admin/:roleId` | `authenticate`, `requireAdminOrStaff` | `getRoleController` | Get role by ID |
| PUT | `/admin/:roleId` | `authenticate`, `requireAdmin`, `logAdminAction('UPDATE_ROLE')` | `updateRoleController` | Update a role |
| DELETE | `/admin/:roleId` | `authenticate`, `requireAdmin`, `logAdminAction('DELETE_ROLE')` | `deleteRoleController` | Delete a role |
| POST | `/admin/assign` | `authenticate`, `requireAdmin`, `logAdminAction('ASSIGN_ROLE')` | `assignRoleController` | Assign role to user by ID |
| POST | `/admin/assign-by-name` | `authenticate`, `requireAdmin`, `logAdminAction('ASSIGN_ROLE_BY_NAME')` | `assignRoleByNameController` | Assign role to user by name |
| GET | `/admin/users/:roleName` | `authenticate`, `requireAdminOrStaff` | `getUsersByRoleController` | Get all users with a role |
| POST | `/admin/initialize` | `authenticate`, `requireAdmin`, `logAdminAction('INITIALIZE_ROLES')` | `initializeRolesController` | Initialize default roles |

#### Plan Routes (`src/routes/plan.routes.ts`)

**Public Routes**:

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| GET | `/available` | - | `getAllPlansController` | Get all available plans (no auth) |

**User Routes**:

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/assign` | `authenticate` | `assignPlanController` | Assign plan to current user |
| GET | `/user/storage` | `authenticate` | `getUserStorageController` | Get user's storage info |
| POST | `/user/check-storage` | `authenticate` | `checkStorageLimitController` | Check if within storage limit |
| POST | `/user/check-files` | `authenticate` | `checkFileLimitController` | Check if within file limit |

**Admin Routes**:

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/admin/create` | `authenticate`, `requireAdmin`, `logAdminAction('CREATE_PLAN')` | `createPlanController` | Create a new plan |
| GET | `/admin/all` | `authenticate`, `requireAdmin` | `getAllPlansController` | Get all plans |
| GET | `/admin/:planId` | `authenticate`, `requireAdmin` | `getPlanController` | Get plan by ID |
| PUT | `/admin/:planId` | `authenticate`, `requireAdmin`, `logAdminAction('UPDATE_PLAN')` | `updatePlanController` | Update a plan |
| DELETE | `/admin/:planId` | `authenticate`, `requireAdmin`, `logAdminAction('DELETE_PLAN')` | `deletePlanController` | Delete a plan |
| PUT | `/admin/user-storage` | `authenticate`, `requireAdmin`, `logAdminAction('UPDATE_USER_STORAGE')` | `updateUserStorageController` | Update user storage |

---

### Reader Service Routes

#### URL Routes (`reader-service/src/routes/url.routes.ts`)

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| GET | `/:shortCode` | - | `redirect` | Redirect to original URL |

#### File Routes (`reader-service/src/routes/file.routes.ts`)

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| GET | `/my-files` | `authenticate` | `getUserFiles` | Get current user's files |
| GET | `/all` | `authenticate` | `listAllFiles` | Get all files (admin only) |
| GET | `/:fileId` | `authenticate` | `getFile` | Get file by ID |

---

### Writer Service Routes

#### Upload Routes (`writer-service/src/routes/upload.routes.ts`)

| Method | Route | Middleware | Controller | Description |
|--------|-------|------------|------------|-------------|
| POST | `/single` | `authenticate`, `uploadSingle('file')` | `uploadSingleFile` | Upload a single file |
| POST | `/multiple` | `authenticate`, `uploadMultiple('files', 10)` | `uploadMultipleFiles` | Upload multiple files (max 10) |

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
