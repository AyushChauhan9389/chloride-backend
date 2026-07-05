FROM oven/bun:latest

WORKDIR /app

# Install dependencies first so this layer is cached across source changes
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "run", "start"]
