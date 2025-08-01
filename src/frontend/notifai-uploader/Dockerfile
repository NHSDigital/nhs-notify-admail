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

FROM nginx:${NGINX_VERSION} AS runner

COPY nginx.conf /etc/nginx/conf.d/nginx.conf

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

# keeps nginx running
CMD ["nginx", "-g", "daemon off;"]
