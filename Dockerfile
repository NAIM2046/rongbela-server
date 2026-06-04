# 1. Change Alpine to Slim (Debian)
FROM node:24-slim

# 2. Install OpenSSL (Required by Prisma on Debian)
RUN apt-get update -y && apt-get install -y openssl

# Pins pnpm to exact version
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# ... (Leave the rest of your Dockerfile exactly as it was)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate
COPY . .
EXPOSE 5000
CMD ["pnpm", "dev"]