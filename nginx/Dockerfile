# Use the official Nginx image as the base image
FROM nginx:1.27-alpine

# Install OpenSSL for generating self-signed certificates
# apk - package manager Alpine Linux
RUN apk add --no-cache openssl

# Copy the custom Nginx configuration file to the container
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the entrypoint script to the container
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /docker-entrypoint.sh

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Set the entrypoint to the custom script
ENTRYPOINT ["/docker-entrypoint.sh"]
