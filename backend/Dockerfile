# Backend Dockerfile for Coolify
FROM node:20-alpine

# Install system dependencies and build tools
RUN apk add --no-cache \
    openssl \
    postgresql-client \
    python3 \
    make \
    g++ \
    wget \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --frozen-lockfile

# Generate Prisma client with dummy DATABASE_URL for build
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
ENV DATABASE_URL=""

# Keep Prisma CLI for migrations in production
# Don't prune dev dependencies - Prisma CLI needed for migrations

# Copy application files
COPY . .

# Copy startup script and make executable
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000 3443

# Health check - longer start period for migrations
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application using startup script
CMD ["/app/startup.sh"]
