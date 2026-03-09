FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json

RUN npm ci

COPY packages ./packages
COPY apps/api ./apps/api

RUN npm --workspace @pos1/api run build

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx next start -H 0.0.0.0 -p 3001"]
