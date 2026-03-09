FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install

COPY prisma ./prisma
COPY src     ./src
COPY tsconfig.json ./

# Generate the Prisma client targeting our local schema
RUN npx prisma generate --schema prisma/schema.prisma

# Build TypeScript
RUN npx tsc --outDir dist

ENV NODE_ENV=production
EXPOSE 3200

CMD ["node", "dist/index.js"]
