FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
        && apt-get install -y --no-install-recommends openssl ca-certificates curl \
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

# ── Download Amiri Arabic font for proper receipt PDF rendering ──────────────
# Amiri is an open-source, high-quality Arabic/Latin font (Open Font License).
# It supports Arabic Presentation Forms and renders correctly with PDFKit.
RUN mkdir -p fonts && \
    curl -fsSL -o fonts/Amiri-Regular.ttf \
      "https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf" && \
    curl -fsSL -o fonts/Amiri-Bold.ttf \
      "https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Bold.ttf"

EXPOSE 3001
CMD ["npm", "run", "start"]
