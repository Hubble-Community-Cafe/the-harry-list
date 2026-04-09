# Build stage
FROM node:20-alpine AS build

# Update Alpine packages for security patches (including libexpat)
RUN apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Update Alpine packages for security patches (including libexpat)
RUN apk upgrade --no-cache

# Copy custom nginx config and security headers snippet
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create entrypoint script for runtime config injection
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-config.sh && \
    echo 'cat > /usr/share/nginx/html/config.js << EOF' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'window.__RUNTIME_CONFIG__ = {' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  API_URL: "${API_URL:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  AZURE_CLIENT_ID: "${AZURE_CLIENT_ID:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  AZURE_TENANT_ID: "${AZURE_TENANT_ID:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  REDIRECT_URI: "${REDIRECT_URI:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  ALLOWED_GROUP_ID: "${ALLOWED_GROUP_ID:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  SENTRY_DSN: "${SENTRY_DSN:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '};' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'EOF' >> /docker-entrypoint.d/40-inject-config.sh && \
    chmod +x /docker-entrypoint.d/40-inject-config.sh

# Set ownership for non-root nginx user (already exists in nginx:alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

