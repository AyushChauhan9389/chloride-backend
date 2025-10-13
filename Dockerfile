# Use Node.js as the base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (using Bun)
# If you prefer npm instead of Bun, replace this with: RUN npm ci --only=production
RUN npm install -g bun && bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Set environment variables from .env file at build time
# For production, you should set these through Docker environment variables instead
# ENV NODE_ENV=production

# Expose the port your app runs on
EXPOSE 5000

# Start the application (pointing to the correct path in src directory)
CMD ["node", "dist/index.js"]