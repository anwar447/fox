# Production Dockerfile for Dell PowerEdge R720 & Linux Servers
# Multi-stage build for optimal image size and security

# Stage 1: Build Vite React App
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build production assets
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine

# Copy custom nginx configuration with SPA routing and compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Healthcheck for high availability on server
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
