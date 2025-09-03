# Project Overview

This project is a TypeScript-based web server using the Express.js framework. It provides a RESTful API for user management, including authentication, role-based access control (RBAC), and subscription plans. The server also handles file uploads and manages storage based on user plans.

## Key Technologies

*   **Backend:** TypeScript, Node.js, Express.js
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Authentication:** JWT (JSON Web Tokens), bcrypt for password hashing
*   **File Uploads:** Multer

## Architecture

The project follows a standard Model-View-Controller (MVC) architecture, with a clear separation of concerns:

*   **`src/routes`:** Defines the API endpoints and maps them to controller functions.
*   **`src/controllers`:** Handles incoming requests, validates data, and calls the appropriate services.
*   **`src/services`:** Contains the business logic of the application, interacting with the database and other services.
*   **`src/db`:** Manages the database connection and schema using Drizzle ORM.
*   **`src/middleware`:** Provides middleware functions for authentication, authorization, and other cross-cutting concerns.

# Building and Running

## Prerequisites

*   Node.js
*   Bun
*   PostgreSQL

## Installation

1.  Install dependencies:
    ```bash
    bun install
    ```

2.  Set up the database:
    *   Create a PostgreSQL database.
    *   Create a `.env` file in the root of the project and add the following environment variable:
        ```
        DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
        ```

3.  Run database migrations:
    ```bash
    bunx drizzle-kit migrate
    ```

## Running the application

*   **Development mode:**
    ```bash
    bun run dev
    ```
    This will start the server in development mode with hot-reloading.

*   **Production mode:**
    ```bash
    bun run build
    node dist/index.js
    ```

# Development Conventions

## Database Migrations

When making changes to the database schema (in `src/db/schema.ts`), a new migration file needs to be generated. These files are located in the `drizzle` directory.

Instead of editing existing migration scripts, create a new one with a descriptive name, like `002_add_new_feature.sql`, in the `scripts` directory. This file should contain the necessary `ALTER TABLE` and `UPDATE` commands.

## API Endpoints

The API endpoints are organized by feature in the `src/routes` directory. When adding new endpoints, follow the existing structure and conventions.

## Authentication and Authorization

The application uses JWT for authentication. The `authenticate` middleware can be used to protect routes that require a logged-in user.

Role-based access control is implemented using middleware in `src/middleware/admin.middleware.ts`. Use these middlewares to restrict access to certain endpoints based on user roles and permissions.
