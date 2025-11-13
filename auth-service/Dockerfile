# Use Bun as the base image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Copy shared package first
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Install shared dependencies and build
WORKDIR /app/shared
RUN bun install && bun run build

# Switch to auth-service directory
WORKDIR /app/auth-service

# Copy package files
COPY auth-service/package.json auth-service/tsconfig.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY auth-service/src ./src

# Build the TypeScript application
RUN bun run build

# Expose the port
EXPOSE 8082

# Start the application
CMD ["bun", "start"]

