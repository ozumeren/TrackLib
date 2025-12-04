# Backend Dockerfile for Coolify
FROM node:20-alpine

# Install system dependencies and build tools
RUN apk add --no-cache \
    openssl \
    postgresql-client \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (needed for Prisma CLI)
RUN npm install --frozen-lockfile

# Generate Prisma client with dummy DATABASE_URL for build
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
ENV DATABASE_URL=""

# Remove dev dependencies
RUN npm prune --production

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000 3443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with migrations (with retry logic)
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back add_ip_tracking || true && npx prisma migrate deploy && npm start"]
