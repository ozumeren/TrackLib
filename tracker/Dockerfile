# Test Casino Dockerfile
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy test casino HTML files
COPY test.html /usr/share/nginx/html/index.html
COPY tracker.js /usr/share/nginx/html/tracker.js

# Verify files were copied
RUN ls -la /usr/share/nginx/html/ && \
    cat /usr/share/nginx/html/index.html | head -20

# Create nginx config
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log debug;

    # Enable CORS for all files
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Verify nginx config
RUN nginx -t

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
