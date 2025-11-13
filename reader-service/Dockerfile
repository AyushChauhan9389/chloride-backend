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

# Switch to reader-service directory
WORKDIR /app/reader-service

# Copy package files
COPY reader-service/package.json reader-service/tsconfig.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY reader-service/src ./src

# Build the TypeScript application
RUN bun run build

# Expose the port
EXPOSE 8080

# Start the application
CMD ["bun", "start"]

