# Stage 1 - Build stage
# We use a full Node image to compile TypeScript to JavaScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching - only reinstalls if dependencies change)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source code and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2 - Production stage
# We use a minimal image, only copying the compiled output
FROM node:18-alpine AS production

WORKDIR /app

# Create a non-root user to run the app (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production dependencies and compiled code
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]