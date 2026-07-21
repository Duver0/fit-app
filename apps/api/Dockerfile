FROM node:20-alpine AS base

# NOTA: Las API keys de Unsplash/Pexels/Pixabay NO se hornean en la imagen.
# Se configuran como variables de entorno en el deployment platform
# (Render dashboard → Environment Variables):
#   UNSPLASH_ACCESS_KEY
#   PEXELS_API_KEY
#   PIXABAY_API_KEY

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN apk add --no-cache openssl && \
    npm ci

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run api:build

EXPOSE 10000

COPY apps/api/start.sh ./
RUN chmod +x start.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-10000}/health || exit 1

CMD ["./start.sh"]
