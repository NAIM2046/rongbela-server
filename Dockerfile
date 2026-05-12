# syntax=docker/dockerfile:1
FROM node:24-alpine

# Pins pnpm to exact version — every teammate gets identical pnpm.
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# Copy package files first for better layer caching.
# If these don't change, Docker skips re-installing on the next build.
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema before install because prisma generate
# may run as a postinstall hook and needs the schema present.
COPY prisma ./prisma

# Install all dependencies including devDependencies (typescript, ts-node-dev, prisma CLI etc.)
# --frozen-lockfile ensures no one silently gets different package versions.
RUN pnpm install --frozen-lockfile

# Generate the Prisma client for linux/alpine platform.
# Your local generated client (Mac/Windows) won't work inside the container.
RUN pnpm prisma generate

# Copy the rest of the source code.
# In dev, the bind mount in docker-compose will override this at runtime —
# so your live file changes are reflected instantly.
# This COPY is here so the image works even without a bind mount.
COPY . .

EXPOSE 5000

# ts-node-dev compiles and runs TypeScript directly, restarting on file changes.
# --poll is already in your script which handles Docker filesystem watching.
CMD ["pnpm", "dev"]