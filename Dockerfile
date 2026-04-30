FROM --platform=$BUILDPLATFORM node:24-alpine AS web-build
WORKDIR /app
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY web/index.html web/postcss.config.js web/tailwind.config.js web/tsconfig*.json web/vite.config.ts ./
COPY web/src ./src
RUN npm run build

FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS api-build
ARG TARGETOS=linux
ARG TARGETARCH=amd64
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY api ./api
COPY cmd ./cmd
COPY internal ./internal
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/homelab-dashboard ./cmd/server

FROM alpine:3.22
WORKDIR /app
RUN apk add --no-cache ca-certificates && addgroup -S app && adduser -S app -G app && mkdir -p /data/icons && chown -R app:app /data
COPY --from=api-build /out/homelab-dashboard /app/homelab-dashboard
COPY --from=web-build /app/dist /app/dist
ENV HOMELAB_DB_PATH=/data/homelab.db
ENV HOMELAB_ICON_CACHE_DIR=/data/icons
ENV HOMELAB_STATIC_DIR=/app/dist
ENV PORT=8080
EXPOSE 8080
USER app
CMD ["/app/homelab-dashboard"]
