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
EXPOSE 8080
# dev-entrypoint.sh is provided by the mounted source tree at runtime.
CMD ["sh", "docker/dev-entrypoint.sh"]
