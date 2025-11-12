# Use Node.js as the base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy shared package first
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Install shared dependencies and build
WORKDIR /app/shared
RUN npm install && npm run build

# Switch to reader-service directory
WORKDIR /app/reader-service

# Copy package files
COPY reader-service/package.json reader-service/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY reader-service/src ./src

# Build the TypeScript application
RUN npm run build

# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]

