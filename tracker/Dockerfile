# Test Casino Dockerfile
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy test casino HTML files
COPY test.html /usr/share/nginx/html/index.html
COPY tracker.js /usr/share/nginx/html/tracker.js

# Create nginx config for SPA routing
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 8082;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable CORS for tracker script
    location /tracker.js {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type';
    }
}
EOF

# Expose port
EXPOSE 8082

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
