FROM node:22
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Install dependencies only at build time.
# The full source tree is mounted at runtime via docker-compose volumes,
# with node_modules preserved in a named volume so the bind mount does not
# overwrite the packages installed here.
COPY package*.json ./
RUN npm ci
# Bind to all interfaces so the dev server is reachable from the host.
ENV HOST=0.0.0.0
# Use polling-based file watching — inotify events are unreliable on Docker
# bind mounts (particularly on macOS), so webpack falls back to polling.
ENV WATCHPACK_POLLING=true
EXPOSE 3000
# dev-entrypoint.sh is provided by the mounted source tree at runtime.
CMD ["sh", "docker/dev-entrypoint.sh"]
