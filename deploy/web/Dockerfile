FROM node:22-bookworm-slim

ARG APP_PACKAGE
ARG APP_PATH
ARG APP_PORT
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_APP_URL

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/customer-web/package.json apps/customer-web/package.json
COPY apps/kds-web/package.json apps/kds-web/package.json
COPY apps/waiter-web/package.json apps/waiter-web/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY packages ./packages
COPY apps ./apps

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN npm --workspace ${APP_PACKAGE} run build

WORKDIR /app/${APP_PATH}

ENV NODE_ENV=production
ENV PORT=${APP_PORT}

EXPOSE ${APP_PORT}

CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT}"]