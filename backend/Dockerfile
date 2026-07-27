# Use the official Node.js image as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Prisma engines require OpenSSL at runtime in Alpine images
RUN apk add --no-cache openssl

# Copy the package.json and package-lock.json files to the container
COPY backend/package*.json ./

# Install the dependencies
RUN npm ci

# Copy the rest of the application code to the container
COPY backend/. .

# Copy the shared types package (sibling of backend/, referenced via relative imports)
COPY shared /shared

# Generate Prisma Client for container runtime (linux-musl)
RUN npx prisma generate

# Build the application
RUN npm run build

# Add startup script that auto-runs migrations before booting the server
COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["/docker-entrypoint.sh"]
