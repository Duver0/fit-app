FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN apk add --no-cache openssl && \
    npm ci && npm install @types/multer @types/bcryptjs --save-dev

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run api:build

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
