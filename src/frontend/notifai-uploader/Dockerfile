# =========================================
# Stage 1: Build the React.js Application
# =========================================
# Taken from : https://docs.docker.com/guides/reactjs/containerize/#overview
ARG NODE_VERSION=22.14.0-alpine
ARG NGINX_VERSION=alpine3.21

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# Install project dependencies using npm ci (ensures a clean, reproducible install)
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npm run build

# =========================================
# Stage 2: Prepare Nginx to Serve Static Files
# =========================================

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runner

# Use a built-in non-root user for security best practices
USER nginx

# DO NOT copy a full nginx.conf.
# Instead, copy your server-specific config to the conf.d directory.
COPY nginx.conf /etc/nginx/conf.d/nginx.conf

# Copy the static build output from the build stage to Nginx's default HTML serving directory
COPY --chown=nginx:nginx --from=builder /app/build /usr/share/nginx/html

# Exposing port 8080
EXPOSE 8080
