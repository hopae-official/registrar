# Build stage
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack install && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# Production stage
FROM node:24-alpine AS production

RUN apk add --no-cache openssl

RUN corepack enable

RUN addgroup --system --gid 1001 eudi && \
    adduser --system --uid 1001 eudi

WORKDIR /app

COPY --chown=eudi:eudi package.json pnpm-lock.yaml ./

RUN corepack install && pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder --chown=eudi:eudi /app/dist ./dist

RUN mkdir -p /app/.certs && chown eudi:eudi /app/.certs

USER eudi

EXPOSE 18000

CMD ["node", "dist/main"]