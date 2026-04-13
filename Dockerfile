FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG APPVER="0.0"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN echo $APPVER | sed -E 's/^([0-9]+\.[0-9]+)\.?[0-9]*-([0-9]+)/\1\.\2/; s/\-g([0-9a-f]+)/\-pre.\1/; s/^/VITE_APP_VERSION=/' >> ./.env && \
    pnpm build && cp docs/* ./dist

FROM pierrezemb/gostatic
COPY --from=build /app/dist/ /srv/http
CMD ["-port","8080","-https-promote", "-enable-logging"]
