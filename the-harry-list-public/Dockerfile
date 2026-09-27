# Build stage
FROM node:20-alpine AS build

# Update Alpine packages for security patches (including libexpat)
RUN apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (--include=optional ensures platform-specific native binaries
# like rolldown are installed for the container's architecture, not the host's)
RUN npm ci --include=optional

# Copy source files
COPY . .

# Build the application (SENTRY_AUTH_TOKEN enables source map upload to Sentry)
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null) \
    npm run build

# Production stage
FROM nginx:alpine

# Update Alpine packages for security patches (including libexpat)
RUN apk upgrade --no-cache

# Copy custom nginx config, plus this app's CSP template (rendered at startup, see below)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-csp.conf /etc/nginx/csp.conf.template

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create entrypoint script for runtime config injection
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-config.sh && \
    echo 'cat > /usr/share/nginx/html/config.js << EOF' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'window.__RUNTIME_CONFIG__ = {' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  API_URL: "${API_URL:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  RECAPTCHA_SITE_KEY: "${RECAPTCHA_SITE_KEY:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  SENTRY_DSN: "${SENTRY_DSN:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  SENDER_EMAIL: "${SENDER_EMAIL:-}",' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '};' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'EOF' >> /docker-entrypoint.d/40-inject-config.sh && \
    chmod +x /docker-entrypoint.d/40-inject-config.sh

# Render the CSP at container startup: fill in the API origin (scheme://host[:port] of API_URL, or
# nothing when API_URL is relative or empty) and pick the header name. CSP_REPORT_ONLY=true sends
# Content-Security-Policy-Report-Only, which only logs violations in the browser console; use it to
# try a policy change on test before enforcing it.
RUN mkdir -p /etc/nginx/snippets && \
    printf '%s\n' \
      '#!/bin/sh' \
      'case "${API_URL:-}" in http://*|https://*) O=$(printf "%s" "$API_URL" | sed -E "s#^(https?://[^/]+).*#\\1#") ;; *) O="" ;; esac' \
      'H="Content-Security-Policy"; [ "${CSP_REPORT_ONLY:-}" = "true" ] && H="Content-Security-Policy-Report-Only"' \
      'sed -e "s#__API_ORIGIN__#${O}#g" -e "s#__CSP_HEADER__#${H}#g" /etc/nginx/csp.conf.template > /etc/nginx/snippets/csp.conf' \
      > /docker-entrypoint.d/41-render-csp.sh && \
    chmod +x /docker-entrypoint.d/41-render-csp.sh

# Set ownership for non-root nginx user (already exists in nginx:alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx/snippets && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

